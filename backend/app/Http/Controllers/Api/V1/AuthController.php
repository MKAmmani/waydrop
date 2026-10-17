<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\OtpRequest;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class AuthController extends Controller
{
    /**
     * Normalize Nigerian phone number to standard E.164 (+2348012345678)
     */
    protected function normalizePhone(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone);

        if (str_starts_with($digits, '234') && strlen($digits) === 13) {
            return '+' . $digits;
        }

        if (str_starts_with($digits, '0') && strlen($digits) === 11) {
            return '+234' . substr($digits, 1);
        }

        if (strlen($digits) === 10) {
            return '+234' . $digits;
        }

        return '+' . $digits;
    }

    /**
     * Request a 6-digit SMS OTP code
     * POST /api/auth/otp/request
     */
    public function requestOtp(Request $request): JsonResponse
    {
        $request->validate([
            'phone' => ['required', 'string'],
        ]);

        $phone = $this->normalizePhone($request->phone);

        // Rate limit: Max 5 attempts per 10 minutes
        $recentCount = OtpRequest::where('phone', $phone)
            ->where('created_at', '>=', now()->subMinutes(10))
            ->count();

        if ($recentCount >= 5 || str_ends_with($phone, '8030000000')) {
            return response()->json([
                'error' => [
                    'code' => 'TOO_MANY_REQUESTS',
                    'message' => 'Too many codes sent to this number. Try again in 10 minutes.',
                ],
            ], 429);
        }

        // Generate 6-digit OTP code
        $code = (string) random_int(100000, 999999);

        // Record OTP in database
        OtpRequest::create([
            'phone' => $phone,
            'ip_address' => $request->ip() ?? '127.0.0.1',
            'code_hash' => Hash::make($code),
            'attempts' => 0,
            'is_used' => false,
            'expires_at' => now()->addMinutes(5),
        ]);

        // Log OTP in storage/logs/laravel.log for testing/debugging
        Log::info("[Waydrop SMS OTP] Phone: {$phone} | Code: {$code}");

        // Dispatch OTP SMS via Termii
        try {
            app(\App\Services\TermiiService::class)->sendOtp($phone, $code);
        } catch (\Throwable $e) {
            Log::warning("[Termii Dispatch Warning] " . $e->getMessage());
        }

        return response()->json([
            'expires_in' => 300,
            'resend_after' => 30,
            'debug_code' => config('app.debug') ? $code : null,
        ]);
    }

    /**
     * Verify 6-digit SMS OTP code and issue JWT/Sanctum tokens
     * POST /api/auth/otp/verify
     */
    public function verifyOtp(Request $request): JsonResponse
    {
        $request->validate([
            'phone' => ['required', 'string'],
            'code' => ['required', 'string', 'size:6'],
        ]);

        $phone = $this->normalizePhone($request->phone);
        $code = trim($request->code);

        // Demo rules per API specification
        if ($code === '000000') {
            return response()->json([
                'error' => [
                    'code' => 'INVALID_CODE',
                    'message' => "That code isn't right. Check your texts and try again.",
                ],
            ], 422);
        }

        if ($code === '999999') {
            return response()->json([
                'error' => [
                    'code' => 'CODE_EXPIRED',
                    'message' => "That code has expired. We've sent you a new one.",
                ],
            ], 410);
        }

        // Find latest unused OTP for this phone
        $otp = OtpRequest::where('phone', $phone)
            ->where('is_used', false)
            ->latest()
            ->first();

        $codeMatches = false;

        if ($otp) {
            if (now()->isAfter($otp->expires_at)) {
                return response()->json([
                    'error' => [
                        'code' => 'CODE_EXPIRED',
                        'message' => "That code has expired. We've sent you a new one.",
                    ],
                ], 410);
            }

            if ($otp->attempts >= 5) {
                return response()->json([
                    'error' => [
                        'code' => 'TOO_MANY_ATTEMPTS',
                        'message' => 'Too many wrong attempts. Request a new code.',
                    ],
                ], 429);
            }

            if (Hash::check($code, $otp->code_hash) || (config('app.debug') && $code === '123456')) {
                $codeMatches = true;
                $otp->update(['is_used' => true]);
            } else {
                $otp->increment('attempts');
            }
        } elseif (config('app.debug') && $code === '123456') {
            // Development fallback
            $codeMatches = true;
        }

        if (!$codeMatches) {
            return response()->json([
                'error' => [
                    'code' => 'INVALID_CODE',
                    'message' => "That code isn't right. Check your texts and try again.",
                ],
            ], 422);
        }

        // Find or create User
        $user = User::where('phone', $phone)->first();
        $isNewUser = false;

        if (!$user) {
            $isNewUser = true;
            $user = User::create([
                'phone' => $phone,
                'role' => 'user',
                'runner_status' => 'unverified',
                'phone_verified_at' => now(),
            ]);

            // Create initial wallet
            Wallet::firstOrCreate(
                ['user_id' => $user->id],
                [
                    'balance_kobo' => 0,
                    'escrow_kobo' => 0,
                    'virtual_bank_name' => 'Squad GTCO Escrow',
                    'virtual_account_nuban' => '801' . random_int(1000000, 9999999),
                ]
            );
        } else {
            // Update phone verified timestamp if needed
            if (!$user->phone_verified_at) {
                $user->update(['phone_verified_at' => now()]);
            }
        }

        // Issue Sanctum Personal Access Tokens
        $accessToken = $user->createToken('mobile_access')->plainTextToken;
        $refreshToken = $user->createToken('mobile_refresh')->plainTextToken;

        return response()->json([
            'access_token' => $accessToken,
            'refresh_token' => $refreshToken,
            'is_new_user' => $isNewUser,
            'me' => [
                'id' => (string) $user->id,
                'phone' => $user->phone,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'photo_url' => $user->photo_url,
                'area_id' => $user->area_id,
                'runner_status' => $user->runner_status ?? 'unverified',
            ],
        ]);
    }

    /**
     * Social OAuth sign in (Google & Apple)
     * POST /api/auth/oauth
     */
    public function oauth(Request $request): JsonResponse
    {
        $request->validate([
            'provider' => ['required', 'string', 'in:google,apple'],
            'id_token' => ['required', 'string'],
        ]);

        $provider = $request->provider;
        $idToken = $request->id_token;

        // Extract claims or fallback for token
        $email = null;
        $firstName = 'Student';
        $lastName = 'User';
        $providerId = 'oauth_' . substr(md5($idToken), 0, 16);

        // If JWT contains payload, extract basic info
        $parts = explode('.', $idToken);
        if (count($parts) >= 2) {
            $payload = json_decode(base64_decode(strtr($parts[1], '-_', '+/')), true);
            if (is_array($payload)) {
                $email = $payload['email'] ?? null;
                $firstName = $payload['given_name'] ?? $payload['name'] ?? $firstName;
                $lastName = $payload['family_name'] ?? $lastName;
                $providerId = $payload['sub'] ?? $providerId;
            }
        }

        // Find or create user
        $user = null;
        if ($email) {
            $user = User::where('email', $email)->first();
        }

        if (!$user) {
            $col = $provider === 'google' ? 'google_id' : 'apple_id';
            $user = User::where($col, $providerId)->first();
        }

        if (!$user) {
            $user = User::create([
                'email' => $email,
                'first_name' => $firstName,
                'last_name' => $lastName,
                'name' => trim("{$firstName} {$lastName}"),
                'role' => 'user',
                'runner_status' => 'unverified',
                'google_id' => $provider === 'google' ? $providerId : null,
                'apple_id' => $provider === 'apple' ? $providerId : null,
                'email_verified_at' => $email ? now() : null,
            ]);

            Wallet::firstOrCreate(
                ['user_id' => $user->id],
                [
                    'balance_kobo' => 0,
                    'escrow_kobo' => 0,
                    'virtual_bank_name' => 'Squad GTCO Escrow',
                    'virtual_account_nuban' => '801' . random_int(1000000, 9999999),
                ]
            );
        }

        $accessToken = $user->createToken('mobile_access')->plainTextToken;
        $refreshToken = $user->createToken('mobile_refresh')->plainTextToken;

        return response()->json([
            'access_token' => $accessToken,
            'refresh_token' => $refreshToken,
            'needs_phone' => empty($user->phone),
            'me' => [
                'id' => (string) $user->id,
                'phone' => $user->phone,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'photo_url' => $user->photo_url,
                'area_id' => $user->area_id,
                'runner_status' => $user->runner_status ?? 'unverified',
            ],
        ]);
    }
}
