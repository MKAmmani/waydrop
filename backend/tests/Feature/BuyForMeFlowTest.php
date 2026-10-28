<?php

namespace Tests\Feature;

use App\Models\Area;
use App\Models\Task;
use App\Models\User;
use App\Models\Wallet;
use App\Services\SquadService;
use App\Services\ZainpayService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Mockery;
use Tests\TestCase;

class BuyForMeFlowTest extends TestCase
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
            'subtitle' => 'Main Campus, Kano',
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
            'balance_kobo' => 2000000, // ₦20,000
            'escrow_kobo' => 0,
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
            'balance_kobo' => 500000, // �,�5,000
            'escrow_kobo' => 0,
        ]);

        config()->set('services.squad.secret_key', 'sandbox_sk_test');
        config()->set('services.squad.base_url', 'https://sandbox-api-d.squadco.com');
        config()->set('services.zainpay.public_key', 'zain_pk_test');
        config()->set('services.zainpay.base_url', 'https://sandbox.zainpay.ng');
        Http::fake([
            'https://sandbox-api-d.squadco.com/transaction/mandate/banklists' => Http::response([
                'status' => 200,
                'success' => true,
                'message' => 'Success',
                'data' => [
                    ['bank_code' => '000001', 'bank_name' => 'STERLING BANK PLC', 'nip_code' => '000001'],
                    ['bank_code' => '100004', 'bank_name' => 'OPAY DIGITAL SERVICES LTD', 'nip_code' => '100004'],
                ],
            ], 200),
            'https://sandbox-api-d.squadco.com/payout/account/lookup' => Http::response([
                'status' => 200,
                'success' => true,
                'message' => 'Success',
                'data' => [
                    'account_name' => 'OPAY SELLER',
                    'account_number' => '0123456789',
                    'bank_code' => '100004',
                ],
            ], 200),
            'https://sandbox.zainpay.ng/bank/list' => Http::response([
                'code' => '00',
                'description' => 'Bank list',
                'status' => '200 OK',
                'data' => [
                    ['code' => '000013', 'name' => 'GUARANTY TRUST BANK PLC'],
                    ['code' => '000044', 'name' => 'ACCESS BANK PLC'],
                ],
            ], 200),
            'https://sandbox.zainpay.ng/bank/name-enquiry?bankCode=000013&accountNumber=0123456789' => Http::response([
                'code' => '00',
                'description' => 'successful',
                'status' => '200 OK',
                'data' => [
                    'account_name' => 'MAMA TOLA STORES',
                    'account_number' => '0123456789',
                    'bank_code' => '000013',
                    'bank_name' => 'GUARANTY TRUST BANK PLC',
                ],
            ], 200),
            'https://sandbox.zainpay.ng/bank/name-enquiry?bankCode=100004&accountNumber=0123456789' => Http::response([
                'code' => '00',
                'description' => 'successful',
                'status' => '200 OK',
                'data' => [
                    'account_name' => 'Mock Account ZTYHKH',
                    'account_number' => '0123456789',
                    'bank_code' => '100004',
                ],
            ], 200),
        ]);
    }

    public function test_full_buy_for_me_lifecycle(): void
    {
        // 1. Requester creates Buy For Me errand: 6 bottles of water (₦1,800) + 10% extra (₦180) = ₦1,980 budget, ₦300 runner bounty
        Sanctum::actingAs($this->requester);
        $createRes = $this->postJson('/api/tasks', [
            'type' => 'buy',
            'item' => '6 bottles of water',
            'bounty' => 30000, // ₦300
            'budget_kobo' => 198000, // ₦1,980
            'pickup' => ['id' => 'anywhere', 'name' => 'Any shop nearby'],
            'dropoff' => ['id' => 'stadium', 'name' => 'Stadium, Block B stand'],
            'items' => [
                [
                    'name' => 'Bottled water, 75cl',
                    'qty' => 6,
                    'est' => 300,
                    'unit' => 'bottle',
                    'photo_url' => 'https://cdn.waydrop.test/water-reference.jpg',
                ],
            ],
            'rules' => ['price' => 'ask', 'stock' => 'ask'],
            'seat_photo_url' => 'https://cdn.waydrop.test/seat-view.jpg',
            'live_share' => true,
        ]);

        $createRes->assertStatus(201);
        $taskId = $createRes->json('id');
        $pin = $createRes->json('pin');
        $this->assertEquals('buy', $createRes->json('type'));
        $this->assertEquals(198000, $createRes->json('budget_kobo'));
        $this->assertTrue($createRes->json('seat_photo'));
        $createRes->assertJsonPath('items.0.photo_url', 'https://cdn.waydrop.test/water-reference.jpg');
        $this->assertDatabaseHas('tasks', [
            'id' => $taskId,
            'seat_photo_url' => 'https://cdn.waydrop.test/seat-view.jpg',
        ]);

        // Check dual escrow lock: ₦1,980 (budget) + ₦300 (bounty) = ₦2,280 held
        $reqWallet = $this->requester->fresh()->wallet;
        $this->assertEquals(228000, $reqWallet->escrow_kobo);
        $this->assertEquals(1772000, $reqWallet->balance_kobo);

        // 2. Runner accepts the errand
        Sanctum::actingAs($this->runner);
        $acceptRes = $this->postJson("/api/tasks/{$taskId}/accept", [
            'runner_id' => $this->runner->id,
        ]);
        $acceptRes->assertStatus(200);
        $this->assertEquals('accepted', $acceptRes->json('status'));
        $this->assertEquals('buy', $acceptRes->json('type'));

        // 3. Runner arrives at store and updates progress to shopping
        $progRes = $this->postJson("/api/tasks/{$taskId}/progress", [
            'phase' => 'shopping',
        ]);
        $progRes->assertStatus(200);
        $this->assertEquals('shopping', $progRes->json('status'));

        // 4. Runner triggers a price escalation ask: "Bottled water is ₦350 instead of ₦300"
        $askRes = $this->postJson("/api/tasks/{$taskId}/asks", [
            'type' => 'price',
            'item_name' => 'Bottled water, 75cl',
            'diff_kobo' => 30000, // +₦300 total diff
            'new_price_kobo' => 35000,
        ]);
        $askRes->assertStatus(201);
        $askId = $askRes->json('ask_id');
        $this->assertNotEmpty($askId);

        // 5. Requester approves the price increase (+₦300 budget)
        Sanctum::actingAs($this->requester);
        $ansRes = $this->postJson("/api/tasks/{$taskId}/asks/{$askId}", [
            'answer' => 'approve',
        ]);
        $ansRes->assertStatus(200);
        $this->assertTrue($ansRes->json('success'));
        $this->assertEquals(228000, $ansRes->json('budget_kobo'));

        // 6. Runner updates item checkoff: 6 bottles acquired
        Sanctum::actingAs($this->runner);
        $itemRes = $this->patchJson("/api/tasks/{$taskId}/items/0", [
            'got' => true,
            'price' => 35000,
        ]);
        $itemRes->assertStatus(200);
        $this->assertTrue($itemRes->json('success'));

        // 7. Runner searches and resolves the seller NUBAN account via Zainpay
        $allBanksRes = $this->getJson('/api/banks');
        $allBanksRes->assertStatus(200);
        $allBanksRes->assertJsonFragment([
            'name' => 'OPAY DIGITAL SERVICES LTD',
            'provider' => 'squad',
        ]);

        $banksRes = $this->getJson('/api/banks?q=guaranty');
        $banksRes->assertStatus(200);
        $this->assertSame('000013', $banksRes->json('banks.0.code'));
        $this->assertSame('zainpay', $banksRes->json('banks.0.provider'));

        $opayBanksRes = $this->getJson('/api/banks?q=opay');
        $opayBanksRes->assertStatus(200);
        $this->assertSame('100004', $opayBanksRes->json('banks.0.nip_code'));
        $this->assertSame('squad', $opayBanksRes->json('banks.0.provider'));

        $opayAccountRes = $this->getJson('/api/banks/resolve?account=0123456789&bank_code=100004');
        $opayAccountRes->assertStatus(200);
        $this->assertSame('Mock Account ZTYHKH', $opayAccountRes->json('account_name'));
        $this->assertSame('zainpay', $opayAccountRes->json('provider'));

        $bankRes = $this->getJson('/api/banks/resolve?account=0123456789&bank_code=000013');
        $bankRes->assertStatus(200);
        $this->assertSame('000013', $bankRes->json('bank_code'));
        $this->assertSame('MAMA TOLA STORES', $bankRes->json('account_name'));

        // 8. Runner pays the vendor via in-app transfer: �,�2,100 total
        $payRes = $this->postJson("/api/tasks/{$taskId}/vendor_payments", [
            'bank' => 'Guaranty Trust Bank',
            'bank_code' => '000013',
            'account' => '0123456789',
            'account_name' => 'MAMA TOLA STORES',
            'amount_kobo' => 210000, // �,�2,100 spent
            'receipt_photo' => 'https://cdn.waydrop.test/receipt.jpg',
        ]);
        $payRes->assertStatus(200);
        $this->assertTrue($payRes->json('success'));
        $this->assertEquals(210000, $payRes->json('spent_kobo'));
        $this->assertEquals(18000, $payRes->json('refund_kobo')); // �,�2,280 budget - �,�2,100 spent = �,�180 refund

        // Task should now be in 'bought' status with the uploaded receipt
        $task = Task::find($taskId);
        $this->assertEquals('bought', $task->status);
        $this->assertSame('https://cdn.waydrop.test/receipt.jpg', $task->vendor_payment['receipt_url']);
        $this->assertSame('000013', $task->vendor_payment['bank_code']);

        // 9. Handshake & Screen Beacon in crowd:
        // Requester turns on flashing screen beacon
        Sanctum::actingAs($this->requester);
        $beaconRes = $this->postJson("/api/tasks/{$taskId}/beacon", ['on' => true]);
        $beaconRes->assertStatus(200);
        $this->assertTrue($beaconRes->json('beacon_active'));

        // Runner requests beacon reminder
        Sanctum::actingAs($this->runner);
        $beaconReq = $this->postJson("/api/tasks/{$taskId}/beacon_request", []);
        $beaconReq->assertStatus(200);
        $this->assertTrue($beaconReq->json('success'));

        // 10. Handshake completion: Runner submits requester's 4-digit PIN
        $verifyRes = $this->postJson("/api/tasks/{$taskId}/verify_pin", [
            'pin' => $pin,
        ]);
        $verifyRes->assertStatus(200);
        $this->assertTrue($verifyRes->json('success'));
        $this->assertEquals('completed', $verifyRes->json('status'));

        // Verify wallet payouts:
        // Escrow cleared for requester
        $finalReqWallet = $this->requester->fresh()->wallet;
        $this->assertEquals(0, $finalReqWallet->escrow_kobo);
        // Requester balance: 2000000 initial - 228000 lock - 30000 ask + 18000 refund = 1760000
        $this->assertEquals(1760000, $finalReqWallet->balance_kobo);

        // Runner received bounty payment (₦300 - 10% platform fee = ₦270 = 27000 kobo)
        $finalRunnerWallet = $this->runner->fresh()->wallet;
        $this->assertEquals(500000 + 27000, $finalRunnerWallet->balance_kobo);
    }

    public function test_sandbox_mock_account_name_is_returned_by_zainpay(): void
    {
        Http::fake([
            'https://sandbox.zainpay.ng/bank/name-enquiry?bankCode=100004&accountNumber=7082262502' => Http::response([
                'code' => '00',
                'description' => 'successful',
                'status' => '200 OK',
                'data' => [
                    'account_name' => 'Mock Account ZTYHKH',
                    'account_number' => '7082262502',
                    'bank_code' => '100004',
                ],
            ], 200),
        ]);

        $response = $this->getJson('/api/banks/resolve?account=7082262502&bank_code=100004');

        $response->assertStatus(200);
        $response->assertJsonPath('account_name', 'Mock Account ZTYHKH');
        $response->assertJsonPath('provider', 'zainpay');
    }

    public function test_cash_purchase_records_receipt(): void
    {
        Sanctum::actingAs($this->requester);
        $createRes = $this->postJson('/api/tasks', [
            'type' => 'buy',
            'item' => 'Bottled water',
            'bounty' => 30000,
            'budget_kobo' => 198000,
            'pickup' => ['id' => 'anywhere', 'name' => 'Any shop nearby'],
            'dropoff' => ['id' => 'stadium', 'name' => 'Stadium, Block B stand'],
            'items' => [
                [
                    'name' => 'Bottled water, 75cl',
                    'qty' => 6,
                    'est' => 300,
                    'unit' => 'bottle',
                ],
            ],
            'rules' => ['price' => 'ask', 'stock' => 'ask'],
        ]);
        $createRes->assertStatus(201);
        $taskId = $createRes->json('id');

        Sanctum::actingAs($this->runner);

        $this->postJson("/api/tasks/{$taskId}/cash_purchases", [
            'amount_kobo' => 50000,
        ])->assertStatus(422);

        $payRes = $this->postJson("/api/tasks/{$taskId}/cash_purchases", [
            'amount_kobo' => 50000,
            'receipt_photo' => 'https://cdn.waydrop.test/cash-receipt.jpg',
        ]);
        $payRes->assertStatus(200);
        $this->assertTrue($payRes->json('success'));
        $this->assertEquals(50000, $payRes->json('reimbursable_kobo'));
        $this->assertEquals('bought', Task::find($taskId)->status);
        $this->assertSame('https://cdn.waydrop.test/cash-receipt.jpg', Task::find($taskId)->cash_purchase['receipt_url']);
    }

    public function test_account_lookup_uses_zainpay_even_when_a_legacy_squad_provider_is_supplied(): void
    {
        $squad = Mockery::mock(SquadService::class);
        $squad->shouldNotReceive('resolveAccount');
        $this->app->instance(SquadService::class, $squad);

        $zainpay = Mockery::mock(ZainpayService::class);
        $zainpay->shouldReceive('validateAccount')
            ->once()
            ->with('7082262502', '100004')
            ->andReturn([
                'success' => true,
                'data' => [
                    'account_name' => 'OPAY SELLER',
                    'account_number' => '7082262502',
                    'bank_code' => '100004',
                ],
            ]);
        $this->app->instance(ZainpayService::class, $zainpay);

        $response = $this->getJson('/api/banks/resolve?account=7082262502&bank_code=100004&provider=squad');

        $response->assertStatus(200);
        $this->assertSame('OPAY SELLER', $response->json('account_name'));
        $this->assertSame('zainpay', $response->json('provider'));
    }
}
