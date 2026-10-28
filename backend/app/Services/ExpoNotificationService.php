<?php

namespace App\Services;

use App\Models\Device;
use App\Models\Task;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ExpoNotificationService
{
    protected ?string $accessToken;

    protected string $sendUrl = 'https://exp.host/--/api/v2/push/send';

    protected string $receiptsUrl = 'https://exp.host/--/api/v2/push/getReceipts';

    public function __construct()
    {
        $this->accessToken = config('services.expo.access_token');
        if (str_starts_with((string) $this->accessToken, 'expo_token_mock')) {
            $this->accessToken = null; // Expo's public Push Gateway does not require a token
        }
    }

    /**
     * Determine if a given string is a valid Expo push token format.
     */
    public function isValidExpoPushToken(string $token): bool
    {
        $trimmed = trim($token);
        if (str_starts_with($trimmed, 'ExponentPushToken[') || str_starts_with($trimmed, 'ExpoPushToken[')) {
            return str_ends_with($trimmed, ']');
        }

        // Standard 64-char hex format fallback
        return (bool) preg_match('/^[a-f0-9]{64}$/i', $trimmed);
    }

    /**
     * Send push notification to Expo mobile tokens (single or array).
     * Automatically chunks into batches of 100 according to Expo specifications.
     * Handles ticket responses and automatically prunes unregistered devices.
     */
    public function sendPushNotification(
        array|string $tokens,
        string $title,
        string $body,
        array $data = [],
        string $channelId = 'default',
        ?int $badge = null
    ): array {
        $rawTokens = is_array($tokens) ? $tokens : [$tokens];
        $validTokens = [];

        foreach ($rawTokens as $t) {
            if ($this->isValidExpoPushToken((string) $t)) {
                $validTokens[] = trim($t);
            } else {
                Log::warning("[Expo Push] Invalid token format ignored: {$t}");
            }
        }

        $validTokens = array_values(array_unique($validTokens));

        if (empty($validTokens)) {
            Log::info("[Expo Push] No valid tokens provided for dispatch: '{$title}'");

            return [
                'status' => 'empty_tokens',
                'sent' => 0,
                'failed' => 0,
                'tickets' => [],
            ];
        }

        $allTickets = [];
        $deadTokens = [];
        $chunks = array_chunk($validTokens, 100);

        foreach ($chunks as $chunk) {
            $messages = [];
            foreach ($chunk as $token) {
                $msg = [
                    'to' => $token,
                    'sound' => 'default',
                    'title' => $title,
                    'body' => $body,
                    'data' => $data,
                    'priority' => 'high',
                    'channelId' => $channelId,
                ];

                if ($badge !== null) {
                    $msg['badge'] = $badge;
                }

                $messages[] = $msg;
            }

            try {
                $request = Http::timeout(12)
                    ->acceptJson()
                    ->withHeaders([
                        'Accept-Encoding' => 'gzip, deflate',
                        'Content-Type' => 'application/json',
                    ]);

                if (! empty($this->accessToken)) {
                    $request = $request->withToken($this->accessToken);
                }

                $response = $request->post($this->sendUrl, $messages);

                if ($response->successful()) {
                    $json = $response->json();
                    $ticketBatch = $json['data'] ?? [];

                    foreach ($ticketBatch as $idx => $ticket) {
                        $allTickets[] = $ticket;

                        if (
                            isset($ticket['status']) &&
                            $ticket['status'] === 'error' &&
                            isset($ticket['details']['error']) &&
                            $ticket['details']['error'] === 'DeviceNotRegistered'
                        ) {
                            $deadTokens[] = $chunk[$idx];
                        }
                    }

                    Log::info('[Expo Push] Batch of '.count($chunk)." dispatched successfully. Response status: {$response->status()}");
                } else {
                    Log::error("[Expo Push] HTTP error {$response->status()}: ".$response->body());
                }
            } catch (\Throwable $e) {
                Log::error("[Expo Push Exception] {$e->getMessage()}");
            }
        }

        // Automatically clean up devices that uninstalled or invalidated their tokens
        if (! empty($deadTokens)) {
            $deadTokens = array_unique($deadTokens);
            Device::whereIn('push_token', $deadTokens)->delete();
            Log::info('[Expo Push] Pruned '.count($deadTokens).' dead unregistered device tokens.');
        }

        $sentCount = count(array_filter($allTickets, fn ($t) => ($t['status'] ?? '') === 'ok'));
        $failedCount = count(array_filter($allTickets, fn ($t) => ($t['status'] ?? '') === 'error'));

        return [
            'status' => 'completed',
            'sent' => $sentCount,
            'failed' => $failedCount,
            'tickets' => $allTickets,
            'pruned_tokens' => $deadTokens,
        ];
    }

    /**
     * Retrieve delivery receipts for sent ticket IDs to confirm delivery on device.
     */
    public function getReceipts(array $receiptIds): array
    {
        if (empty($receiptIds)) {
            return [];
        }

        try {
            $request = Http::timeout(10)->acceptJson();
            if (! empty($this->accessToken)) {
                $request = $request->withToken($this->accessToken);
            }

            $response = $request->post($this->receiptsUrl, ['ids' => array_values($receiptIds)]);

            return $response->json()['data'] ?? [];
        } catch (\Throwable $e) {
            Log::error("[Expo Push Receipts Error] {$e->getMessage()}");

            return [];
        }
    }

    /**
     * Send push notification directly to a registered User's devices.
     */
    public function sendToUser(
        User|string|int $user,
        string $title,
        string $body,
        array $data = [],
        string $channelId = 'errands'
    ): array {
        $userModel = $user instanceof User ? $user : User::find($user);
        if (! $userModel) {
            return ['status' => 'user_not_found', 'sent' => 0];
        }

        $tokens = $userModel->devices()->pluck('push_token')->all();

        return $this->sendPushNotification($tokens, $title, $body, $data, $channelId);
    }

    /**
     * Send push notification to multiple user IDs.
     */
    public function sendToUsers(
        array $userIds,
        string $title,
        string $body,
        array $data = [],
        string $channelId = 'errands'
    ): array {
        if (empty($userIds)) {
            return ['sent' => 0];
        }

        $tokens = Device::whereIn('user_id', $userIds)->pluck('push_token')->all();

        return $this->sendPushNotification($tokens, $title, $body, $data, $channelId);
    }

    /**
     * Broadcast high-priority errand dispatch push to verified runners within a campus area.
     */
    public function notifyNearbyRunners(string $areaId, Task $task): array
    {
        $runners = User::where('area_id', $areaId)
            ->where('runner_status', 'verified')
            ->where('is_blocked', false)
            ->where('id', '!=', $task->requester_id)
            ->whereHas('devices')
            ->get();

        if ($runners->isEmpty()) {
            return ['sent' => 0, 'status' => 'no_runners_nearby'];
        }

        $bountyNaira = '₦'.number_format($task->bounty_kobo / 100);
        $title = "🏃 New errand: {$bountyNaira}";
        $body = "{$task->item} from {$task->pickup_name} to {$task->dropoff_name}. Tap to accept.";
        $data = [
            'type' => 'new_errand',
            'task_id' => (string) $task->id,
            'bounty_kobo' => $task->bounty_kobo,
            'pickup' => $task->pickup_name,
            'dropoff' => $task->dropoff_name,
        ];

        return $this->sendToUsers($runners->pluck('id')->all(), $title, $body, $data, 'errands');
    }

    /**
     * Notify the requester that a runner has accepted their errand.
     */
    public function notifyRequesterMatched(Task $task, User $runner): array
    {
        $requester = $task->requester;
        if (! $requester) {
            return ['sent' => 0];
        }

        $runnerName = $runner->first_name ?? 'A runner';
        $title = '🎉 Runner found!';
        $body = "{$runnerName} accepted your errand to move {$task->item}. Heading to {$task->pickup_name} now.";
        $data = [
            'type' => 'task_matched',
            'task_id' => (string) $task->id,
            'runner_id' => (string) $runner->id,
            'runner_name' => $runnerName,
        ];

        return $this->sendToUser($requester, $title, $body, $data, 'errands');
    }

    /**
     * Notify runner that delivery was verified with PIN and payout released.
     */
    public function notifyRunnerCompleted(Task $task, int $payoutKobo): array
    {
        $runner = $task->runner;
        if (! $runner) {
            return ['sent' => 0];
        }

        $payoutNaira = '₦'.number_format($payoutKobo / 100);
        $title = "💰 Payout landed: {$payoutNaira}";
        $body = "Handshake PIN verified for {$task->item}. Funds are now in your wallet.";
        $data = [
            'type' => 'payout_credited',
            'task_id' => (string) $task->id,
            'payout_kobo' => $payoutKobo,
        ];

        return $this->sendToUser($runner, $title, $body, $data, 'payments');
    }

    /**
     * Notify user that their errand was cancelled and refund returned to wallet.
     */
    public function notifyTaskCancelled(Task $task): array
    {
        $requester = $task->requester;
        if (! $requester) {
            return ['sent' => 0];
        }

        $bountyNaira = '₦'.number_format($task->bounty_kobo / 100);
        $title = 'Errand cancelled';
        $body = "Your errand for {$task->item} was cancelled. {$bountyNaira} is safely back in your wallet.";
        $data = [
            'type' => 'task_cancelled',
            'task_id' => (string) $task->id,
        ];

        return $this->sendToUser($requester, $title, $body, $data, 'errands');
    }
}
