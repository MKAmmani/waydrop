<?php

namespace Database\Seeders;

use App\Models\Task;
use App\Models\TaskMessage;
use App\Models\Transaction;
use App\Models\User;
use App\Models\UserNotification;
use App\Models\Wallet;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class MunirAmmaniSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Locate or create Munir Ammani
        $munir = User::where('phone', '+2347082262502')
            ->orWhere('name', 'Munir Ammani')
            ->first();

        if (! $munir) {
            $munir = User::create([
                'id' => (string) Str::uuid(),
                'name' => 'Munir Ammani',
                'first_name' => 'Munir',
                'last_name' => 'Ammani',
                'phone' => '+2347082262502',
                'role' => 'user',
                'area_id' => 'buk-new',
                'runner_status' => 'verified',
                'rating' => 4.95,
                'trips_count' => 6,
                'phone_verified_at' => now(),
            ]);
        } else {
            $munir->update([
                'first_name' => 'Munir',
                'last_name' => 'Ammani',
                'name' => 'Munir Ammani',
                'area_id' => 'buk-new',
                'runner_status' => 'verified',
                'rating' => 4.95,
                'trips_count' => 6,
            ]);
        }

        // Other campus users
        $musa = User::where('first_name', 'Musa')->first() ?? $munir;
        $adaeze = User::where('first_name', 'Adaeze')->first() ?? $munir;

        $tobi = User::where('first_name', 'Tobi')->first();
        if (! $tobi) {
            $tobi = User::create([
                'id' => (string) Str::uuid(),
                'name' => 'Tobi Adeyemi',
                'first_name' => 'Tobi',
                'last_name' => 'Adeyemi',
                'phone' => '+2348022233445',
                'role' => 'runner',
                'area_id' => 'buk-new',
                'runner_status' => 'verified',
                'rating' => 4.90,
                'trips_count' => 212,
                'phone_verified_at' => now(),
            ]);
            Wallet::create([
                'user_id' => $tobi->id,
                'balance_kobo' => 350000,
                'escrow_kobo' => 0,
                'virtual_account_nuban' => '9948221045',
                'virtual_bank_name' => 'Wema Bank',
            ]);
        }

        // 2. Set Up Demo Wallet (₦25,000 Balance + ₦500 in Escrow)
        $wallet = Wallet::firstOrCreate(
            ['user_id' => $munir->id],
            [
                'id' => (string) Str::uuid(),
                'balance_kobo' => 2500000, // ₦25,000.00
                'escrow_kobo' => 50000,    // ₦500.00 held for pending task
                'virtual_account_nuban' => '9948123011',
                'virtual_bank_name' => 'Wema Bank',
            ]
        );

        $wallet->update([
            'balance_kobo' => 2500000, // ₦25,000.00
            'escrow_kobo' => 50000,    // ₦500.00
            'virtual_account_nuban' => '9948123011',
            'virtual_bank_name' => 'Wema Bank',
        ]);

        // 3. Transactions Record History
        Transaction::firstOrCreate(
            ['reference' => 'WD_DEP_'.$munir->id],
            [
                'id' => (string) Str::uuid(),
                'wallet_id' => $wallet->id,
                'type' => 'deposit',
                'amount_kobo' => 2550000,
                'balance_before_kobo' => 0,
                'balance_after_kobo' => 2550000,
                'status' => 'success',
                'metadata' => [
                    'channel' => 'bank_transfer',
                    'bank' => 'Wema Bank',
                    'sender' => 'Munir Ammani',
                ],
            ]
        );

        Transaction::firstOrCreate(
            ['reference' => 'WD_ESC_LOCK_'.$munir->id],
            [
                'id' => (string) Str::uuid(),
                'wallet_id' => $wallet->id,
                'type' => 'escrow_lock',
                'amount_kobo' => 50000,
                'balance_before_kobo' => 2550000,
                'balance_after_kobo' => 2500000,
                'status' => 'success',
                'metadata' => ['item' => 'Printed Assignment Documents'],
            ]
        );

        // 4. Seed Errands (Tasks)
        // Clean existing tasks for Munir to avoid duplicate ID collisions
        Task::where('requester_id', $munir->id)->orWhere('runner_id', $munir->id)->delete();

        // Task 0: Live Campus Errand from 04_Live_Delivery.html (Tobi Adeyemi running to LT3)
        Task::create([
            'id' => 'WD-LIVE1',
            'requester_id' => $munir->id,
            'runner_id' => $tobi->id,
            'area_id' => 'buk-new',
            'item' => 'fx-991EX Calculator',
            'note' => 'Leave at the front desk, urgent for test',
            'pickup_place_id' => null,
            'pickup_name' => 'Moremi Hall, Block B',
            'pickup_lat' => 6.5182,
            'pickup_lng' => 3.3983,
            'dropoff_place_id' => null,
            'dropoff_name' => 'LT3, Faculty of Science',
            'dropoff_lat' => 6.5160,
            'dropoff_lng' => 3.3965,
            'bounty_kobo' => 30000, // ₦300
            'suggested_min_kobo' => 30000,
            'platform_fee_kobo' => 3000,
            'pin_code' => '4821',
            'status' => 'accepted',
            'accepted_at' => now()->subMinutes(3),
            'created_at' => now()->subMinutes(6),
        ]);

        TaskMessage::create([
            'task_id' => 'WD-LIVE1',
            'sender_id' => $tobi->id,
            'sender_name' => 'Tobi',
            'text' => "Hi Munir! I'm heading over to Moremi Hall Block B now to collect your calculator.",
            'is_runner' => true,
            'created_at' => now()->subMinutes(2),
        ]);

        // Task 1: In-Progress / Accepted Errand (Musa running for Munir)
        Task::create([
            'id' => 'WD-M8K1',
            'requester_id' => $munir->id,
            'runner_id' => $musa->id,
            'area_id' => 'buk-new',
            'item' => 'Scientific Calculator & Notebook',
            'note' => 'Ask for Munir at the ground floor reading room.',
            'pickup_place_id' => 'buk-coke-village',
            'pickup_name' => 'Coke Village Hub',
            'pickup_lat' => 11.9810,
            'pickup_lng' => 8.4770,
            'dropoff_place_id' => 'buk-main-library',
            'dropoff_name' => 'Main Library',
            'dropoff_lat' => 11.9825,
            'dropoff_lng' => 8.4810,
            'bounty_kobo' => 60000, // ₦600
            'suggested_min_kobo' => 40000,
            'platform_fee_kobo' => 6000,
            'pin_code' => '4819',
            'status' => 'accepted',
            'accepted_at' => now()->subMinutes(12),
            'created_at' => now()->subMinutes(15),
        ]);

        // Task 2: Active Pending Errand (Waiting for runner match)
        Task::create([
            'id' => 'WD-M2P4',
            'requester_id' => $munir->id,
            'runner_id' => null,
            'area_id' => 'buk-new',
            'item' => 'Printed Assignment Documents',
            'note' => 'Coloured printout at the business centre next to FEG.',
            'pickup_place_id' => 'buk-faculty-engineering',
            'pickup_name' => 'Faculty of Engineering (FEG)',
            'pickup_lat' => 11.9815,
            'pickup_lng' => 8.4785,
            'dropoff_place_id' => 'buk-senate-building',
            'dropoff_name' => 'Senate Building',
            'dropoff_lat' => 11.9830,
            'dropoff_lng' => 8.4820,
            'bounty_kobo' => 50000, // ₦500
            'suggested_min_kobo' => 35000,
            'platform_fee_kobo' => 5000,
            'pin_code' => '7294',
            'status' => 'pending',
            'created_at' => now()->subMinutes(4),
        ]);

        // Task 3: Completed Errand (Keys & ID)
        Task::create([
            'id' => 'WD-M7R9',
            'requester_id' => $munir->id,
            'runner_id' => $musa->id,
            'area_id' => 'buk-new',
            'item' => 'Hostel Key & Student ID Card',
            'note' => 'Handover at the porter desk.',
            'pickup_place_id' => 'buk-ramat-hall',
            'pickup_name' => 'Ramat Hall',
            'pickup_lat' => 11.9790,
            'pickup_lng' => 8.4760,
            'dropoff_place_id' => 'buk-cbn-centre',
            'dropoff_name' => 'CBN Centre of Excellence',
            'dropoff_lat' => 11.9840,
            'dropoff_lng' => 8.4800,
            'bounty_kobo' => 80000, // ₦800
            'suggested_min_kobo' => 50000,
            'platform_fee_kobo' => 8000,
            'pin_code' => '3318',
            'status' => 'completed',
            'accepted_at' => now()->subHours(3),
            'picked_up_at' => now()->subHours(3)->addMinutes(10),
            'completed_at' => now()->subHours(2)->addMinutes(35),
            'created_at' => now()->subHours(4),
        ]);

        // Task 4: Completed Food Delivery
        Task::create([
            'id' => 'WD-M3D2',
            'requester_id' => $munir->id,
            'runner_id' => $adaeze->id,
            'area_id' => 'buk-new',
            'item' => 'Jollof Rice & Cold Zobo from Canteen',
            'note' => 'Room 214, please do not spill the drink.',
            'pickup_place_id' => 'buk-coke-village',
            'pickup_name' => 'Coke Village Hub',
            'pickup_lat' => 11.9810,
            'pickup_lng' => 8.4770,
            'dropoff_place_id' => 'buk-dangote-hall',
            'dropoff_name' => 'Dangote Hall (Male Hostel)',
            'dropoff_lat' => 11.9780,
            'dropoff_lng' => 8.4850,
            'bounty_kobo' => 45000, // ₦450
            'suggested_min_kobo' => 30000,
            'platform_fee_kobo' => 4500,
            'pin_code' => '5921',
            'status' => 'completed',
            'accepted_at' => now()->subDay()->addHours(1),
            'picked_up_at' => now()->subDay()->addHours(1)->addMinutes(12),
            'completed_at' => now()->subDay()->addHours(1)->addMinutes(28),
            'created_at' => now()->subDay(),
        ]);

        // Task 5: Munir as Runner (Delivered for Adaeze)
        Task::create([
            'id' => 'WD-M9N6',
            'requester_id' => $adaeze->id,
            'runner_id' => $munir->id,
            'area_id' => 'buk-new',
            'item' => 'Engineering Drawing Board & T-Square',
            'note' => 'Fragile board, deliver carefully to female block A.',
            'pickup_place_id' => 'buk-faculty-engineering',
            'pickup_name' => 'Faculty of Engineering (FEG)',
            'pickup_lat' => 11.9815,
            'pickup_lng' => 8.4785,
            'dropoff_place_id' => 'buk-nana-hall',
            'dropoff_name' => 'Nana Hall (Female Hostel)',
            'dropoff_lat' => 11.9800,
            'dropoff_lng' => 8.4790,
            'bounty_kobo' => 120000, // ₦1,200
            'suggested_min_kobo' => 80000,
            'platform_fee_kobo' => 12000,
            'pin_code' => '8402',
            'status' => 'completed',
            'accepted_at' => now()->subDays(2),
            'picked_up_at' => now()->subDays(2)->addMinutes(15),
            'completed_at' => now()->subDays(2)->addMinutes(38),
            'created_at' => now()->subDays(2)->subMinutes(5),
        ]);

        // 5. Seed In-App Notifications for Munir
        UserNotification::create([
            'user_id' => $munir->id,
            'type' => 'money',
            'title' => '+₦1,080 landed in your wallet',
            'body' => 'You delivered an Engineering Drawing Board to Nana Hall. Nice one.',
            'created_at' => now()->subDays(2)->addMinutes(40),
        ]);

        UserNotification::create([
            'user_id' => $munir->id,
            'type' => 'errand',
            'title' => 'Musa accepted your errand',
            'body' => 'Musa is heading to Coke Village Hub to pick up your calculator.',
            'created_at' => now()->subMinutes(12),
        ]);

        UserNotification::create([
            'user_id' => $munir->id,
            'type' => 'rating',
            'title' => 'Adaeze rated you 5 stars',
            'body' => '"Handled my drawing board with care, very polite runner!"',
            'created_at' => now()->subDays(2)->addHour(),
        ]);
    }
}
