<?php

namespace Tests\Feature;

use App\Models\Area;
use App\Models\Payout;
use App\Models\Transaction;
use App\Models\User;
use App\Services\PlatformRevenueService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlatformRevenueTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;

    protected User $admin;

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

        $this->superAdmin = User::create([
            'name' => 'Waydrop HQ',
            'email' => 'superadmin@example.test',
            'role' => 'super_admin',
            'runner_status' => 'verified',
        ]);

        $this->admin = User::create([
            'name' => 'Campus Admin',
            'email' => 'admin@example.test',
            'role' => 'admin',
            'area_id' => 'buk-new',
            'runner_status' => 'verified',
        ]);

        app(PlatformRevenueService::class)->wallet()->update(['balance_kobo' => 100000]);
    }

    public function test_super_admin_sees_platform_revenue_card_and_fee_ledger(): void
    {
        $wallet = app(PlatformRevenueService::class)->wallet();

        Transaction::create([
            'wallet_id' => $wallet->id,
            'type' => 'fee',
            'amount_kobo' => 4500,
            'balance_before_kobo' => 0,
            'balance_after_kobo' => 4500,
            'reference' => 'WD_FEE_UI_TEST',
            'status' => 'success',
            'metadata' => ['task_id' => null, 'fee_kobo' => 4500],
        ]);

        $response = $this->actingAs($this->superAdmin)->get('/desk/today');

        $response->assertOk()
            ->assertSee('Platform revenue')
            ->assertSee('Super admin only')
            ->assertSee('45.00')
            ->assertSee('Commission');
    }

    public function test_non_super_admin_cannot_see_platform_revenue(): void
    {
        $response = $this->actingAs($this->admin)->get('/desk/today');

        $response->assertOk()
            ->assertDontSee('Platform revenue')
            ->assertDontSee('Super admin only');
    }

    public function test_super_admin_can_withdraw_platform_revenue(): void
    {
        $wallet = app(PlatformRevenueService::class)->wallet();

        $response = $this->actingAs($this->superAdmin)->post('/desk/revenue/withdraw', [
            'amount' => 250,
            'bank_name' => 'GTBank',
            'bank_code' => '058',
            'account_number' => '0123456789',
            'account_name' => 'Waydrop Technologies',
        ]);

        $response->assertRedirect()->assertSessionHas('success');

        $this->assertEquals(75000, $wallet->fresh()->balance_kobo);

        $this->assertDatabaseHas('transactions', [
            'wallet_id' => $wallet->id,
            'type' => 'withdrawal',
            'amount_kobo' => 25000,
            'balance_before_kobo' => 100000,
            'balance_after_kobo' => 75000,
        ]);

        $this->assertDatabaseHas('payouts', [
            'user_id' => $wallet->user_id,
            'amount_kobo' => 25000,
            'bank_name' => 'GTBank',
            'account_number' => '0123456789',
            'status' => 'success',
        ]);
    }

    public function test_non_super_admin_cannot_withdraw_platform_revenue(): void
    {
        $wallet = app(PlatformRevenueService::class)->wallet();

        $response = $this->actingAs($this->admin)->post('/desk/revenue/withdraw', [
            'amount' => 250,
            'bank_name' => 'GTBank',
            'bank_code' => '058',
            'account_number' => '0123456789',
            'account_name' => 'Waydrop Technologies',
        ]);

        $response->assertForbidden();

        $this->assertEquals(100000, $wallet->fresh()->balance_kobo);
        $this->assertEquals(0, Transaction::where('type', 'withdrawal')->count());
        $this->assertEquals(0, Payout::count());
    }

    public function test_cannot_withdraw_more_than_the_platform_balance(): void
    {
        $wallet = app(PlatformRevenueService::class)->wallet();

        $response = $this->actingAs($this->superAdmin)->post('/desk/revenue/withdraw', [
            'amount' => 2000,
            'bank_name' => 'GTBank',
            'bank_code' => '058',
            'account_number' => '0123456789',
            'account_name' => 'Waydrop Technologies',
        ]);

        $response->assertSessionHasErrors('amount');

        $this->assertEquals(100000, $wallet->fresh()->balance_kobo);
        $this->assertEquals(0, Transaction::where('type', 'withdrawal')->count());
        $this->assertEquals(0, Payout::count());
    }

    public function test_platform_account_and_failed_payouts_are_hidden_from_non_super_admins(): void
    {
        $wallet = app(PlatformRevenueService::class)->wallet();

        Payout::create([
            'user_id' => $wallet->user_id,
            'amount_kobo' => 50000,
            'bank_name' => 'GTBank',
            'bank_code' => '058',
            'account_number' => '0123456789',
            'account_name' => 'Waydrop Platform Revenue',
            'status' => 'failed',
            'failure_reason' => 'Bank rejected transfer.',
        ]);

        $this->actingAs($this->admin)->get('/desk/people')
            ->assertOk()
            ->assertDontSee($wallet->user->name)
            ->assertDontSee('Waydrop Platform Revenue');

        $this->actingAs($this->admin)->get('/desk/queue')
            ->assertOk()
            ->assertDontSee('Withdrawal failed: Waydrop Platform Revenue');

        $this->actingAs($this->admin)->get('/desk/payouts')
            ->assertOk()
            ->assertDontSee('Waydrop Platform Revenue');

        $this->actingAs($this->admin)->post("/desk/users/{$wallet->user_id}/status", [
            'action' => 'block',
            'reason' => 'Testing access guard',
        ])->assertForbidden();
    }

    public function test_super_admin_can_see_platform_failed_payouts(): void
    {
        $wallet = app(PlatformRevenueService::class)->wallet();

        Payout::create([
            'user_id' => $wallet->user_id,
            'amount_kobo' => 50000,
            'bank_name' => 'GTBank',
            'bank_code' => '058',
            'account_number' => '0123456789',
            'account_name' => 'Waydrop Platform Revenue',
            'status' => 'failed',
            'failure_reason' => 'Bank rejected transfer.',
        ]);

        $this->actingAs($this->superAdmin)->get('/desk/people')
            ->assertOk()
            ->assertSee('Waydrop Platform Revenue');

        $this->actingAs($this->superAdmin)->get('/desk/queue')
            ->assertOk()
            ->assertSee('Withdrawal failed: Waydrop Platform Revenue');

        $this->actingAs($this->superAdmin)->get('/desk/payouts')
            ->assertOk()
            ->assertSee('Waydrop Platform Revenue');
    }
}
