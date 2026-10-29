<?php

namespace Tests\Feature;

use App\Models\Area;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Area::firstOrCreate(
            ['id' => 'buk-new'],
            [
                'name' => 'BUK New Site',
                'subtitle' => 'Main Campus, Kano',
                'lat' => 11.980560,
                'lng' => 8.479440,
                'radius_meters' => 3500,
                'is_active' => true,
            ]
        );
    }

    public function test_request_otp_generates_code(): void
    {
        $response = $this->postJson('/api/auth/otp/request', [
            'phone' => '08031234567',
        ]);

        $response->assertStatus(200);
        $response->assertJsonStructure(['expires_in', 'resend_after']);
    }

    public function test_new_user_registration_then_returning_user_login(): void
    {
        // 1. Request OTP
        $this->postJson('/api/auth/otp/request', ['phone' => '08031234567']);

        // 2. Verify with test master code 123456
        $verifyRes = $this->postJson('/api/auth/otp/verify', [
            'phone' => '08031234567',
            'code' => '123456',
        ]);

        $verifyRes->assertStatus(200);
        $verifyRes->assertJson([
            'is_new_user' => true,
        ]);
        $this->assertEquals(500000, $verifyRes->json('me.wallet.balance_kobo'));
        $token = $verifyRes->json('access_token');
        $this->assertNotEmpty($token);

        $user = User::where('phone', '+2348031234567')->firstOrFail();
        $this->assertEquals(500000, $user->wallet->balance_kobo);
        $this->assertDatabaseHas('transactions', [
            'wallet_id' => $user->wallet->id,
            'type' => 'deposit',
            'amount_kobo' => 500000,
            'balance_after_kobo' => 500000,
        ]);

        // 3. User updates profile with name and campus
        $patchRes = $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson('/api/me', [
                'first_name' => 'Chidi',
                'last_name' => 'Nwosu',
                'area_id' => 'buk-new',
            ]);

        $patchRes->assertStatus(200);
        $this->assertEquals('Chidi', $patchRes->json('first_name'));
        $this->assertEquals('buk-new', $patchRes->json('area_id'));

        // 4. Logging in again with the same phone number
        $this->postJson('/api/auth/otp/request', ['phone' => '08031234567']);
        $returningRes = $this->postJson('/api/auth/otp/verify', [
            'phone' => '08031234567',
            'code' => '123456',
        ]);

        $returningRes->assertStatus(200);
        // User now has complete profile, so is_new_user is FALSE (returning user)
        $this->assertFalse($returningRes->json('is_new_user'));
        $this->assertEquals('Chidi', $returningRes->json('me.first_name'));
        $this->assertEquals('buk-new', $returningRes->json('me.area_id'));
    }

    public function test_google_oauth_registration_and_phone_linking(): void
    {
        $payload = rtrim(strtr(base64_encode(json_encode([
            'email' => 'amina.kane@gmail.com',
            'given_name' => 'Amina',
            'family_name' => 'Kane',
            'sub' => 'google_sub_987654',
        ])), '+/', '-_'), '=');
        $jwt = "eyJhbGciOiJSUzI1NiJ9.{$payload}.sig";

        // 1. Google OAuth
        $oauthRes = $this->postJson('/api/auth/oauth', [
            'provider' => 'google',
            'id_token' => $jwt,
        ]);

        $oauthRes->assertStatus(200);
        $this->assertTrue($oauthRes->json('needs_phone'));
        $this->assertEquals(500000, $oauthRes->json('me.wallet.balance_kobo'));
        $token = $oauthRes->json('access_token');

        // 2. Link phone number via OTP
        $this->postJson('/api/auth/otp/request', ['phone' => '08099887766']);
        $verifyRes = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/auth/otp/verify', [
                'phone' => '08099887766',
                'code' => '123456',
            ]);

        $verifyRes->assertStatus(200);
        $this->assertEquals('Amina', $verifyRes->json('me.first_name'));

        // 3. User sets area
        $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson('/api/me', ['area_id' => 'buk-new']);

        // 4. Subsequent Google OAuth recognizes existing user with linked phone
        $secondOauth = $this->postJson('/api/auth/oauth', [
            'provider' => 'google',
            'id_token' => $jwt,
        ]);

        $secondOauth->assertStatus(200);
        // Phone already linked!
        $this->assertFalse($secondOauth->json('needs_phone'));
        $this->assertEquals('Amina', $secondOauth->json('me.first_name'));
        $this->assertEquals('buk-new', $secondOauth->json('me.area_id'));
    }

    public function test_new_registered_user_receives_500000_kobo_wallet_balance(): void
    {
        $this->postJson('/api/auth/otp/request', ['phone' => '08123456789']);

        $verifyRes = $this->postJson('/api/auth/otp/verify', [
            'phone' => '08123456789',
            'code' => '123456',
        ]);

        $verifyRes->assertStatus(200);
        $this->assertTrue($verifyRes->json('is_new_user'));
        $this->assertSame(500000, $verifyRes->json('me.wallet.balance_kobo'));

        $token = $verifyRes->json('access_token');

        // Check via /api/me
        $meRes = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/me');
        $meRes->assertStatus(200);
        $this->assertSame(500000, $meRes->json('wallet.balance_kobo'));

        // Check via /api/home (where it represents ₦5,000)
        $homeRes = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/home?site=buk-new');
        $homeRes->assertStatus(200);
        $this->assertSame(500000, $homeRes->json('balance'));
        $this->assertSame(500000, $homeRes->json('wallet.balance_kobo'));
    }
}
