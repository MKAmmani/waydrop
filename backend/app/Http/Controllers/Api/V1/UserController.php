<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class UserController extends Controller
{
    /**
     * Get authenticated user profile with active area
     * GET /api/me
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $areaModel = $user->area;
        $wallet = $user->wallet;
        if (!$wallet) {
            $wallet = $user->wallet()->create([
                'balance_kobo' => 485000,
                'escrow_kobo' => 50000,
                'virtual_bank_name' => 'Wema Bank',
                'virtual_account_nuban' => '9948123011',
            ]);
        }

        return response()->json([
            'id' => (string) $user->id,
            'phone' => $user->phone,
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'photo_url' => $user->photo_url,
            'area_id' => $user->area_id,
            'area' => $areaModel ? [
                'id' => (string) $areaModel->id,
                'name' => $areaModel->name,
                'subtitle' => $areaModel->subtitle,
                'lat' => (float) $areaModel->lat,
                'lng' => (float) $areaModel->lng,
            ] : null,
            'runner_status' => $user->runner_status ?? 'unverified',
            'rating' => ((int) ($user->trips_count ?? 0) > 0 && $user->rating) ? (float) $user->rating : null,
            'trips_count' => (int) ($user->trips_count ?? 0),
            'wallet' => [
                'balance_kobo' => (int) $wallet->balance_kobo,
                'escrow_kobo' => (int) $wallet->escrow_kobo,
                'virtual_bank_name' => $wallet->virtual_bank_name ?? 'Wema Bank',
                'virtual_account_nuban' => $wallet->virtual_account_nuban ?? '9948123011',
            ],
            'referral_code' => 'WAY-' . strtoupper(substr($user->first_name ?? 'VIP', 0, 3)) . '-' . substr($user->id, 0, 4),
        ]);
    }

    /**
     * Update authenticated user's profile details
     * PATCH /api/me
     */
    public function updateMe(Request $request): JsonResponse
    {
        $request->validate([
            'first_name' => ['nullable', 'string', 'min:2', 'max:60'],
            'last_name' => ['nullable', 'string', 'max:60'],
            'area_id' => ['nullable', 'string', 'max:50'],
        ]);

        $user = $request->user();

        if ($request->has('first_name')) {
            $user->first_name = trim($request->first_name);
        }

        if ($request->has('last_name')) {
            $user->last_name = trim($request->last_name);
        }

        if ($request->has('area_id')) {
            $user->area_id = $request->area_id;
        }

        if ($user->first_name) {
            $user->name = trim("{$user->first_name} {$user->last_name}");
        }

        $user->save();

        $areaModel = $user->area_id ? \App\Models\Area::find($user->area_id) : null;

        return response()->json([
            'id' => (string) $user->id,
            'phone' => $user->phone,
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'photo_url' => $user->photo_url,
            'area_id' => $user->area_id,
            'area' => $areaModel ? [
                'id' => (string) $areaModel->id,
                'name' => $areaModel->name,
                'subtitle' => $areaModel->subtitle,
                'lat' => (float) $areaModel->lat,
                'lng' => (float) $areaModel->lng,
            ] : null,
            'runner_status' => $user->runner_status ?? 'unverified',
        ]);
    }

    /**
     * Upload user profile avatar photo
     * POST /api/me/photo
     */
    public function uploadPhoto(Request $request): JsonResponse
    {
        $request->validate([
            'photo' => ['required', 'image', 'max:10240'],
        ]);

        $user = $request->user();
        $file = $request->file('photo');

        // Store file in public avatars disk
        $path = $file->store('avatars', 'public');
        $photoUrl = asset('storage/' . $path);

        $user->photo_url = $photoUrl;
        $user->save();

        return response()->json([
            'photo_url' => $photoUrl,
        ]);
    }

    /**
     * Submit KYC runner verification and activate runner status
     * POST /api/runners/verify
     */
    public function verifyRunner(Request $request): JsonResponse
    {
        $request->validate([
            'matric_number' => ['required', 'string', 'max:50'],
            'faculty' => ['nullable', 'string', 'max:100'],
            'department' => ['nullable', 'string', 'max:100'],
            'document_type' => ['nullable', 'string', 'max:30'],
        ]);

        $user = $request->user();

        // Update or create runner verification record
        \App\Models\RunnerVerification::updateOrCreate(
            ['user_id' => $user->id],
            [
                'campus_id' => $user->area_id ?? 'buk-new',
                'faculty' => $request->faculty ?? 'Computing & Engineering',
                'department' => $request->department ?? 'Software Engineering',
                'matric_number' => $request->matric_number,
                'document_type' => $request->document_type ?? 'student_id_card',
                'document_url' => 'https://storage.waydrop.ng/kyc/docs/' . $user->id . '.jpg',
                'selfie_url' => 'https://storage.waydrop.ng/kyc/selfies/' . $user->id . '.jpg',
                'payout_bank_code' => '035',
                'payout_account_number' => $user->wallet?->virtual_account_nuban ?? '9948123011',
                'payout_account_name' => "{$user->first_name} {$user->last_name}",
                'status' => 'approved',
                'reviewed_at' => now(),
            ]
        );

        $user->runner_status = 'verified';
        $user->role = 'runner';
        $user->save();

        return $this->me($request);
    }

    /**
     * Revert runner status to unverified (for testing)
     * POST /api/runners/unverify
     */
    public function unverifyRunner(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->runner_status = 'unverified';
        $user->role = 'user';
        $user->save();

        return $this->me($request);
    }
}
