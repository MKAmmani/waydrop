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
        $campusId = $this->getActiveCampusId();
        $areas = Area::all();

        $openErrandsQuery = Task::whereIn('status', ['pending', 'accepted', 'picked_up']);
        $disputesQuery = Dispute::where('status', 'open');
        $pendingKycQuery = RunnerVerification::whereIn('status', ['pending', 'ai_verified', 'flagged']);
        $lockedQuery = Task::where(function ($q) {
            $q->where('status', 'disputed')->orWhere('pin_attempts', '>=', 3);
        });
        $payoutsQuery = Payout::where('status', 'failed');

        if ($campusId && $campusId !== 'all') {
            $openErrandsQuery->where('area_id', $campusId);
            $disputesQuery->whereHas('task', fn($q) => $q->where('area_id', $campusId));
            $lockedQuery->where('area_id', $campusId);
            $pendingKycQuery->where('campus_id', $campusId);
        }

        $openErrandsCount = $openErrandsQuery->count();
        $disputesCount = $disputesQuery->count();
        $pendingKycCount = $pendingKycQuery->count();
        $totalEscrowKobo = Wallet::sum('escrow_kobo');
        $activeRunnersCount = User::where('role', 'runner')->where('runner_status', 'verified')->count();

        // Urgent items for "Needs you now"
        $urgentLocked = (clone $lockedQuery)->with(['requester', 'runner', 'area'])->latest()->limit(2)->get();
        $urgentDisputes = (clone $disputesQuery)->with(['task', 'requester', 'runner'])->latest()->limit(2)->get();
        $urgentKyc = (clone $pendingKycQuery)->with(['user', 'campus'])->latest()->limit(2)->get();
        $urgentPayouts = (clone $payoutsQuery)->with('user')->latest()->limit(2)->get();

        $activeCampusName = 'All Campuses';
        if ($campusId && $campusId !== 'all') {
            $activeCampusName = Area::find($campusId)?->name ?? 'BUK New Site';
        }

        // Real match duration median
        $matchedTasks = Task::whereNotNull('accepted_at')->whereNotNull('created_at')->latest()->limit(50)->get();
        $matchDurations = $matchedTasks->map(fn($t) => $t->accepted_at->diffInSeconds($t->created_at))->filter(fn($s) => $s > 0);
        if ($matchDurations->count() > 0) {
            $medianSecs = (int) $matchDurations->median();
            $medianMin = floor($medianSecs / 60);
            $medianRemainder = $medianSecs % 60;
            $timeToMatchDisplay = sprintf('%d:%02d', $medianMin, $medianRemainder);
            $timeToMatchSub = "Based on {$matchDurations->count()} matched errands";
        } else {
            $timeToMatchDisplay = "—";
            $timeToMatchSub = "No matched errands yet";
        }

        // Live real active errands & verified runners
        $liveTasks = (clone $openErrandsQuery)->with(['requester', 'runner'])->latest()->limit(20)->get();
        $liveRunnersQuery = User::where('role', 'runner')->where('runner_status', 'verified');
        if ($campusId && $campusId !== 'all') {
            $liveRunnersQuery->where('area_id', $campusId);
        }
        $liveRunners = $liveRunnersQuery->limit(20)->get();

        // Stage 1: Active campus model with coordinates & geofence radius
        $activeCampus = null;
        if ($campusId && $campusId !== 'all') {
            $activeCampus = Area::find($campusId);
        }
        if (!$activeCampus) {
            $activeCampus = Area::first();
        }

        // Stage 1: Confirmed campus places/landmarks
        $placesQuery = Place::where('confirmed', true);
        if ($campusId && $campusId !== 'all') {
            $placesQuery->where('area_id', $campusId);
        }
        $campusPlaces = $placesQuery->get();

        // Stage 2: Active errands with coordinates
        $activeTasks = (clone $openErrandsQuery)->with(['requester', 'runner', 'pickupPlace', 'dropoffPlace'])->latest()->limit(30)->get();

        // Stage 3: Ably API Key configuration
        $ablyApiKey = config('services.ably.api_key') ?? env('ABLY_API_KEY', '');

        return view('desk.today', compact(
            'areas',
            'openErrandsCount',
            'disputesCount',
            'pendingKycCount',
            'totalEscrowKobo',
            'activeRunnersCount',
            'urgentLocked',
            'urgentDisputes',
            'urgentKyc',
            'urgentPayouts',
            'activeCampusName',
            'activeCampus',
            'campusPlaces',
            'activeTasks',
            'ablyApiKey',
            'timeToMatchDisplay',
            'timeToMatchSub',
            'liveTasks',
            'liveRunners'
        ));
    }

    /**
     * Needs You Queue (Desk 02)
     */
    public function queue(Request $request)
    {
        $campusId = $this->getActiveCampusId();

        $disputesQuery = Dispute::with(['task', 'requester', 'runner'])->where('status', 'open');
        $kycQuery = RunnerVerification::with(['user', 'campus'])->whereIn('status', ['pending', 'ai_verified', 'flagged']);
        $lockedQuery = Task::with(['requester', 'runner', 'area'])->where(function ($q) {
            $q->where('status', 'disputed')->orWhere('pin_attempts', '>=', 3);
        });
        $payoutsQuery = Payout::with('user')->where('status', 'failed');

        if ($campusId && $campusId !== 'all') {
            $disputesQuery->whereHas('task', fn($q) => $q->where('area_id', $campusId));
            $kycQuery->where('campus_id', $campusId);
            $lockedQuery->where('area_id', $campusId);
        }

        $disputes = $disputesQuery->latest()->get();
        $kycList = $kycQuery->latest()->get();
        $lockedTasks = $lockedQuery->latest()->get();
        $failedPayouts = $payoutsQuery->latest()->get();

        return view('desk.queue', compact('disputes', 'kycList', 'lockedTasks', 'failedPayouts'));
    }

    /**
     * Dispute Resolution Desk (Desk 03)
     */
    public function disputes(Request $request)
    {
        $campusId = $this->getActiveCampusId();
        $query = Dispute::with(['task.area', 'requester', 'runner', 'resolver'])->latest();

        if ($campusId && $campusId !== 'all') {
            $query->whereHas('task', fn($q) => $q->where('area_id', $campusId));
        }

        $disputes = $query->get();
        $selectedId = $request->query('id', $disputes->first()?->id);
        $selectedDispute = $disputes->firstWhere('id', $selectedId) ?? $disputes->first();

        return view('desk.disputes', compact('disputes', 'selectedDispute'));
    }

    /**
     * ID Checks / KYC Review Desk (Desk 04)
     */
    public function kyc(Request $request)
    {
        $campusId = $this->getActiveCampusId();
        $query = RunnerVerification::with(['user.wallet', 'campus'])->latest();

        if ($campusId && $campusId !== 'all') {
            $query->where('campus_id', $campusId);
        }

        $verifications = $query->get();
        $selectedId = $request->query('id', $verifications->first()?->id);
        $selectedKyc = $verifications->firstWhere('id', $selectedId) ?? $verifications->first();

        return view('desk.kyc', compact('verifications', 'selectedKyc'));
    }

    /**
     * Locked Handovers Desk (Desk 05)
     */
    public function lockedHandovers(Request $request)
    {
        $campusId = $this->getActiveCampusId();
        $query = Task::with(['requester', 'runner', 'area', 'activities'])
            ->where(function ($q) {
                $q->where('status', 'disputed')->orWhere('pin_attempts', '>=', 3);
            })
            ->latest();

        if ($campusId && $campusId !== 'all') {
            $query->where('area_id', $campusId);
        }

        $lockedTasks = $query->get();
        $selectedId = $request->query('id', $lockedTasks->first()?->id);
        $selectedTask = $lockedTasks->firstWhere('id', $selectedId) ?? $lockedTasks->first();

        return view('desk.locked_handovers', compact('lockedTasks', 'selectedTask'));
    }

    /**
     * People & Safety Desk (Desk 06)
     */
    public function people(Request $request)
    {
        $campusId = $this->getActiveCampusId();
        $roleFilter = $request->query('role');
        $search = $request->query('q');

        $query = User::with(['wallet', 'area', 'runnerVerification'])->latest();

        if ($campusId && $campusId !== 'all') {
            $query->where('area_id', $campusId);
        }

        if ($roleFilter) {
            $query->where('role', $roleFilter);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $users = $query->get();
        $selectedId = $request->query('id', $users->first()?->id);
        $selectedUser = User::with(['wallet', 'area', 'runnerVerification', 'tasksAsRequester.runner', 'tasksAsRunner.requester'])->find($selectedId) ?? $users->first();

        return view('desk.people', compact('users', 'selectedUser', 'roleFilter', 'search'));
    }

    /**
     * Failed Payouts & Banking Desk (Desk 07)
     */
    public function payouts()
    {
        $campusId = $this->getActiveCampusId();
        $query = Payout::with(['user.area'])->latest();

        if ($campusId && $campusId !== 'all') {
            $query->whereHas('user', fn($q) => $q->where('area_id', $campusId));
        }

        $payouts = $query->get();
        return view('desk.payouts', compact('payouts'));
    }

    /**
     * Campus Places & Landmarks Desk (Desk 08)
     */
    public function places()
    {
        $campusId = $this->getActiveCampusId();
        $query = Place::with(['area', 'suggestedBy'])->withCount(['pickupTasks', 'dropoffTasks'])->latest();

        if ($campusId && $campusId !== 'all') {
            $query->where('area_id', $campusId);
        }

        $places = $query->get();
        $pendingPlaces = $places->where('confirmed', false);
        $confirmedPlaces = $places->where('confirmed', true);
        $areas = Area::all();

        return view('desk.places', compact('places', 'pendingPlaces', 'confirmedPlaces', 'areas'));
    }

    /**
     * Crew & Routines Desk (Desk 09)
     */
    public function crew()
    {
        $campusId = $this->getActiveCampusId();
        $query = CrewShift::with(['area', 'lead', 'members'])->latest();

        if ($campusId && $campusId !== 'all') {
            $query->where('area_id', $campusId);
        }

        $shifts = $query->get();
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
     * Directly Provision Verified Campus Landmark (Admin / Super Admin)
     */
    public function createPlace(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'area_id' => 'required|exists:areas,id',
            'kind' => 'required|string|max:30',
            'lat' => 'required|numeric',
            'lng' => 'required|numeric',
            'aka' => 'nullable|string',
            'note' => 'nullable|string|max:255',
        ]);

        $slug = \Illuminate\Support\Str::slug($validated['name']);
        $uniqueId = $validated['area_id'] . '-' . $slug;
        if (Place::where('id', $uniqueId)->exists()) {
            $uniqueId .= '-' . rand(100, 999);
        }

        $akaArray = null;
        if (!empty($validated['aka'])) {
            $akaArray = array_values(array_filter(array_map('trim', explode(',', $validated['aka']))));
        }

        $place = Place::create([
            'id' => $uniqueId,
            'area_id' => $validated['area_id'],
            'name' => $validated['name'],
            'kind' => $validated['kind'],
            'lat' => $validated['lat'],
            'lng' => $validated['lng'],
            'aka' => $akaArray,
            'note' => $validated['note'] ?? null,
            'confirmed' => true,
            'bounty_paid' => true,
            'suggested_by_user_id' => null,
            'used_count' => 0,
        ]);

        AuditLog::record(
            action: 'place.create',
            targetType: 'Place',
            targetId: $place->id,
            reason: "Administrator provisioned campus landmark: {$place->name} ({$place->area_id})"
        );

        return back()->with('success', "Campus landmark '{$place->name}' added and verified successfully.");
    }

    /**
     * Update Campus Landmark Details & Coordinates (Admin / Super Admin)
     */
    public function updatePlace(Request $request, string $id)
    {
        $place = Place::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'area_id' => 'required|exists:areas,id',
            'kind' => 'required|string|max:30',
            'lat' => 'required|numeric',
            'lng' => 'required|numeric',
            'aka' => 'nullable|string',
            'note' => 'nullable|string|max:255',
        ]);

        $akaArray = null;
        if (!empty($validated['aka'])) {
            $akaArray = array_values(array_filter(array_map('trim', explode(',', $validated['aka']))));
        }

        $place->update([
            'name' => $validated['name'],
            'area_id' => $validated['area_id'],
            'kind' => $validated['kind'],
            'lat' => $validated['lat'],
            'lng' => $validated['lng'],
            'aka' => $akaArray,
            'note' => $validated['note'] ?? null,
        ]);

        AuditLog::record(
            action: 'place.update',
            targetType: 'Place',
            targetId: $place->id,
            reason: "Administrator updated campus landmark details: {$place->name}"
        );

        return back()->with('success', "Campus landmark '{$place->name}' updated successfully.");
    }

    /**
     * Delete Campus Landmark if no tasks attached (Admin / Super Admin)
     */
    public function deletePlace(string $id)
    {
        $place = Place::withCount(['pickupTasks', 'dropoffTasks'])->findOrFail($id);

        $attached = $place->pickup_tasks_count + $place->dropoff_tasks_count;

        if ($attached > 0) {
            return back()->withErrors([
                'delete' => "Cannot delete landmark '{$place->name}' because {$attached} errand(s) have been dispatched to/from it."
            ]);
        }

        $name = $place->name;
        $place->delete();

        AuditLog::record(
            action: 'place.delete',
            targetType: 'Place',
            targetId: $id,
            reason: "Administrator permanently deleted landmark: {$name}"
        );

        return back()->with('success', "Campus landmark '{$name}' was deleted.");
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

        $campuses = Area::withCount(['places', 'tasks', 'users', 'crewShifts'])->get();
        $admins = User::whereIn('role', ['admin', 'super_admin'])
            ->with(['area', 'wallet'])
            ->withCount(['tasksAsRequester', 'tasksAsRunner', 'payouts'])
            ->latest()
            ->get();

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

        $validated['is_active'] = true;
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
     * Update Campus Configuration & Center Coordinates (Super Admin)
     */
    public function updateCampus(Request $request, string $id)
    {
        if (!auth()->user()->isSuperAdmin()) {
            abort(403);
        }

        $area = Area::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'subtitle' => 'required|string|max:150',
            'lat' => 'required|numeric',
            'lng' => 'required|numeric',
            'radius_meters' => 'required|integer|min:500',
        ]);

        $area->update($validated);

        AuditLog::record(
            action: 'campus.update',
            targetType: 'Area',
            targetId: $area->id,
            reason: "Super Admin updated campus configuration: {$area->name} ({$area->id})"
        );

        return back()->with('success', "Campus '{$area->name}' updated successfully.");
    }

    /**
     * Toggle Campus Active / Live Status (Super Admin)
     */
    public function toggleCampusStatus(string $id)
    {
        if (!auth()->user()->isSuperAdmin()) {
            abort(403);
        }

        $area = Area::findOrFail($id);
        $area->is_active = !$area->is_active;
        $area->save();

        $statusLabel = $area->is_active ? 'Live (Active)' : 'Inactive (Deactivated)';

        AuditLog::record(
            action: 'campus.toggle_status',
            targetType: 'Area',
            targetId: $area->id,
            reason: "Super Admin changed campus status to: {$statusLabel}"
        );

        return back()->with('success', "Campus '{$area->name}' is now {$statusLabel}.");
    }

    /**
     * Permanently Delete Campus if No Records Attached (Super Admin)
     */
    public function deleteCampus(string $id)
    {
        if (!auth()->user()->isSuperAdmin()) {
            abort(403);
        }

        $area = Area::withCount(['places', 'tasks', 'users', 'crewShifts'])->findOrFail($id);

        $attached = $area->places_count + $area->tasks_count + $area->users_count + $area->crew_shifts_count;

        if ($attached > 0) {
            return back()->withErrors([
                'delete' => "Cannot delete campus '{$area->name}' because it has {$attached} attached record(s) ({$area->places_count} places, {$area->tasks_count} errands, {$area->users_count} users, {$area->crew_shifts_count} shift routines). Deactivate the campus instead."
            ]);
        }

        $campusName = $area->name;
        $area->delete();

        AuditLog::record(
            action: 'campus.delete',
            targetType: 'Area',
            targetId: $id,
            reason: "Super Admin permanently deleted unattached campus: {$campusName}"
        );

        return back()->with('success', "Campus '{$campusName}' was successfully deleted.");
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
     * Update Campus Administrator Credentials & Scope (Super Admin)
     */
    public function updateCampusAdmin(Request $request, string $id)
    {
        if (!auth()->user()->isSuperAdmin()) {
            abort(403);
        }

        $admin = User::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'email' => 'required|email|unique:users,email,' . $admin->id,
            'phone' => 'required|string|unique:users,phone,' . $admin->id,
            'role' => 'required|in:admin,super_admin',
            'area_id' => 'nullable|exists:areas,id',
            'password' => 'nullable|string|min:6',
        ]);

        $updateData = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'],
            'role' => $validated['role'],
            'area_id' => $validated['role'] === 'super_admin' ? null : ($validated['area_id'] ?? null),
        ];

        if (!empty($validated['password'])) {
            $updateData['password'] = Hash::make($validated['password']);
        }

        $admin->update($updateData);

        AuditLog::record(
            action: 'admin.update',
            targetType: 'User',
            targetId: $admin->id,
            reason: "Super Admin updated credentials for administrative staff: {$admin->name} ({$admin->email})"
        );

        return back()->with('success', "Staff account '{$admin->name}' updated successfully.");
    }

    /**
     * Activate or Deactivate Staff Access (Super Admin)
     */
    public function toggleCampusAdminStatus(string $id)
    {
        if (!auth()->user()->isSuperAdmin()) {
            abort(403);
        }

        $admin = User::findOrFail($id);

        if ($admin->id === auth()->id()) {
            return back()->withErrors(['status' => 'Security Protection: You cannot deactivate your own logged-in administrator account.']);
        }

        if ($admin->is_blocked || $admin->is_paused) {
            $admin->update([
                'is_blocked' => false,
                'is_paused' => false,
                'block_reason' => null,
            ]);
            $statusLabel = 'Live (Active)';
        } else {
            $admin->update([
                'is_blocked' => true,
                'is_paused' => true,
                'block_reason' => 'Access paused from National Operations Desk by Super Admin',
            ]);
            $statusLabel = 'Inactive (Deactivated)';
        }

        AuditLog::record(
            action: 'admin.toggle_status',
            targetType: 'User',
            targetId: $admin->id,
            reason: "Super Admin changed administrative staff status to {$statusLabel}: {$admin->email}"
        );

        return back()->with('success', "Staff account '{$admin->name}' is now {$statusLabel}.");
    }

    /**
     * Delete Campus Admin if no records attached (Super Admin)
     */
    public function deleteCampusAdmin(string $id)
    {
        if (!auth()->user()->isSuperAdmin()) {
            abort(403);
        }

        $admin = User::withCount(['tasksAsRequester', 'tasksAsRunner', 'payouts'])->findOrFail($id);

        if ($admin->id === auth()->id()) {
            return back()->withErrors(['delete' => 'Security Protection: You cannot delete your own logged-in Super Admin account.']);
        }

        $attached = $admin->tasks_as_requester_count + $admin->tasks_as_runner_count + $admin->payouts_count;

        if ($attached > 0) {
            return back()->withErrors([
                'delete' => "Cannot delete staff account '{$admin->name}' because it has {$attached} attached transaction record(s). Please deactivate access instead."
            ]);
        }

        $adminName = $admin->name;

        // If wallet exists with 0 transactions, clean it up
        if ($admin->wallet) {
            $txCount = Transaction::where('wallet_id', $admin->wallet->id)->count();
            if ($txCount === 0) {
                $admin->wallet->delete();
            } else {
                return back()->withErrors([
                    'delete' => "Cannot delete staff account '{$admin->name}' because its wallet has {$txCount} financial audit record(s). Please deactivate access instead."
                ]);
            }
        }

        $admin->delete();

        AuditLog::record(
            action: 'admin.delete',
            targetType: 'User',
            targetId: $id,
            reason: "Super Admin permanently deleted administrative staff account: {$adminName}"
        );

        return back()->with('success', "Staff account '{$adminName}' was successfully deleted.");
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

    /**
     * Update Platform Rules with mandatory audit reason
     */
    public function updateRules(Request $request)
    {
        $validated = $request->validate([
            'rules' => 'required|array',
            'rules.*' => 'nullable|string',
            'reason' => 'required|string|min:5',
        ]);

        foreach ($validated['rules'] as $key => $value) {
            $rule = PlatformRule::where('key', $key)->first();
            if ($rule && $rule->value !== $value) {
                $before = ['value' => $rule->value];
                $rule->update([
                    'value' => $value,
                    'updated_by' => auth()->id(),
                ]);
                AuditLog::record(
                    action: 'rule.update',
                    targetType: 'PlatformRule',
                    targetId: (string) $rule->id,
                    reason: $validated['reason'],
                    before: $before,
                    after: ['value' => $value]
                );
            }
        }

        return back()->with('success', 'Platform rules updated successfully.');
    }

    /**
     * Create a new Platform Rule (Parameter)
     */
    public function createRule(Request $request)
    {
        $validated = $request->validate([
            'key' => 'required|string|max:60|unique:platform_rules,key|regex:/^[a-z0-9_]+$/',
            'title' => 'required|string|max:100',
            'group' => 'required|string|in:pricing,matching,safety,kyc,payout,general',
            'value' => 'required|string',
            'description' => 'nullable|string|max:255',
            'reason' => 'required|string|min:5',
        ]);

        $rule = PlatformRule::create([
            'key' => strtolower($validated['key']),
            'title' => $validated['title'],
            'group' => $validated['group'],
            'value' => $validated['value'],
            'description' => $validated['description'] ?? null,
            'is_active' => true,
            'updated_by' => auth()->id(),
        ]);

        AuditLog::record(
            action: 'rule.create',
            targetType: 'PlatformRule',
            targetId: (string) $rule->id,
            reason: $validated['reason'],
            after: [
                'key' => $rule->key,
                'title' => $rule->title,
                'value' => $rule->value,
                'group' => $rule->group,
            ]
        );

        return back()->with('success', "New rule parameter '{$rule->title}' ({$rule->key}) created successfully.");
    }

    /**
     * Update User operational status (pause, block, verify)
     */
    public function updateUserStatus(Request $request, string $id)
    {
        $validated = $request->validate([
            'action' => 'required|in:pause,unpause,block,unblock,verify_runner,reject_runner',
            'reason' => 'required|string|min:5',
        ]);

        $user = User::findOrFail($id);
        $before = [
            'is_paused' => $user->is_paused,
            'is_blocked' => $user->is_blocked,
            'runner_status' => $user->runner_status,
        ];

        switch ($validated['action']) {
            case 'pause':
                $user->update(['is_paused' => true]);
                break;
            case 'unpause':
                $user->update(['is_paused' => false]);
                break;
            case 'block':
                $user->update(['is_blocked' => true, 'block_reason' => $validated['reason']]);
                break;
            case 'unblock':
                $user->update(['is_blocked' => false, 'block_reason' => null]);
                break;
            case 'verify_runner':
                $user->update(['runner_status' => 'verified']);
                break;
            case 'reject_runner':
                $user->update(['runner_status' => 'rejected']);
                break;
        }

        AuditLog::record(
            action: 'user.status_' . $validated['action'],
            targetType: 'User',
            targetId: $user->id,
            reason: $validated['reason'],
            before: $before,
            after: [
                'is_paused' => $user->is_paused,
                'is_blocked' => $user->is_blocked,
                'runner_status' => $user->runner_status,
            ]
        );

        return back()->with('success', 'User status updated successfully.');
    }

    /**
     * Stage 2 & 3: Broadcast runner telemetry coordinates over Ably
     */
    public function broadcastRunnerTelemetry(Request $request)
    {
        $validated = $request->validate([
            'campus_id' => 'required|string',
            'runner_id' => 'required|string',
            'lat' => 'required|numeric',
            'lng' => 'required|numeric',
            'heading' => 'nullable|numeric',
            'speed' => 'nullable|numeric',
        ]);

        $runner = User::find($validated['runner_id']);
        $payload = [
            'runner_id' => $validated['runner_id'],
            'name' => $runner?->name ?? 'Campus Runner',
            'avatar' => $runner?->avatar_url ?? null,
            'phone' => $runner?->phone ?? null,
            'rating' => $runner?->rating_avg ?? 5.0,
            'lat' => (float)$validated['lat'],
            'lng' => (float)$validated['lng'],
            'heading' => (float)($validated['heading'] ?? 0),
            'speed' => (float)($validated['speed'] ?? 4.5),
            'timestamp' => now()->timestamp,
        ];

        app(\App\Services\AblyService::class)->publish("campus:{$validated['campus_id']}:radar", 'runner:location', $payload);

        return response()->json(['success' => true, 'payload' => $payload]);
    }
}

