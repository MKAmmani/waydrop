<?php

namespace Tests\Feature;

use App\Models\Area;
use App\Models\Place;
use App\Models\Task;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TaskSearchAndEscrowTest extends TestCase
{
    use RefreshDatabase;

    protected User $requester;

    protected User $runner;

    protected Area $area;

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
            'balance_kobo' => 2500000, // ₦25,000
            'escrow_kobo' => 0,
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
            'balance_kobo' => 450000,
            'escrow_kobo' => 0,
        ]);
    }

    public function test_cannot_create_task_with_insufficient_funds(): void
    {
        $response = $this->actingAs($this->requester)
            ->postJson('/api/tasks', [
                'item' => 'Laptop charger',
                'bounty' => 3000000, // ₦30,000 (more than balance ₦25,000)
                'pickup' => ['id' => 'here', 'name' => 'New Hall'],
                'dropoff' => ['id' => 'dest', 'name' => 'Main Library'],
            ]);

        $response->assertStatus(402);
        $response->assertJson([
            'code' => 'INSUFFICIENT_FUNDS',
        ]);
    }

    public function test_creates_task_and_locks_escrow_safely(): void
    {
        $response = $this->actingAs($this->requester)
            ->postJson('/api/tasks', [
                'item' => 'TI-84 Calculator',
                'bounty' => 30000, // ₦300
                'suggested_min' => 30000,
                'pickup' => ['id' => 'moremi', 'name' => 'Moremi Hall'],
                'dropoff' => ['id' => 'lt3', 'name' => 'LT3'],
            ]);

        $response->assertStatus(201);
        $data = $response->json();

        $this->assertEquals('pending', $data['status']);
        $this->assertEquals(30000, $data['bounty']);
        $this->assertNotEmpty($data['pin']);
        $this->assertSame(0, $data['search']['notified']);
        $this->assertSame([], $data['search']['viewing_runners']);
        $this->assertFalse($data['search']['no_match']);

        // Check wallet escrow held safely
        $this->requester->wallet->refresh();
        $this->assertEquals(2470000, $this->requester->wallet->balance_kobo); // 25,000 - 300 = 24,700
        $this->assertEquals(30000, $this->requester->wallet->escrow_kobo);   // 300 held

        // Check transaction record
        $this->assertDatabaseHas('transactions', [
            'wallet_id' => $this->requester->wallet->id,
            'task_id' => $data['id'],
            'type' => 'escrow_lock',
            'amount_kobo' => 30000,
        ]);
    }

    public function test_lowball_bounty_stays_searching_until_a_real_state_change(): void
    {
        // Lowball offer: ₦200 when suggested min is ₦350
        $task = Task::create([
            'id' => 'WD-LOW1',
            'requester_id' => $this->requester->id,
            'area_id' => 'buk-new',
            'item' => 'Lab notebook',
            'pickup_name' => 'Hostel A',
            'dropoff_name' => 'Admin Quad',
            'bounty_kobo' => 20000,
            'suggested_min_kobo' => 35000,
            'pin_code' => '1234',
            'status' => 'pending',
        ]);
        $task->created_at = now()->subSeconds(8);
        $task->updated_at = now()->subSeconds(8);
        $task->saveQuietly();

        $response = $this->actingAs($this->requester)->getJson("/api/tasks/{$task->id}");
        $response->assertStatus(200);
        $data = $response->json();

        $this->assertFalse($data['search']['no_match']);
        $this->assertEquals('pending', $data['status']);
        $this->assertNull($data['runner']);
    }

    public function test_verified_runner_viewing_a_task_is_reflected_in_search_state(): void
    {
        $task = Task::create([
            'id' => 'WD-VIEW',
            'requester_id' => $this->requester->id,
            'area_id' => 'buk-new',
            'item' => 'Lecture notes',
            'pickup_name' => 'Main Library',
            'dropoff_name' => 'CBN Centre of Excellence',
            'bounty_kobo' => 30000,
            'suggested_min_kobo' => 30000,
            'pin_code' => '2468',
            'status' => 'pending',
        ]);

        Sanctum::actingAs($this->requester);
        $this->getJson("/api/tasks/{$task->id}")
            ->assertJsonPath('search.viewing', 0);

        Sanctum::actingAs($this->runner);
        $this->getJson("/api/tasks/{$task->id}")
            ->assertJsonPath('search.viewing', 1)
            ->assertJsonPath('search.viewing_runner', 'Tobi');

        Sanctum::actingAs($this->requester);
        $this->getJson("/api/tasks/{$task->id}")
            ->assertJsonPath('search.viewing_runners.0', 'Tobi');
    }

    public function test_runner_route_matches_task_pickup_or_dropoff(): void
    {
        Place::create([
            'id' => 'new-main-library',
            'area_id' => 'buk-new',
            'name' => 'Main Library',
            'kind' => 'library',
            'lat' => 11.980560,
            'lng' => 8.479440,
            'confirmed' => true,
        ]);
        Place::create([
            'id' => 'new-cbn-centre',
            'area_id' => 'buk-new',
            'name' => 'CBN Centre of Excellence',
            'kind' => 'landmark',
            'lat' => 11.983500,
            'lng' => 8.486000,
            'confirmed' => true,
        ]);

        $task = Task::create([
            'id' => 'WD-ROUTE',
            'requester_id' => $this->requester->id,
            'area_id' => 'buk-new',
            'item' => 'Lecture notes',
            'pickup_place_id' => 'new-main-library',
            'pickup_name' => 'Main Library',
            'dropoff_place_id' => 'new-cbn-centre',
            'dropoff_name' => 'CBN Centre of Excellence',
            'bounty_kobo' => 30000,
            'suggested_min_kobo' => 30000,
            'pin_code' => '1357',
            'status' => 'pending',
        ]);

        Sanctum::actingAs($this->runner);
        $this->getJson('/api/tasks/available?site_id=buk-new&destination=Main%20Library&destination_id=new-main-library')
            ->assertStatus(200)
            ->assertJsonPath('tasks.0.id', $task->id)
            ->assertJsonPath('tasks.0.on_route', true);
    }

    public function test_runner_with_active_task_still_receives_other_pending_tasks(): void
    {
        Task::create([
            'id' => 'WD-ACTIVE-RUNNER',
            'requester_id' => $this->requester->id,
            'runner_id' => $this->runner->id,
            'area_id' => 'buk-new',
            'item' => 'Book',
            'pickup_name' => "Musa's Kitchen",
            'dropoff_name' => 'Moremi Hall',
            'bounty_kobo' => 30000,
            'suggested_min_kobo' => 30000,
            'pin_code' => '2468',
            'status' => 'shopping',
        ]);

        Task::create([
            'id' => 'WD-OPEN-RUNNER',
            'requester_id' => $this->requester->id,
            'area_id' => 'buk-new',
            'item' => 'Documents',
            'pickup_name' => 'CBN Centre of Excellence',
            'dropoff_name' => 'Main Gate',
            'bounty_kobo' => 45000,
            'suggested_min_kobo' => 30000,
            'pin_code' => '1357',
            'status' => 'pending',
        ]);

        Sanctum::actingAs($this->runner);
        $this->getJson('/api/tasks/available?site_id=buk-new&destination=CBN%20Centre%20of%20Excellence')
            ->assertStatus(200)
            ->assertJsonPath('tasks.0.id', 'WD-OPEN-RUNNER')
            ->assertJsonPath('tasks.0.on_route', true);
    }

    public function test_market_rate_bounty_stays_pending_until_runner_accepts(): void
    {
        // Fair offer: ₦300 when suggested min is ₦300, elapsed 8 seconds
        $task = Task::create([
            'id' => 'WD-GOOD',
            'requester_id' => $this->requester->id,
            'area_id' => 'buk-new',
            'item' => 'Food flask',
            'pickup_name' => 'Coke Village',
            'dropoff_name' => 'SMS Library',
            'bounty_kobo' => 30000,
            'suggested_min_kobo' => 30000,
            'pin_code' => '9876',
            'status' => 'pending',
        ]);
        $task->created_at = now()->subSeconds(8);
        $task->updated_at = now()->subSeconds(8);
        $task->saveQuietly();

        // 1. Task remains pending on search radar (NO fake timer auto-acceptance)
        $response = $this->actingAs($this->requester)->getJson("/api/tasks/{$task->id}");
        $response->assertStatus(200);
        $data = $response->json();

        $this->assertEquals('pending', $data['status']);
        $this->assertNull($data['runner']);
        $this->assertFalse($data['search']['no_match']);

        // 2. Verified runner (Tobi) actively accepts the errand
        $acceptResponse = $this->actingAs($this->runner)->postJson("/api/tasks/{$task->id}/accept");
        $acceptResponse->assertStatus(200);
        $acceptData = $acceptResponse->json();

        $this->assertEquals('accepted', $acceptData['status']);
        $this->assertNotNull($acceptData['runner']);
        $this->assertEquals('Tobi', $acceptData['runner']['first_name']);
        $this->assertEquals('9876', $acceptData['pin']);

        // Check task in DB is updated to accepted with runner_id
        $task->refresh();
        $this->assertEquals('accepted', $task->status);
        $this->assertEquals($this->runner->id, $task->runner_id);
    }

    public function test_raising_bounty_locks_additional_funds_and_resets_search(): void
    {
        $task = Task::create([
            'id' => 'WD-RAIS',
            'requester_id' => $this->requester->id,
            'area_id' => 'buk-new',
            'item' => 'Engineering set',
            'pickup_name' => 'Moremi Hall',
            'dropoff_name' => 'FEG Library',
            'bounty_kobo' => 20000, // ₦200
            'suggested_min_kobo' => 30000,
            'pin_code' => '5555',
            'status' => 'pending',
            'created_at' => now()->subSeconds(10),
            'updated_at' => now()->subSeconds(10),
        ]);

        $this->requester->wallet->update([
            'balance_kobo' => 2480000,
            'escrow_kobo' => 20000,
        ]);

        // Raise bounty from ₦200 to ₦400 (delta = ₦200 = 20,000 kobo)
        $response = $this->actingAs($this->requester)
            ->postJson("/api/tasks/{$task->id}/bounty", [
                'bounty' => 40000,
            ]);

        $response->assertStatus(200);
        $data = $response->json();

        $this->assertEquals(40000, $data['bounty']);
        $this->assertFalse($data['search']['no_match']); // resets search!

        // Verify wallet updated
        $this->requester->wallet->refresh();
        $this->assertEquals(2460000, $this->requester->wallet->balance_kobo); // debited additional 20,000
        $this->assertEquals(40000, $this->requester->wallet->escrow_kobo);   // escrow is now 40,000

        // Check raise transaction
        $this->assertDatabaseHas('transactions', [
            'task_id' => $task->id,
            'type' => 'escrow_lock',
            'amount_kobo' => 20000,
        ]);
    }

    public function test_cancelling_task_fully_refunds_escrow_to_wallet(): void
    {
        $task = Task::create([
            'id' => 'WD-CANC',
            'requester_id' => $this->requester->id,
            'area_id' => 'buk-new',
            'item' => 'Umbrella',
            'pickup_name' => 'Gate',
            'dropoff_name' => 'Hostel',
            'bounty_kobo' => 30000,
            'suggested_min_kobo' => 30000,
            'pin_code' => '7777',
            'status' => 'pending',
        ]);

        $this->requester->wallet->update([
            'balance_kobo' => 2470000,
            'escrow_kobo' => 30000,
        ]);

        $response = $this->actingAs($this->requester)->postJson("/api/tasks/{$task->id}/cancel");
        $response->assertStatus(200);

        $data = $response->json();
        $this->assertEquals('cancelled', $data['status']);

        // Check wallet refunded
        $this->requester->wallet->refresh();
        $this->assertEquals(2500000, $this->requester->wallet->balance_kobo);
        $this->assertEquals(0, $this->requester->wallet->escrow_kobo);

        // Check refund transaction
        $this->assertDatabaseHas('transactions', [
            'task_id' => $task->id,
            'type' => 'escrow_refund',
            'amount_kobo' => 30000,
        ]);

        // Check task cancelled
        $task->refresh();
        $this->assertEquals('cancelled', $task->status);
        $this->assertNotNull($task->cancelled_at);
    }

    public function test_cancelling_a_pending_buy_errand_refunds_the_whole_escrow(): void
    {
        $createResponse = $this->actingAs($this->requester)->postJson('/api/tasks', [
            'type' => 'buy',
            'item' => '6 bottles of water',
            'bounty' => 30000,
            'budget_kobo' => 198000,
            'pickup' => ['id' => 'anywhere', 'name' => 'Any shop nearby'],
            'dropoff' => ['id' => 'stadium', 'name' => 'Stadium'],
            'items' => [
                ['name' => 'Bottled water, 75cl', 'qty' => 6, 'est' => 300, 'unit' => 'bottle'],
            ],
        ]);

        $createResponse->assertStatus(201);
        $taskId = $createResponse->json('id');

        $this->requester->wallet->refresh();
        $this->assertEquals(228000, $this->requester->wallet->escrow_kobo);

        $response = $this->actingAs($this->requester)->postJson("/api/tasks/{$taskId}/cancel");
        $response->assertStatus(200);

        $this->requester->wallet->refresh();
        $this->assertEquals(2500000, $this->requester->wallet->balance_kobo);
        $this->assertEquals(0, $this->requester->wallet->escrow_kobo);

        $this->assertDatabaseHas('transactions', [
            'task_id' => $taskId,
            'type' => 'escrow_refund',
            'amount_kobo' => 228000,
        ]);
    }

    public function test_cannot_cancel_after_a_runner_has_accepted(): void
    {
        $task = Task::create([
            'id' => 'WD-NOCANCEL',
            'requester_id' => $this->requester->id,
            'area_id' => 'buk-new',
            'item' => 'Lab coat',
            'pickup_name' => 'Hostel A',
            'dropoff_name' => 'Faculty of Science',
            'bounty_kobo' => 30000,
            'suggested_min_kobo' => 30000,
            'pin_code' => '4321',
            'status' => 'pending',
        ]);

        $this->requester->wallet->update([
            'balance_kobo' => 2470000,
            'escrow_kobo' => 30000,
        ]);

        $this->actingAs($this->runner)
            ->postJson("/api/tasks/{$task->id}/accept")
            ->assertStatus(200);

        $response = $this->actingAs($this->requester)->postJson("/api/tasks/{$task->id}/cancel");
        $response->assertStatus(409);

        $task->refresh();
        $this->assertEquals('accepted', $task->status);

        $this->requester->wallet->refresh();
        $this->assertEquals(2470000, $this->requester->wallet->balance_kobo);
        $this->assertEquals(30000, $this->requester->wallet->escrow_kobo);

        $this->assertDatabaseMissing('transactions', [
            'task_id' => $task->id,
            'type' => 'escrow_refund',
        ]);
    }

    public function test_available_tasks_filters_and_prioritizes_by_runner_heading(): void
    {
        Place::firstOrCreate(['id' => 'new-main-library'], [
            'area_id' => 'buk-new',
            'name' => 'Main Library',
            'kind' => 'library',
            'lat' => 11.98056,
            'lng' => 8.47944,
        ]);
        Place::firstOrCreate(['id' => 'moremi'], [
            'area_id' => 'buk-new',
            'name' => 'Moremi Hall',
            'kind' => 'hostel',
            'lat' => 11.98056,
            'lng' => 8.47944,
        ]);

        $taskMatching = Task::create([
            'id' => 'WD-MATCH',
            'requester_id' => $this->requester->id,
            'area_id' => 'buk-new',
            'item' => 'Notebook',
            'pickup_name' => 'Faculty of Law',
            'dropoff_name' => 'Main Library',
            'dropoff_place_id' => 'new-main-library',
            'bounty_kobo' => 35000,
            'suggested_min_kobo' => 30000,
            'pin_code' => '1122',
            'status' => 'pending',
        ]);

        $taskOther = Task::create([
            'id' => 'WD-OTHER',
            'requester_id' => $this->requester->id,
            'area_id' => 'buk-new',
            'item' => 'Phone charger',
            'pickup_name' => 'Coke Village',
            'dropoff_name' => 'Moremi Hall',
            'dropoff_place_id' => 'moremi',
            'bounty_kobo' => 30000,
            'suggested_min_kobo' => 30000,
            'pin_code' => '3344',
            'status' => 'pending',
        ]);

        $response = $this->actingAs($this->runner)->getJson('/api/tasks/available?site_id=buk-new&destination=Main+Library&destination_id=new-main-library');
        $response->assertStatus(200);

        $data = $response->json();
        $this->assertEquals(2, $data['count']);
        $this->assertEquals(1, $data['on_route_count']);
        $this->assertEquals('Main Library', $data['heading']);

        $this->assertEquals('WD-MATCH', $data['tasks'][0]['id']);
        $this->assertTrue($data['tasks'][0]['on_route']);

        $this->assertEquals('WD-OTHER', $data['tasks'][1]['id']);
        $this->assertFalse($data['tasks'][1]['on_route']);
    }
}
