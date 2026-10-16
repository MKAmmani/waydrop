<?php

namespace Database\Seeders;

use App\Models\Area;
use App\Models\PlatformRule;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Initial Campus Area for Campus Admin assignment
        Area::firstOrCreate(
            ['id' => 'buk-new'],
            [
                'name' => 'BUK New Site',
                'subtitle' => 'Main Campus, Gwarzo Road, Kano',
                'lat' => 11.980560,
                'lng' => 8.479440,
                'radius_meters' => 3500,
                'is_active' => true,
            ]
        );

        // 2. Default System Platform Configuration Rules
        $rules = [
            ['key' => 'min_bounty_kobo', 'value' => '20000', 'group' => 'pricing', 'title' => 'Minimum Bounty (₦)', 'description' => 'Base price floor for errands across all campuses'],
            ['key' => 'platform_fee_percent', 'value' => '10', 'group' => 'pricing', 'title' => 'Platform Service Commission (%)', 'description' => 'Waydrop operational cut deducted on successful completion'],
            ['key' => 'max_pin_attempts', 'value' => '5', 'group' => 'safety', 'title' => 'Max Wrong Handshake PIN Attempts', 'description' => 'Number of failed PIN attempts before errand is locked for dispute'],
            ['key' => 'offer_ttl_seconds', 'value' => '25', 'group' => 'matching', 'title' => 'Offer Timer for Walkers (s)', 'description' => 'How long a matching runner has to accept before errand rotates'],
            ['key' => 'crew_after_seconds', 'value' => '90', 'group' => 'matching', 'title' => 'Dispatch to Crew After (s)', 'description' => 'Unmatched errands automatically route to on-shift Campus Crew'],
            ['key' => 'cash_cap_kobo', 'value' => '300000', 'group' => 'pricing', 'title' => 'Cash Purchase Cap (₦)', 'description' => 'Maximum cash value a runner can front for buy-for-me errands'],
            ['key' => 'kyc_auto_confidence_threshold', 'value' => '85', 'group' => 'kyc', 'title' => 'Smile ID Auto-Approval Threshold (%)', 'description' => 'Facial match percentage required for automated KYC green-flagging'],
            ['key' => 'landmark_bounty_kobo', 'value' => '5000', 'group' => 'pricing', 'title' => 'Student Landmark Bounty (₦50)', 'description' => 'Automatic wallet credit awarded to student when a suggested place is verified'],
        ];

        foreach ($rules as $r) {
            PlatformRule::firstOrCreate(['key' => $r['key']], $r);
        }

        // 3. Super Administrator (HQ National Control)
        $superAdmin = User::firstOrCreate(
            ['email' => 'superadmin@waydrop.ng'],
            [
                'name' => 'Waydrop Headquarters',
                'first_name' => 'HQ',
                'last_name' => 'SuperAdmin',
                'phone' => '+2348000000000',
                'role' => 'super_admin',
                'runner_status' => 'verified',
                'password' => Hash::make('password123'),
                'area_id' => null,
                'phone_verified_at' => now(),
                'email_verified_at' => now(),
            ]
        );

        Wallet::firstOrCreate(
            ['user_id' => $superAdmin->id],
            [
                'balance_kobo' => 100000000,
                'escrow_kobo' => 0,
                'virtual_bank_name' => 'Squad GTCO Master Escrow',
                'virtual_account_nuban' => '8010000001',
            ]
        );

        // 4. Campus Lead Administrator (Local Campus Control)
        $campusAdmin = User::firstOrCreate(
            ['email' => 'admin@waydrop.ng'],
            [
                'name' => 'BUK Desk Lead',
                'first_name' => 'Musa',
                'last_name' => 'Ibrahim',
                'phone' => '+2348000000001',
                'role' => 'admin',
                'runner_status' => 'verified',
                'password' => Hash::make('password123'),
                'area_id' => 'buk-new',
                'phone_verified_at' => now(),
                'email_verified_at' => now(),
            ]
        );

        Wallet::firstOrCreate(
            ['user_id' => $campusAdmin->id],
            [
                'balance_kobo' => 50000000,
                'escrow_kobo' => 0,
                'virtual_bank_name' => 'Squad GTCO Escrow',
                'virtual_account_nuban' => '8019994821',
            ]
        );
    }
}
