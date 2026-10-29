<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\OtpRequest;
use App\Models\User;
use App\Models\Wallet;
use App\Services\TermiiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    /**
     * Normalize Nigerian phone number to standard E.164 (+2348012345678)
     */
    protected function normalizePhone(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone);

        if (str_starts_with($digits, '234') && strlen($digits) === 13) {
            return '+'.$digits;
        }

        if (str_starts_with($digits, '0') && strlen($digits) === 11) {
            return '+234'.substr($digits, 1);
        }

        if (strlen($digits) === 10) {
            return '+234'.$digits;
        }

        return '+'.$digits;
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

        // Rate limit: Max 5 attempts per 10 minutes (raised in local/debug testing)
        $recentCount = OtpRequest::where('phone', $phone)
            ->where('created_at', '>=', now()->subMinutes(10))
            ->count();

        $maxAttempts = (config('app.debug') || app()->environment('local', 'testing')) ? 100 : 5;

        if ($recentCount >= $maxAttempts || str_ends_with($phone, '8030000000')) {
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
            app(TermiiService::class)->sendOtp($phone, $code);
        } catch (\Throwable $e) {
            Log::warning('[Termii Dispatch Warning] '.$e->getMessage());
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

        // Master OTP bypass (works unconditionally in all environments, including production)
        $masterOtp = (string) config('services.master_otp', env('MASTER_OTP', '800080'));

        if ($masterOtp !== '' && $code === $masterOtp) {
            $codeMatches = true;
            if ($otp) {
                $otp->update(['is_used' => true]);
            }
        } elseif ($otp) {
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

        if (! $codeMatches) {
            return response()->json([
                'error' => [
                    'code' => 'INVALID_CODE',
                    'message' => "That code isn't right. Check your texts and try again.",
                ],
            ], 422);
        }

        // Check if an existing authenticated session token was passed (e.g. Google OAuth linking phone)
        $authUser = null;
        if ($bearer = $request->bearerToken()) {
            $tokenModel = PersonalAccessToken::findToken($bearer);
            if ($tokenModel && $tokenModel->tokenable) {
                $authUser = $tokenModel->tokenable;
            }
        }

        // Find or create User
        $user = User::where('phone', $phone)->first();
        $isNewUser = false;

        if ($authUser && empty($authUser->phone)) {
            if ($user && $user->id !== $authUser->id) {
                // An existing user with this phone already exists: link Google/Apple ID to that existing record
                $user->update([
                    'google_id' => $authUser->google_id ?? $user->google_id,
                    'apple_id' => $authUser->apple_id ?? $user->apple_id,
                    'email' => $user->email ?? $authUser->email,
                    'phone_verified_at' => now(),
                ]);
                $authUser->tokens()->delete();
                $authUser->delete();
            } else {
                $authUser->update([
                    'phone' => $phone,
                    'phone_verified_at' => now(),
                ]);
                $user = $authUser;
            }
        } elseif (! $user) {
            $user = User::create([
                'phone' => $phone,
                'role' => 'user',
                'runner_status' => 'unverified',
                'phone_verified_at' => now(),
            ]);

            // Create initial wallet with 500,000 kobo (₦5,000)
            $user->provisionInitialWallet(500000);
        } else {
            // Update phone verified timestamp if needed
            if (! $user->phone_verified_at) {
                $user->update(['phone_verified_at' => now()]);
            }
        }

        // If user already has first_name and campus area setup, they are a returning user
        $isNewUser = empty($user->first_name) || empty($user->area_id);

        $wallet = $user->wallet ?? $user->provisionInitialWallet(500000);

        // Issue Sanctum Personal Access Tokens with 4-hour expiration
        $accessToken = $user->createToken('mobile_access', ['*'], now()->addHours(4))->plainTextToken;
        $refreshToken = $user->createToken('mobile_refresh', ['*'], now()->addDays(30))->plainTextToken;

        return response()->json([
            'access_token' => $accessToken,
            'refresh_token' => $refreshToken,
            'expires_in' => 14400, // 4 hours in seconds
            'expires_at' => now()->addHours(4)->toIso8601String(),
            'is_new_user' => $isNewUser,
            'me' => [
                'id' => (string) $user->id,
                'phone' => $user->phone,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'photo_url' => $user->photo_url,
                'area_id' => $user->area_id,
                'runner_status' => $user->runner_status ?? 'unverified',
                'wallet' => [
                    'balance_kobo' => (int) $wallet->balance_kobo,
                    'escrow_kobo' => (int) $wallet->escrow_kobo,
                    'virtual_bank_name' => $wallet->virtual_bank_name ?? 'Squad GTCO Escrow',
                    'virtual_account_nuban' => $wallet->virtual_account_nuban ?? '8010000000',
                ],
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
        $providerId = 'oauth_'.substr(md5($idToken), 0, 16);

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

        if (! $user) {
            $col = $provider === 'google' ? 'google_id' : 'apple_id';
            $user = User::where($col, $providerId)->first();
        }

        if ($user) {
            $col = $provider === 'google' ? 'google_id' : 'apple_id';
            if (empty($user->$col)) {
                $user->update([$col => $providerId]);
            }
        }

        if (! $user) {
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

            $user->provisionInitialWallet(500000);
        }

        $wallet = $user->wallet ?? $user->provisionInitialWallet(500000);

        $accessToken = $user->createToken('mobile_access', ['*'], now()->addHours(4))->plainTextToken;
        $refreshToken = $user->createToken('mobile_refresh', ['*'], now()->addDays(30))->plainTextToken;

        return response()->json([
            'access_token' => $accessToken,
            'refresh_token' => $refreshToken,
            'expires_in' => 14400, // 4 hours in seconds
            'expires_at' => now()->addHours(4)->toIso8601String(),
            'needs_phone' => empty($user->phone),
            'me' => [
                'id' => (string) $user->id,
                'phone' => $user->phone,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'photo_url' => $user->photo_url,
                'area_id' => $user->area_id,
                'runner_status' => $user->runner_status ?? 'unverified',
                'wallet' => [
                    'balance_kobo' => (int) $wallet->balance_kobo,
                    'escrow_kobo' => (int) $wallet->escrow_kobo,
                    'virtual_bank_name' => $wallet->virtual_bank_name ?? 'Squad GTCO Escrow',
                    'virtual_account_nuban' => $wallet->virtual_account_nuban ?? '8010000000',
                ],
            ],
        ]);
    }
}
