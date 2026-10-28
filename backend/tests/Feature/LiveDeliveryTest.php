<?php

namespace Tests\Feature;

use App\Jobs\ExpireCallSession;
use App\Models\Area;
use App\Models\CallSession;
use App\Models\Task;
use App\Models\TaskMessage;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Wallet;
use App\Services\AblyService;
use App\Services\PlatformRevenueService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LiveDeliveryTest extends TestCase
{
    use RefreshDatabase;

    protected User $requester;

    protected User $runner;

    protected Area $area;

    protected Task $task;

    protected function setUp(): void
    {
        parent::setUp();

        $this->area = Area::create([
            'id' => 'buk-new',
            'name' => 'BUK New Site',
            'subtitle' => 'Main campus, Gwarzo Road, Kano',
            'lat' => 11.980560,
            'lng' => 8.479440,
            'radius_meters' => 3500,
            'is_active' => true,
        ]);

        $this->requester = User::create([
            'name' => 'Munir Ammani',
            'first_name' => 'Munir',
            'last_name' => 'Ammani',
            'phone' => '+2347082262502',
            'role' => 'user',
            'area_id' => 'buk-new',
            'runner_status' => 'verified',
        ]);

        Wallet::create([
            'user_id' => $this->requester->id,
            'balance_kobo' => 2500000,
            'escrow_kobo' => 30000,
            'virtual_bank_name' => 'Wema Bank',
            'virtual_account_nuban' => '9948123011',
        ]);

        $this->runner = User::create([
            'name' => 'Tobi Adeyemi',
            'first_name' => 'Tobi',
            'last_name' => 'Adeyemi',
            'phone' => '+2348022233445',
            'role' => 'runner',
            'runner_status' => 'verified',
            'rating' => 4.90,
            'trips_count' => 212,
            'area_id' => 'buk-new',
        ]);

        Wallet::create([
            'user_id' => $this->runner->id,
            'balance_kobo' => 100000,
            'escrow_kobo' => 0,
        ]);

        $this->task = Task::create([
            'id' => 'WD-LIVE1',
            'requester_id' => $this->requester->id,
            'runner_id' => $this->runner->id,
            'area_id' => 'buk-new',
            'item' => 'fx-991EX Calculator',
            'note' => 'Leave at the front desk',
            'pickup_name' => 'Moremi Hall, Block B',
            'pickup_lat' => 6.5182,
            'pickup_lng' => 3.3983,
            'dropoff_name' => 'LT3, Faculty of Science',
            'dropoff_lat' => 6.5160,
            'dropoff_lng' => 3.3965,
            'bounty_kobo' => 30000,
            'platform_fee_kobo' => 3000,
            'suggested_min_kobo' => 30000,
            'pin_code' => '4821',
            'status' => 'accepted',
            'accepted_at' => now(),
        ]);

        Sanctum::actingAs($this->requester);
    }

    public function test_show_endpoint_returns_live_delivery_attributes(): void
    {
        $response = $this->getJson("/api/tasks/{$this->task->id}");

        $response->assertStatus(200)
            ->assertJsonPath('id', 'WD-LIVE1')
            ->assertJsonPath('status', 'accepted')
            ->assertJsonPath('pin', '4821')
            ->assertJsonPath('runner.first_name', 'Tobi')
            ->assertJsonPath('runner.trips_count', 212)
            ->assertJsonPath('pickup.lat', 6.5182)
            ->assertJsonPath('dropoff.lat', 6.5160);
    }

    public function test_pickup_sets_photo_proof_and_status_in_transit(): void
    {
        $photoUrl = 'https://images.unsplash.com/photo-calc-proof';

        $response = $this->postJson("/api/tasks/{$this->task->id}/pickup", [
            'pickup_photo_url' => $photoUrl,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('status', 'in_transit')
            ->assertJsonPath('pickup_photo_url', $photoUrl);

        $this->assertDatabaseHas('tasks', [
            'id' => 'WD-LIVE1',
            'status' => 'in_transit',
            'pickup_photo_url' => $photoUrl,
        ]);
    }

    public function test_runner_can_upload_delivery_photo_proof(): void
    {
        Storage::fake('public');
        Sanctum::actingAs($this->runner);

        $response = $this->post("/api/tasks/{$this->task->id}/delivery-photo", [
            'photo' => UploadedFile::fake()->createWithContent(
                'delivered-item.png',
                base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=')
            ),
        ], ['Accept' => 'application/json']);

        $response->assertStatus(200)->assertJsonStructure(['dropoff_photo_url']);

        $photoUrl = $response->json('dropoff_photo_url');
        $this->assertStringContainsString('/storage/delivery-proofs/', $photoUrl);

        $this->task->refresh();
        $this->assertSame($photoUrl, $this->task->dropoff_photo_url);
        Storage::disk('public')->assertExists('delivery-proofs/'.basename($photoUrl));

        $this->getJson("/api/tasks/{$this->task->id}")
            ->assertStatus(200)
            ->assertJsonPath('dropoff_photo_url', $photoUrl);
    }

    public function test_arrive_records_arrival_timestamp(): void
    {
        $response = $this->postJson("/api/tasks/{$this->task->id}/arrive");

        $response->assertStatus(200);

        $this->task->refresh();
        $this->assertNotNull($this->task->arrived_at);
    }

    public function test_verify_pin_rejects_incorrect_pin(): void
    {
        $response = $this->postJson("/api/tasks/{$this->task->id}/verify-pin", [
            'pin' => '0000',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('code', 'INVALID_PIN');

        $this->task->refresh();
        $this->assertEquals('accepted', $this->task->status);
    }

    public function test_verify_pin_releases_escrow_and_credits_runner(): void
    {
        $response = $this->postJson("/api/tasks/{$this->task->id}/verify-pin", [
            'pin' => '4821',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('status', 'completed')
            ->assertJsonPath('payout_kobo', 27000); // 30,000 - 3,000 fee

        $this->task->refresh();
        $this->assertEquals('completed', $this->task->status);
        $this->assertNotNull($this->task->completed_at);

        // Requester escrow reduced by ₦300
        $reqWallet = $this->requester->wallet->fresh();
        $this->assertEquals(0, $reqWallet->escrow_kobo);

        // Runner credited with ₦270 (100,000 + 27,000 = 127,000)
        $runnerWallet = $this->runner->wallet->fresh();
        $this->assertEquals(127000, $runnerWallet->balance_kobo);

        // Runner trips count incremented
        $this->runner->refresh();
        $this->assertEquals(213, $this->runner->trips_count);

        // Payout transaction logged
        $this->assertDatabaseHas('transactions', [
            'task_id' => 'WD-LIVE1',
            'type' => 'payout',
            'amount_kobo' => 27000,
        ]);

        // Platform commission booked as its own ledger entry
        $this->assertDatabaseHas('transactions', [
            'task_id' => 'WD-LIVE1',
            'type' => 'fee',
            'amount_kobo' => 3000,
            'balance_before_kobo' => 0,
            'balance_after_kobo' => 3000,
        ]);

        $platformWallet = app(PlatformRevenueService::class)->wallet()->fresh();
        $this->assertEquals(3000, $platformWallet->balance_kobo);
    }

    public function test_runner_home_reports_earnings_and_payout_notification(): void
    {
        $this->postJson("/api/tasks/{$this->task->id}/verify-pin", [
            'pin' => '4821',
        ])->assertStatus(200);

        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $this->runner->id,
            'type' => 'money',
            'title' => '+₦270 landed in your wallet',
        ]);

        $this->runner->refresh();
        Sanctum::actingAs($this->runner);

        $this->getJson('/api/home?site=buk-new&mode=earn')
            ->assertStatus(200)
            ->assertJsonPath('earn.today', 27000)
            ->assertJsonPath('earn.week', 27000)
            ->assertJsonPath('earn.week_errands', 213)
            ->assertJsonPath('earn.rating', 4.9);
    }

    public function test_verify_pin_is_idempotent_and_does_not_double_credit(): void
    {
        // First verify
        $this->postJson("/api/tasks/{$this->task->id}/verify-pin", ['pin' => '4821'])->assertStatus(200);
        $runnerBalance = $this->runner->wallet->fresh()->balance_kobo;
        $platformBalance = app(PlatformRevenueService::class)->wallet()->fresh()->balance_kobo;

        // Second verify call with same PIN
        $second = $this->postJson("/api/tasks/{$this->task->id}/verify-pin", ['pin' => '4821']);
        $second->assertStatus(200)->assertJsonPath('status', 'completed');

        // Runner balance must remain unchanged!
        $this->assertEquals($runnerBalance, $this->runner->wallet->fresh()->balance_kobo);
        $this->assertEquals($platformBalance, app(PlatformRevenueService::class)->wallet()->fresh()->balance_kobo);
        $this->assertEquals(1, Transaction::where('task_id', 'WD-LIVE1')->where('type', 'fee')->count());
    }

    public function test_progress_handles_simulation_phases(): void
    {
        $response = $this->postJson("/api/tasks/{$this->task->id}/progress", [
            'phase' => 's4_photo_proof',
            'pickup_photo_url' => 'https://example.com/photo.jpg',
            'is_late' => true,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('status', 'in_transit')
            ->assertJsonPath('is_late', true);
    }

    public function test_chat_blocks_spaced_and_dashed_pin_leakage(): void
    {
        $response1 = $this->postJson("/api/tasks/{$this->task->id}/messages", [
            'text' => 'The code is 4 8 2 1',
        ]);
        $response1->assertStatus(422)->assertJsonPath('code', 'PIN_LEAK_BLOCKED');

        $response2 = $this->postJson("/api/tasks/{$this->task->id}/messages", [
            'text' => 'My PIN is 4-8-2-1.',
        ]);
        $response2->assertStatus(422)->assertJsonPath('code', 'PIN_LEAK_BLOCKED');
    }

    public function test_chat_blocks_delivery_pin_leakage(): void
    {
        $response = $this->postJson("/api/tasks/{$this->task->id}/messages", [
            'text' => 'Hey, the pin is 4821',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('code', 'PIN_LEAK_BLOCKED')
            ->assertJsonPath('message', "Don't send your PIN in chat. Read it out in person.");

        $this->assertEquals(0, TaskMessage::where('task_id', 'WD-LIVE1')->count());
    }

    public function test_chat_allows_regular_messages(): void
    {
        $response = $this->postJson("/api/tasks/{$this->task->id}/messages", [
            'text' => 'I am near the gate in a blue jacket',
            'sender_name' => 'Munir',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('text', 'I am near the gate in a blue jacket');

        $this->assertDatabaseHas('task_messages', [
            'task_id' => 'WD-LIVE1',
            'text' => 'I am near the gate in a blue jacket',
        ]);
        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $this->runner->id,
            'type' => 'message',
            'title' => 'Message from Munir Ammani',
        ]);
    }

    public function test_agora_call_session(): void
    {
        Queue::fake();

        $response = $this->postJson("/api/tasks/{$this->task->id}/call");

        $response->assertStatus(200)
            ->assertJsonPath('status', 'connecting')
            ->assertJsonPath('contact_name', 'Tobi Adeyemi')
            ->assertJsonPath('guarantee', 'Encrypted in-app Waydrop call.');

        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $this->runner->id,
            'type' => 'call',
            'title' => 'Incoming call from Munir Ammani',
        ]);
    }

    public function test_pending_call_is_visible_to_the_receiver(): void
    {
        Queue::fake();

        $call = $this->postJson("/api/tasks/{$this->task->id}/call");
        $call->assertStatus(200);

        Sanctum::actingAs($this->runner);

        $pending = $this->getJson('/api/calls/pending');

        $pending->assertStatus(200)
            ->assertJsonPath('call.call_session_id', $call->json('call_session_id'))
            ->assertJsonPath('call.task_id', $this->task->id)
            ->assertJsonPath('call.caller_name', 'Munir Ammani')
            ->assertJsonPath('call.receiver_is_runner', true)
            ->assertJsonPath('call.status', 'connecting');
    }

    public function test_pending_call_is_not_visible_to_the_caller(): void
    {
        Queue::fake();

        $this->postJson("/api/tasks/{$this->task->id}/call")->assertStatus(200);

        $this->getJson('/api/calls/pending')
            ->assertStatus(200)
            ->assertJsonPath('call', null);
    }

    public function test_pending_call_clears_after_hang_up(): void
    {
        Queue::fake();

        $call = $this->postJson("/api/tasks/{$this->task->id}/call");
        $call->assertStatus(200);

        Sanctum::actingAs($this->runner);

        $this->postJson("/api/tasks/{$this->task->id}/call/{$call->json('call_session_id')}/end")
            ->assertStatus(200);

        $this->getJson('/api/calls/pending')
            ->assertStatus(200)
            ->assertJsonPath('call', null);
    }

    public function test_agora_token_is_issued_to_a_task_participant(): void
    {
        Queue::fake();

        config([
            'services.agora.app_id' => str_repeat('a', 32),
            'services.agora.app_certificate' => str_repeat('b', 32),
        ]);

        $call = $this->postJson("/api/tasks/{$this->task->id}/call");
        $call->assertStatus(200);

        $token = $this->getJson("/api/tasks/{$this->task->id}/call/token?call_session_id={$call->json('call_session_id')}");
        $token->assertStatus(200)
            ->assertJsonPath('app_id', str_repeat('a', 32))
            ->assertJsonPath('channel', $call->json('channel'));

        $this->assertStringStartsWith('007', (string) $token->json('token'));
        $this->assertIsInt($token->json('uid'));
    }

    public function test_unanswered_call_expires_after_ninety_seconds(): void
    {
        Queue::fake();

        $call = $this->postJson("/api/tasks/{$this->task->id}/call");
        $call->assertStatus(200);

        $session = CallSession::findOrFail($call->json('call_session_id'));
        $this->assertSame('connecting', $session->status);

        (new ExpireCallSession($session->id))->handle(app(AblyService::class));

        $this->assertDatabaseHas('call_sessions', [
            'id' => $session->id,
            'status' => 'missed',
        ]);

        Sanctum::actingAs($this->runner);

        $this->getJson('/api/calls/pending')
            ->assertStatus(200)
            ->assertJsonPath('call', null);
    }

    public function test_answered_call_is_not_expired(): void
    {
        Queue::fake();

        config([
            'services.agora.app_id' => str_repeat('a', 32),
            'services.agora.app_certificate' => str_repeat('b', 32),
        ]);

        $call = $this->postJson("/api/tasks/{$this->task->id}/call");
        $call->assertStatus(200);

        Sanctum::actingAs($this->runner);

        $this->getJson("/api/tasks/{$this->task->id}/call/token?call_session_id={$call->json('call_session_id')}")
            ->assertStatus(200);

        $session = CallSession::findOrFail($call->json('call_session_id'));
        $this->assertSame('connected', $session->status);

        (new ExpireCallSession($session->id))->handle(app(AblyService::class));

        $this->assertDatabaseHas('call_sessions', [
            'id' => $session->id,
            'status' => 'connected',
        ]);
    }

    public function test_rating_and_tipping(): void
    {
        // Give requester available funds for tip
        $this->requester->wallet->update(['balance_kobo' => 500000]);

        $response = $this->postJson("/api/tasks/{$this->task->id}/rating", [
            'rating' => 5,
            'tags' => ['Super fast', 'Polite'],
            'note' => 'Delivered in under 5 minutes!',
            'tip_kobo' => 10000, // ₦100 tip
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('rating', 5)
            ->assertJsonPath('tip_kobo', 10000);

        $this->task->refresh();
        $this->assertEquals(5, $this->task->rating);
        $this->assertEquals(10000, $this->task->tip_kobo);

        // Runner wallet received ₦100 tip
        $runnerWallet = $this->runner->wallet->fresh();
        $this->assertEquals(110000, $runnerWallet->balance_kobo);
    }

    public function test_digital_receipt(): void
    {
        $response = $this->getJson("/api/tasks/{$this->task->id}/receipt");

        $response->assertStatus(200)
            ->assertJsonPath('task_id', 'WD-LIVE1')
            ->assertJsonPath('bounty_kobo', 30000)
            ->assertJsonPath('platform_fee_kobo', 3000)
            ->assertJsonPath('runner_payout_kobo', 27000)
            ->assertJsonPath('payment_method', 'Waydrop Wallet (Escrow Verified)');
    }

    public function test_dispute_registration(): void
    {
        $response = $this->postJson("/api/tasks/{$this->task->id}/disputes", [
            'reason' => 'safety',
            'explanation' => 'Unsafe behavior at dropoff',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('reason', 'safety')
            ->assertJsonPath('safety_alert', true);

        $this->task->refresh();
        $this->assertEquals('disputed', $this->task->status);
    }

    public function test_runner_cancel_reopens_radar(): void
    {
        $response = $this->postJson("/api/tasks/{$this->task->id}/runner-cancel");

        $response->assertStatus(200)
            ->assertJsonPath('status', 'pending')
            ->assertJsonPath('runner', null);

        $this->task->refresh();
        $this->assertEquals('pending', $this->task->status);
        $this->assertNull($this->task->runner_id);
    }
}
