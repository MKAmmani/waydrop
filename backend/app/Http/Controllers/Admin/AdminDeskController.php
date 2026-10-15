<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Area;
use App\Models\AuditLog;
use App\Models\CrewShift;
use App\Models\Dispute;
use App\Models\Payout;
use App\Models\Place;
use App\Models\PlatformRule;
use App\Models\RunnerVerification;
use App\Models\Task;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Wallet;
use App\Services\SquadService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AdminDeskController extends Controller
{
    /**
     * Get active campus filter for current user.
     */
    protected function getActiveCampusId(): ?string
    {
        $user = auth()->user();
        if ($user && $user->isSuperAdmin()) {
            return session('active_campus_id'); // null means all campuses (HQ view)
        }

        return $user?->area_id;
    }

    /**
     * Today & Campus Pulse (Desk 01)
     */
    public function today()
    {
        $areas = Area::all();
        $openErrandsCount = Task::whereIn('status', ['pending', 'accepted', 'picked_up'])->count();
        $disputesCount = Dispute::where('status', 'open')->count();
        $pendingKycCount = RunnerVerification::whereIn('status', ['pending', 'ai_verified'])->count();
        $totalEscrowKobo = Wallet::sum('escrow_kobo');

        return view('desk.today', compact(
            'areas',
            'openErrandsCount',
            'disputesCount',
            'pendingKycCount',
            'totalEscrowKobo'
        ));
    }

    /**
     * Needs You Queue (Desk 02)
     */
    public function queue()
    {
        $disputes = Dispute::with(['task', 'requester', 'runner'])->where('status', 'open')->get();
        $kycList = RunnerVerification::with('user')->whereIn('status', ['pending', 'ai_verified', 'flagged'])->get();
        $lockedTasks = Task::where('status', 'disputed')->orWhere('pin_attempts', '>=', 3)->get();
        $failedPayouts = Payout::with('user')->where('status', 'failed')->get();

        return view('desk.queue', compact('disputes', 'kycList', 'lockedTasks', 'failedPayouts'));
    }

    /**
     * Dispute Resolution Desk (Desk 03)
     */
    public function disputes()
    {
        $disputes = Dispute::with(['task', 'requester', 'runner'])->latest()->get();
        return view('desk.disputes', compact('disputes'));
    }

    /**
     * ID Checks / KYC Review Desk (Desk 04)
     */
    public function kyc()
    {
        $verifications = RunnerVerification::with(['user', 'campus'])->latest()->get();
        return view('desk.kyc', compact('verifications'));
    }

    /**
     * Locked Handovers Desk (Desk 05)
     */
    public function lockedHandovers()
    {
        $lockedTasks = Task::with(['requester', 'runner', 'area'])
            ->where('status', 'disputed')
            ->orWhere('pin_attempts', '>=', 3)
            ->latest()
            ->get();

        return view('desk.locked_handovers', compact('lockedTasks'));
    }

    /**
     * People & Safety Desk (Desk 06)
     */
    public function people()
    {
        $users = User::with(['wallet', 'area', 'runnerVerification'])->latest()->get();
        return view('desk.people', compact('users'));
    }

    /**
     * Failed Payouts & Banking Desk (Desk 07)
     */
    public function payouts()
    {
        $payouts = Payout::with(['user'])->latest()->get();
        return view('desk.payouts', compact('payouts'));
    }

    /**
     * Campus Places & Landmarks Desk (Desk 08)
     */
    public function places()
    {
        $places = Place::with(['area', 'suggestedBy'])->latest()->get();
        $areas = Area::all();
        return view('desk.places', compact('places', 'areas'));
    }

    /**
     * Crew & Routines Desk (Desk 09)
     */
    public function crew()
    {
        $shifts = CrewShift::with(['area', 'lead', 'members'])->latest()->get();
        return view('desk.crew', compact('shifts'));
    }

    /**
     * Rules Engine Desk (Desk 10)
     */
    public function rules()
    {
        $rules = PlatformRule::all();
        return view('desk.rules', compact('rules'));
    }

    /**
     * Immutable Audit Trail Desk (Desk 11)
     */
    public function audit()
    {
        $logs = AuditLog::with('admin')->latest('created_at')->limit(100)->get();
        return view('desk.audit', compact('logs'));
    }

    // ==========================================
    // OPERATIONAL DESK ACTION HANDLERS
    // ==========================================

    /**
     * 1-Click KYC Approval or Rejection
     */
    public function reviewKyc(Request $request, string $id)
    {
        $request->validate([
            'decision' => 'required|in:approve,reject',
            'rejection_reason' => 'nullable|string|max:500',
        ]);

        $verification = RunnerVerification::findOrFail($id);
        $user = $verification->user;

        if ($request->input('decision') === 'approve') {
            $verification->update([
                'status' => 'approved',
                'reviewed_by' => auth()->id(),
                'reviewed_at' => now(),
            ]);

            $user->update(['runner_status' => 'verified']);

            AuditLog::record(
                action: 'kyc.approve',
                targetType: 'RunnerVerification',
                targetId: $verification->id,
                reason: 'Student ID and biometric facial match successfully verified'
            );
        } else {
            $verification->update([
                'status' => 'rejected',
                'rejection_reason' => $request->input('rejection_reason', 'Verification declined by campus lead'),
                'reviewed_by' => auth()->id(),
                'reviewed_at' => now(),
            ]);

            $user->update(['runner_status' => 'rejected']);

            AuditLog::record(
                action: 'kyc.reject',
                targetType: 'RunnerVerification',
                targetId: $verification->id,
                reason: $request->input('rejection_reason', 'KYC criteria not met')
            );
        }

        return back()->with('success', 'KYC review saved successfully.');
    }

    /**
     * Settle Disputed Errand Escrow
     */
    public function resolveDispute(Request $request, string $id)
    {
        $request->validate([
            'resolution_type' => 'required|in:refund_requester,release_runner,refund_cover,partial_split',
            'reason' => 'required|string|min:5',
            'refund_kobo' => 'nullable|integer',
            'payout_kobo' => 'nullable|integer',
        ]);

        $dispute = Dispute::with('task')->findOrFail($id);
        $task = $dispute->task;

        DB::transaction(function () use ($dispute, $task, $request) {
            $resolution = $request->input('resolution_type');

            $dispute->update([
                'status' => 'resolved',
                'resolution_type' => $resolution,
                'resolved_by' => auth()->id(),
                'resolved_at' => now(),
                'admin_notes' => $request->input('reason'),
            ]);

            $task->update(['status' => 'completed']);

            // Escrow handling logic...
            $requesterWallet = $task->requester->wallet;
            $runnerWallet = $task->runner?->wallet;

            if ($resolution === 'refund_requester' && $requesterWallet) {
                $requesterWallet->decrement('escrow_kobo', $task->bounty_kobo);
                $requesterWallet->increment('balance_kobo', $task->bounty_kobo);
            } elseif ($resolution === 'release_runner' && $requesterWallet && $runnerWallet) {
                $requesterWallet->decrement('escrow_kobo', $task->bounty_kobo);
                $payoutKobo = $task->runner_payout_kobo;
                $runnerWallet->increment('balance_kobo', $payoutKobo);
            }

            AuditLog::record(
                action: 'dispute.resolve',
                targetType: 'Dispute',
                targetId: $dispute->id,
                reason: $request->input('reason')
            );
        });

        return back()->with('success', 'Dispute resolved and ledger settled.');
    }

    /**
     * Unlock or Override Handshake Delivery PIN
     */
    public function unlockPin(Request $request, string $id)
    {
        $request->validate([
            'action' => 'required|in:reset_attempts,force_complete,cancel_refund',
            'reason' => 'required|string|min:5',
        ]);

        $task = Task::findOrFail($id);

        if ($request->input('action') === 'reset_attempts') {
            $task->update(['pin_attempts' => 0, 'status' => 'picked_up']);
        } elseif ($request->input('action') === 'force_complete') {
            $task->update(['status' => 'completed', 'completed_at' => now()]);
        }

        AuditLog::record(
            action: 'task.pin_override',
            targetType: 'Task',
            targetId: $task->id,
            reason: $request->input('reason')
        );

        return back()->with('success', 'Handover updated successfully.');
    }

    /**
     * Retry Failed Bank Transfer
     */
    public function retryPayout(Request $request, string $id, SquadService $squad)
    {
        $payout = Payout::findOrFail($id);
        
        $payout->increment('retry_count');
        $payout->update(['last_attempt_at' => now(), 'status' => 'processing']);

        $res = $squad->initiateTransfer(
            bankCode: $payout->bank_code,
            accountNumber: $payout->account_number,
            amountKobo: $payout->amount_kobo,
            reference: 'RETRY_' . $payout->id . '_' . time()
        );

        if (($res['success'] ?? false) === true) {
            $payout->update([
                'status' => 'success',
                'gateway_reference' => $res['gateway_reference'] ?? null,
            ]);
        }

        AuditLog::record(
            action: 'payout.retry',
            targetType: 'Payout',
            targetId: $payout->id,
            reason: 'Manual payout retry triggered from Desk'
        );

        return back()->with('success', 'Payout retry dispatched.');
    }

    /**
     * Confirm Campus Landmark and Award Student Bounty
     */
    public function approvePlace(Request $request, string $id)
    {
        $place = Place::findOrFail($id);
        $place->update(['confirmed' => true]);

        // If place was suggested by a student and bounty not yet paid, credit student wallet
        if ($place->suggested_by_user_id && !$place->bounty_paid) {
            $bountyKobo = (int) PlatformRule::get('landmark_bounty_kobo', 5000); // ₦50 default
            $user = User::find($place->suggested_by_user_id);
            if ($user && $user->wallet) {
                $user->wallet->increment('balance_kobo', $bountyKobo);
                $place->update(['bounty_paid' => true]);

                Transaction::create([
                    'wallet_id' => $user->wallet->id,
                    'type' => 'landmark_bounty',
                    'amount_kobo' => $bountyKobo,
                    'balance_before_kobo' => $user->wallet->balance_kobo - $bountyKobo,
                    'balance_after_kobo' => $user->wallet->balance_kobo,
                    'reference' => 'LMB_' . $place->id . '_' . time(),
                    'status' => 'success',
                    'metadata' => ['place_id' => $place->id, 'place_name' => $place->name],
                ]);
            }
        }

        AuditLog::record(
            action: 'place.confirm',
            targetType: 'Place',
            targetId: $place->id,
            reason: 'Landmark name and campus location verified'
        );

        return back()->with('success', 'Place approved and student bounty rewarded.');
    }

    /**
     * Campus Network & Staff Management (Super Admin Exclusive Desk)
     */
    public function campuses()
    {
        $user = auth()->user();
        if (!$user->isSuperAdmin()) {
            abort(403, 'Unauthorized: Only Super Administrators can manage campus creation and admin provisioning.');
        }

        $campuses = Area::withCount(['places', 'tasks', 'users'])->get();
        $admins = User::whereIn('role', ['admin', 'super_admin'])->with('area')->latest()->get();

        return view('desk.campuses', compact('campuses', 'admins'));
    }

    /**
     * Create a new Campus / University Area (Super Admin)
     */
    public function createCampus(Request $request)
    {
        if (!auth()->user()->isSuperAdmin()) {
            abort(403);
        }

        $validated = $request->validate([
            'id' => 'required|string|max:50|unique:areas,id',
            'name' => 'required|string|max:100',
            'subtitle' => 'required|string|max:150',
            'lat' => 'required|numeric',
            'lng' => 'required|numeric',
            'radius_meters' => 'required|integer|min:500',
        ]);

        $area = Area::create($validated);

        AuditLog::record(
            action: 'campus.create',
            targetType: 'Area',
            targetId: $area->id,
            reason: 'Super Admin provisioned new university campus: ' . $area->name
        );

        return back()->with('success', "Campus '{$area->name}' created successfully.");
    }

    /**
     * Provision a new Campus Lead Administrator (Super Admin)
     */
    public function createCampusAdmin(Request $request)
    {
        if (!auth()->user()->isSuperAdmin()) {
            abort(403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'email' => 'required|email|unique:users,email',
            'phone' => 'required|string|unique:users,phone',
            'password' => 'required|string|min:6',
            'area_id' => 'required|exists:areas,id',
        ]);

        $newAdmin = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'],
            'password' => Hash::make($validated['password']),
            'area_id' => $validated['area_id'],
            'role' => 'admin',
            'runner_status' => 'verified',
            'phone_verified_at' => now(),
            'email_verified_at' => now(),
        ]);

        Wallet::create([
            'user_id' => $newAdmin->id,
            'balance_kobo' => 50000000, // ₦500k initial float
            'escrow_kobo' => 0,
            'virtual_bank_name' => 'Squad GTCO Escrow',
            'virtual_account_nuban' => '80' . rand(10000000, 99999999),
        ]);

        AuditLog::record(
            action: 'admin.provision',
            targetType: 'User',
            targetId: $newAdmin->id,
            reason: "Super Admin provisioned Campus Lead for campus: {$validated['area_id']}"
        );

        return back()->with('success', "Campus Lead '{$newAdmin->name}' provisioned successfully.");
    }

    /**
     * Switch Active Campus Scope (Super Admin only)
     */
    public function switchCampus(Request $request)
    {
        if (!auth()->user()->isSuperAdmin()) {
            abort(403);
        }

        $campusId = $request->input('campus_id');
        if ($campusId === 'all' || empty($campusId)) {
            session()->forget('active_campus_id');
        } else {
            session(['active_campus_id' => $campusId]);
        }

        return back()->with('success', 'Active campus switched.');
    }
}

