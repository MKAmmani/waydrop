<?php

namespace App\Jobs;

use App\Models\CallSession;
use App\Services\AblyService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class ExpireCallSession implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public string $callSessionId,
    ) {}

    /**
     * End a call that was never answered by the receiver.
     */
    public function handle(AblyService $ably): void
    {
        $session = CallSession::with('task')->find($this->callSessionId);

        if (! $session || $session->status !== 'connecting') {
            return;
        }

        $session->forceFill([
            'status' => 'missed',
            'ended_at' => now(),
        ])->save();

        if (! $session->task) {
            return;
        }

        $payload = [
            'call_session_id' => $session->id,
            'task_id' => $session->task_id,
            'reason' => 'unanswered',
        ];

        try {
            if (! $ably->isConfigured()) {
                return;
            }

            $ably->publish("task:{$session->task_id}", 'call.ended', $payload);

            $participants = array_unique(array_filter([
                $session->task->requester_id,
                $session->task->runner_id,
            ]));

            foreach ($participants as $participantId) {
                $ably->publish("user:{$participantId}", 'call.ended', $payload);
            }
        } catch (\Throwable $exception) {
            report($exception);
        }
    }
}
