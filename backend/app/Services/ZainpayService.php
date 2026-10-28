<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ZainpayService
{
    protected string $publicKey;

    protected string $baseUrl;

    public function __construct()
    {
        $this->publicKey = trim((string) config('services.zainpay.public_key', ''));
        $this->baseUrl = rtrim((string) config('services.zainpay.base_url', 'https://sandbox.zainpay.ng'), '/');
    }

    public function isConfigured(): bool
    {
        return $this->publicKey !== '';
    }

    /**
     * Fetch the bank list supported by Zainpay payouts.
     *
     * @return array{success: bool, data?: array<int, array{code: string, name: string}>, message?: string, configuration?: bool}
     */
    public function getBanks(): array
    {
        if (! $this->isConfigured()) {
            return $this->configurationError();
        }

        try {
            $response = $this->zainHttp()
                ->timeout(5)
                ->get("{$this->baseUrl}/bank/list");

            $payload = $response->json();

            if (! $response->successful() || ! is_array($payload) || ($payload['code'] ?? '') !== '00') {
                Log::warning('[Zainpay Bank List Failed]', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);

                return [
                    'success' => false,
                    'message' => is_array($payload)
                        ? ($payload['description'] ?? $payload['message'] ?? 'Could not load banks from Zainpay.')
                        : 'Could not load banks from Zainpay.',
                ];
            }

            $banks = $payload['data'] ?? [];
            if (! is_array($banks)) {
                return ['success' => false, 'message' => 'Zainpay returned an invalid bank list.'];
            }

            $normalized = [];
            foreach ($banks as $bank) {
                if (! is_array($bank)) {
                    continue;
                }

                $code = trim((string) ($bank['code'] ?? ''));
                $name = trim((string) ($bank['name'] ?? ''));

                if ($code !== '' && $name !== '') {
                    $normalized[$code] = ['code' => $code, 'name' => $name];
                }
            }

            $normalized = array_values($normalized);
            usort($normalized, fn (array $a, array $b): int => strcasecmp($a['name'], $b['name']));

            return ['success' => true, 'data' => $normalized];
        } catch (\Throwable $e) {
            Log::error("[Zainpay Bank List Error] {$e->getMessage()}");

            return ['success' => false, 'message' => 'Could not reach Zainpay. Try again shortly.'];
        }
    }

    /**
     * Validate a NUBAN account number against Zainpay name enquiry.
     *
     * @return array{success: bool, data?: array{account_name: string, account_number: string, bank_code: string}, message?: string, configuration?: bool}
     */
    public function validateAccount(string $accountNumber, string $bankCode): array
    {
        if (! $this->isConfigured()) {
            return $this->configurationError();
        }

        try {
            $response = $this->zainHttp()
                ->timeout(5)
                ->get("{$this->baseUrl}/bank/name-enquiry", [
                    'bankCode' => $bankCode,
                    'accountNumber' => $accountNumber,
                ]);

            $payload = $response->json();

            if (! $response->successful() || ! is_array($payload) || ($payload['code'] ?? '') !== '00') {
                Log::warning('[Zainpay Name Enquiry Failed]', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);

                return [
                    'success' => false,
                    'message' => is_array($payload)
                        ? ($payload['description'] ?? $payload['message'] ?? 'Could not validate that account.')
                        : 'Could not validate that account.',
                ];
            }

            $data = $payload['data'] ?? [];
            $accountName = trim((string) ($data['account_name'] ?? $data['accountName'] ?? ''));

            if ($accountName === '') {
                return ['success' => false, 'message' => 'Zainpay did not return an account name.'];
            }

            return [
                'success' => true,
                'data' => [
                    'account_name' => $accountName,
                    'account_number' => (string) ($data['account_number'] ?? $data['accountNumber'] ?? $accountNumber),
                    'bank_code' => (string) ($data['bank_code'] ?? $data['bankCode'] ?? $bankCode),
                ],
            ];
        } catch (\Throwable $e) {
            Log::error("[Zainpay Name Enquiry Error] {$e->getMessage()}");

            return ['success' => false, 'message' => 'Could not reach Zainpay. Try again shortly.'];
        }
    }

    /**
     * @return array{success: false, message: string, configuration: true}
     */
    private function configurationError(): array
    {
        return [
            'success' => false,
            'configuration' => true,
            'message' => 'Zainpay is not configured. Add ZAINPAY_PUBLIC_KEY to backend/.env.',
        ];
    }

    private function zainHttp()
    {
        $client = Http::withToken($this->publicKey)
            ->acceptJson()
            ->timeout(12);

        if (! config('services.zainpay.verify_ssl', true)) {
            $client = $client->withOptions(['verify' => false]);
        }

        return $client;
    }
}
