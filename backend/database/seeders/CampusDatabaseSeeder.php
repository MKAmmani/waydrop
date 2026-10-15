<?php

namespace Database\Seeders;

use App\Models\Area;
use App\Models\Dispute;
use App\Models\Payout;
use App\Models\Place;
use App\Models\PlatformRule;
use App\Models\RunnerVerification;
use App\Models\Task;
use App\Models\TaskActivity;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class CampusDatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Campus Areas
        $bukNew = Area::create([
            'id' => 'buk-new',
            'name' => 'BUK New Site',
            'subtitle' => 'Main campus, Gwarzo Road',
            'lat' => 11.980560,
            'lng' => 8.479440,
            'radius_meters' => 3500,
            'is_active' => true,
        ]);

        $bukOld = Area::create([
            'id' => 'buk-old',
            'name' => 'BUK Old Site',
            'subtitle' => 'BUK Road, by Kabuga gate',
            'lat' => 11.995500,
            'lng' => 8.517000,
            'radius_meters' => 2500,
            'is_active' => true,
        ]);

        Area::create([
            'id' => 'buk-akth',
            'name' => 'AKTH',
            'subtitle' => 'Aminu Kano Teaching Hospital (medical students)',
            'lat' => 11.975000,
            'lng' => 8.530000,
            'radius_meters' => 1500,
            'is_active' => true,
        ]);

        // 2. Campus Places & Landmarks (from BUK master registry)
        $places = [
            ['id' => 'new-main-library', 'area_id' => 'buk-new', 'name' => 'Main Library', 'aka' => ['Central Library'], 'kind' => 'library', 'lat' => 11.98056, 'lng' => 8.47944, 'confirmed' => true],
            ['id' => 'new-agric-library', 'area_id' => 'buk-new', 'name' => 'Agric Library', 'aka' => ['Faculty of Agriculture Library'], 'kind' => 'library', 'lat' => 11.98210, 'lng' => 8.48120, 'confirmed' => true],
            ['id' => 'new-engineering-library', 'area_id' => 'buk-new', 'name' => 'Engineering Library', 'aka' => ['FEG Library'], 'kind' => 'library', 'lat' => 11.97920, 'lng' => 8.47540, 'confirmed' => true],
            ['id' => 'new-law-library', 'area_id' => 'buk-new', 'name' => 'Law Library', 'aka' => ['Faculty of Law'], 'kind' => 'library', 'lat' => 11.98400, 'lng' => 8.47700, 'confirmed' => true],
            ['id' => 'new-sms-library', 'area_id' => 'buk-new', 'name' => 'SMS Library', 'aka' => ['Social & Management Sciences Library'], 'kind' => 'library', 'lat' => 11.98150, 'lng' => 8.48300, 'confirmed' => true],
            ['id' => 'new-cbn-centre', 'area_id' => 'buk-new', 'name' => 'CBN Centre of Excellence', 'aka' => ['CBN Hostel'], 'kind' => 'landmark', 'lat' => 11.98350, 'lng' => 8.48600, 'confirmed' => true, 'note' => 'Includes post-grad accommodation'],
            ['id' => 'coke-village', 'area_id' => 'buk-new', 'name' => 'Coke Village', 'aka' => ['School Market', 'Coke Spot'], 'kind' => 'market', 'lat' => 11.98010, 'lng' => 8.47820, 'confirmed' => false, 'note' => 'Student hangout & lunch hub'],
            ['id' => 'old-new-hall', 'area_id' => 'buk-old', 'name' => 'New Hall', 'aka' => ['Female Hostel New Hall'], 'kind' => 'hostel', 'lat' => 11.99600, 'lng' => 8.51650, 'confirmed' => true, 'note' => 'Female residential hall'],
            ['id' => 'old-sciences-library', 'area_id' => 'buk-old', 'name' => 'Sciences Library', 'aka' => ['FAS Library'], 'kind' => 'library', 'lat' => 11.99500, 'lng' => 8.51800, 'confirmed' => true],
            ['id' => 'old-kabuga-gate', 'area_id' => 'buk-old', 'name' => 'Kabuga Gate', 'aka' => ['Main Gate Old Site'], 'kind' => 'gate', 'lat' => 11.99400, 'lng' => 8.51500, 'confirmed' => true],
        ];

        foreach ($places as $placeData) {
            Place::create($placeData);
        }

        // 3. Platform Rules
        $rules = [
            ['key' => 'min_bounty_kobo', 'value' => '20000', 'group' => 'pricing', 'title' => 'Minimum Bounty (₦)', 'description' => 'Base price floor for errands across all campuses'],
            ['key' => 'platform_fee_percent', 'value' => '10', 'group' => 'pricing', 'title' => 'Platform Service Commission (%)', 'description' => 'Waydrop operational cut deducted on successful completion'],
            ['key' => 'max_pin_attempts', 'value' => '5', 'group' => 'safety', 'title' => 'Max Wrong Handshake PIN Attempts', 'description' => 'Number of failed PIN attempts before errand is locked for dispute'],
            ['key' => 'kyc_auto_confidence_threshold', 'value' => '85', 'group' => 'kyc', 'title' => 'Smile ID / Prembly Auto-Approval Threshold (%)', 'description' => 'Facial match percentage required for automated KYC green-flagging'],
            ['key' => 'kyc_name_match_threshold', 'value' => '80', 'group' => 'kyc', 'title' => 'NUBAN Name Match Threshold (%)', 'description' => 'String similarity required between student ID and resolved bank account'],
            ['key' => 'landmark_bounty_kobo', 'value' => '5000', 'group' => 'pricing', 'title' => 'Student Landmark Bounty (₦50)', 'description' => 'Automatic wallet credit awarded to student when a suggested place is verified'],
        ];

        foreach ($rules as $r) {
            PlatformRule::create($r);
        }

        // 4. Admin & Staff Accounts
        $admin = User::create([
            'name' => 'Waydrop Operations',
            'first_name' => 'Desk',
            'last_name' => 'Admin',
            'email' => 'admin@waydrop.ng',
            'phone' => '+2348000000001',
            'role' => 'admin',
            'runner_status' => 'verified',
            'password' => Hash::make('password123'),
            'area_id' => 'buk-new',
            'phone_verified_at' => now(),
            'email_verified_at' => now(),
        ]);

        Wallet::create([
            'user_id' => $admin->id,
            'balance_kobo' => 50000000, // ₦500,000 platform escrow float
            'escrow_kobo' => 0,
            'virtual_bank_name' => 'Squad GTCO Escrow',
            'virtual_account_nuban' => '8019994821',
        ]);

        // 5. Sample Students & Runners
        $requester = User::create([
            'name' => 'Halima Bello',
            'first_name' => 'Halima',
            'last_name' => 'Bello',
            'email' => 'halima@buk.edu.ng',
            'phone' => '+2348031234567',
            'role' => 'student',
            'runner_status' => 'unverified',
            'password' => Hash::make('secret123'),
            'area_id' => 'buk-new',
            'rating' => 4.95,
            'trips_count' => 14,
            'phone_verified_at' => now(),
        ]);

        Wallet::create([
            'user_id' => $requester->id,
            'balance_kobo' => 850000, // ₦8,500
            'escrow_kobo' => 100000,  // ₦1,000 locked
            'virtual_bank_name' => 'Wema Bank',
            'virtual_account_nuban' => '9948123011',
        ]);

        $runner = User::create([
            'name' => 'Umar Farouk',
            'first_name' => 'Umar',
            'last_name' => 'Farouk',
            'email' => 'umar@buk.edu.ng',
            'phone' => '+2348123456789',
            'role' => 'runner',
            'runner_status' => 'verified',
            'password' => Hash::make('secret123'),
            'area_id' => 'buk-new',
            'rating' => 4.88,
            'trips_count' => 42,
            'phone_verified_at' => now(),
        ]);

        Wallet::create([
            'user_id' => $runner->id,
            'balance_kobo' => 345000, // ₦3,450
            'escrow_kobo' => 0,
            'virtual_bank_name' => 'OPay',
            'virtual_account_nuban' => '8123456789',
        ]);

        // Runner Verification
        RunnerVerification::create([
            'user_id' => $runner->id,
            'campus_id' => 'buk-new',
            'faculty' => 'Faculty of Computing',
            'department' => 'Software Engineering',
            'matric_number' => 'CST/22/SWE/00219',
            'document_type' => 'student_id_card',
            'document_url' => 'https://pub-r2.waydrop.app/demo/id_card_sample.jpg',
            'selfie_url' => 'https://pub-r2.waydrop.app/demo/selfie_sample.jpg',
            'payout_bank_code' => '999992', // OPay
            'payout_account_number' => '8123456789',
            'payout_account_name' => 'UMAR FAROUK SULEIMAN',
            'name_match_score' => 96.00,
            'biometric_provider' => 'smile_id',
            'biometric_job_id' => 'JOB_SM_918204',
            'biometric_confidence' => 98.40,
            'biometric_liveness_passed' => true,
            'status' => 'approved',
            'reviewed_by' => $admin->id,
            'reviewed_at' => now()->subDays(3),
        ]);

        // KYC Pending Applicant (for KYC desk)
        $applicant = User::create([
            'name' => 'Fatima Dahiru',
            'first_name' => 'Fatima',
            'last_name' => 'Dahiru',
            'email' => 'fatima@buk.edu.ng',
            'phone' => '+2348149988776',
            'role' => 'student',
            'runner_status' => 'pending',
            'area_id' => 'buk-new',
            'rating' => 5.00,
            'trips_count' => 0,
            'phone_verified_at' => now(),
        ]);

        Wallet::create([
            'user_id' => $applicant->id,
            'balance_kobo' => 200000,
            'escrow_kobo' => 0,
        ]);

        RunnerVerification::create([
            'user_id' => $applicant->id,
            'campus_id' => 'buk-new',
            'faculty' => 'Faculty of Allied Health Sciences',
            'department' => 'Nursing',
            'matric_number' => 'AHS/23/NUR/00104',
            'document_type' => 'portal_crf',
            'document_url' => 'https://pub-r2.waydrop.app/demo/crf_sample.jpg',
            'selfie_url' => 'https://pub-r2.waydrop.app/demo/selfie_fatima.jpg',
            'payout_bank_code' => '058', // GTBank
            'payout_account_number' => '0291823741',
            'payout_account_name' => 'FATIMA ALIYU DAHIRU',
            'name_match_score' => 91.50,
            'biometric_provider' => 'smile_id',
            'biometric_job_id' => 'JOB_SM_928114',
            'biometric_confidence' => 94.20,
            'biometric_liveness_passed' => true,
            'status' => 'ai_verified', // Ready for 1-click admin approval
        ]);

        // 6. Sample Active & Locked Tasks
        // Active Task (Picked Up)
        Task::create([
            'id' => 'WD-9182',
            'requester_id' => $requester->id,
            'runner_id' => $runner->id,
            'area_id' => 'buk-new',
            'item' => 'Scientific Calculator (Casio fx-991EX)',
            'note' => 'Call when outside Faculty of Computing',
            'pickup_place_id' => 'new-main-library',
            'pickup_name' => 'Main Library Ground Floor',
            'pickup_lat' => 11.98056,
            'pickup_lng' => 8.47944,
            'dropoff_place_id' => 'new-engineering-library',
            'dropoff_name' => 'FEG Library Entrance',
            'dropoff_lat' => 11.97920,
            'dropoff_lng' => 8.47540,
            'bounty_kobo' => 50000, // ₦500
            'suggested_min_kobo' => 35000,
            'platform_fee_kobo' => 5000,
            'pin_code' => '4829', // Encrypted AES-256
            'pin_attempts' => 1,
            'status' => 'picked_up',
            'accepted_at' => now()->subMinutes(25),
            'picked_up_at' => now()->subMinutes(12),
        ]);

        // Locked Handover Task (5 wrong attempts -> disputed)
        $lockedTask = Task::create([
            'id' => 'WD-5021',
            'requester_id' => $requester->id,
            'runner_id' => $runner->id,
            'area_id' => 'buk-new',
            'item' => 'Anatomy Textbook (Keith Moore)',
            'note' => 'Deliver to Room 14 New Hall',
            'pickup_place_id' => 'new-sms-library',
            'pickup_name' => 'SMS Library',
            'dropoff_place_id' => 'old-new-hall',
            'dropoff_name' => 'New Hall Doorstep',
            'bounty_kobo' => 60000, // ₦600
            'suggested_min_kobo' => 45000,
            'platform_fee_kobo' => 6000,
            'pin_code' => '7130',
            'pin_attempts' => 5, // Exhausted!
            'status' => 'disputed',
            'accepted_at' => now()->subHours(2),
            'picked_up_at' => now()->subHour(),
        ]);

        TaskActivity::create([
            'task_id' => 'WD-5021',
            'actor_id' => $runner->id,
            'event' => 'locked',
            'metadata' => ['reason' => 'PIN entry failed 5 times at dropoff location', 'lat' => 11.9960, 'lng' => 8.5165],
            'created_at' => now()->subMinutes(40),
        ]);

        // Dispute Entry for WD-5021
        Dispute::create([
            'task_id' => 'WD-5021',
            'requester_id' => $requester->id,
            'runner_id' => $runner->id,
            'opened_by' => $runner->id,
            'reason' => 'pin_lockout',
            'explanation' => 'Recipient gave me 3 different PINs, all incorrect. They had someone else collect the book.',
            'held_amount_kobo' => 60000,
            'status' => 'open',
            'sla_expires_at' => now()->addMinutes(35),
        ]);

        // 7. Sample Failed Payout
        Payout::create([
            'user_id' => $runner->id,
            'amount_kobo' => 150000, // ₦1,500
            'bank_name' => 'OPay (PayCom)',
            'bank_code' => '999992',
            'account_number' => '8123456789',
            'account_name' => 'UMAR FAROUK SULEIMAN',
            'status' => 'failed',
            'gateway_provider' => 'squad',
            'failure_reason' => 'NIP bank switch timeout (Issuer unavailable)',
            'retry_count' => 2,
            'last_attempt_at' => now()->subMinutes(18),
        ]);
    }
}
