<?php

namespace Database\Seeders;

use App\Models\Area;
use App\Models\AuditLog;
use App\Models\CrewShift;
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
        // 1. Campus & Community Areas
        $areas = [
            ['id' => 'buk-new', 'name' => 'BUK New Site', 'subtitle' => 'Main campus, Gwarzo Road, Kano', 'lat' => 11.980560, 'lng' => 8.479440, 'radius_meters' => 3500, 'is_active' => true],
            ['id' => 'buk-old', 'name' => 'BUK Old Site', 'subtitle' => 'BUK Road, by Kabuga gate, Kano', 'lat' => 11.995500, 'lng' => 8.517000, 'radius_meters' => 2500, 'is_active' => true],
            ['id' => 'buk-akth', 'name' => 'AKTH', 'subtitle' => 'Aminu Kano Teaching Hospital (medical students)', 'lat' => 11.975000, 'lng' => 8.530000, 'radius_meters' => 1500, 'is_active' => true],
            ['id' => 'unilag', 'name' => 'UNILAG Akoka', 'subtitle' => 'Main Campus, Akoka, Yaba, Lagos', 'lat' => 6.517300, 'lng' => 3.387100, 'radius_meters' => 3000, 'is_active' => true],
            ['id' => 'oau', 'name' => 'Obafemi Awolowo University', 'subtitle' => 'Ile-Ife, Osun', 'lat' => 7.518500, 'lng' => 4.526300, 'radius_meters' => 3500, 'is_active' => true],
            ['id' => 'ui', 'name' => 'University of Ibadan', 'subtitle' => 'Ibadan, Oyo', 'lat' => 7.444300, 'lng' => 3.899600, 'radius_meters' => 3000, 'is_active' => true],
            ['id' => 'abu', 'name' => 'Ahmadu Bello University', 'subtitle' => 'Samaru, Zaria, Kaduna', 'lat' => 11.151400, 'lng' => 7.654300, 'radius_meters' => 4000, 'is_active' => true],
            ['id' => 'unn', 'name' => 'University of Nigeria', 'subtitle' => 'Nsukka, Enugu', 'lat' => 6.867500, 'lng' => 7.408500, 'radius_meters' => 3500, 'is_active' => true],
            ['id' => 'cu', 'name' => 'Covenant University', 'subtitle' => 'Ota, Ogun', 'lat' => 6.671800, 'lng' => 3.158000, 'radius_meters' => 2500, 'is_active' => true],
            ['id' => 'unilorin', 'name' => 'University of Ilorin', 'subtitle' => 'Ilorin, Kwara', 'lat' => 8.479900, 'lng' => 4.673900, 'radius_meters' => 3500, 'is_active' => true],
            ['id' => 'yaba', 'name' => 'Yaba', 'subtitle' => 'Lagos Mainland', 'lat' => 6.509500, 'lng' => 3.371100, 'radius_meters' => 2000, 'is_active' => true],
            ['id' => 'lekki', 'name' => 'Lekki Phase 1', 'subtitle' => 'Eti-Osa, Lagos', 'lat' => 6.447400, 'lng' => 3.472300, 'radius_meters' => 2500, 'is_active' => true],
            ['id' => 'wuse', 'name' => 'Wuse 2', 'subtitle' => 'Abuja', 'lat' => 9.076500, 'lng' => 7.476600, 'radius_meters' => 2500, 'is_active' => true],
            ['id' => 'bodija', 'name' => 'Bodija', 'subtitle' => 'Ibadan, Oyo', 'lat' => 7.426900, 'lng' => 3.911600, 'radius_meters' => 2000, 'is_active' => true],
        ];

        foreach ($areas as $a) {
            Area::firstOrCreate(['id' => $a['id']], $a);
        }

        // 2. Campus Places & Landmarks
        $places = [
            ['id' => 'new-main-library', 'area_id' => 'buk-new', 'name' => 'Main Library', 'aka' => ['Central Library'], 'kind' => 'library', 'lat' => 11.98056, 'lng' => 8.47944, 'confirmed' => true],
            ['id' => 'new-agric-library', 'area_id' => 'buk-new', 'name' => 'Agric Library', 'aka' => ['Faculty of Agriculture Library'], 'kind' => 'library', 'lat' => 11.98210, 'lng' => 8.48120, 'confirmed' => true],
            ['id' => 'new-engineering-library', 'area_id' => 'buk-new', 'name' => 'Engineering Library', 'aka' => ['FEG Library'], 'kind' => 'library', 'lat' => 11.97920, 'lng' => 8.47540, 'confirmed' => true],
            ['id' => 'new-law-library', 'area_id' => 'buk-new', 'name' => 'Law Library', 'aka' => ['Faculty of Law'], 'kind' => 'library', 'lat' => 11.98400, 'lng' => 8.47700, 'confirmed' => true],
            ['id' => 'new-sms-library', 'area_id' => 'buk-new', 'name' => 'SMS Library', 'aka' => ['Social & Management Sciences Library'], 'kind' => 'library', 'lat' => 11.98150, 'lng' => 8.48300, 'confirmed' => true],
            ['id' => 'new-cbn-centre', 'area_id' => 'buk-new', 'name' => 'CBN Centre of Excellence', 'aka' => ['CBN Hostel'], 'kind' => 'landmark', 'lat' => 11.98350, 'lng' => 8.48600, 'confirmed' => true, 'note' => 'Includes post-grad accommodation'],
            ['id' => 'coke-village', 'area_id' => 'buk-new', 'name' => 'Coke Village', 'aka' => ['School Market', 'Coke Spot'], 'kind' => 'market', 'lat' => 11.98010, 'lng' => 8.47820, 'confirmed' => true, 'note' => 'Student hangout & lunch hub'],
            ['id' => 'old-new-hall', 'area_id' => 'buk-old', 'name' => 'New Hall', 'aka' => ['Female Hostel New Hall'], 'kind' => 'hostel', 'lat' => 11.99600, 'lng' => 8.51650, 'confirmed' => true, 'note' => 'Female residential hall'],
            ['id' => 'old-sciences-library', 'area_id' => 'buk-old', 'name' => 'Sciences Library', 'aka' => ['FAS Library'], 'kind' => 'library', 'lat' => 11.99500, 'lng' => 8.51800, 'confirmed' => true],
            ['id' => 'old-kabuga-gate', 'area_id' => 'buk-old', 'name' => 'Kabuga Gate', 'aka' => ['Main Gate Old Site'], 'kind' => 'gate', 'lat' => 11.99400, 'lng' => 8.51500, 'confirmed' => true],
            
            // Pending Places (waiting for approval)
            ['id' => 'place-jaja-gate', 'area_id' => 'buk-new', 'name' => 'Back gate of Jaja Hall', 'aka' => ['Jaja Back Gate'], 'kind' => 'gate', 'lat' => 11.98220, 'lng' => 8.47890, 'confirmed' => false, 'note' => 'New name · used by 4 students'],
            ['id' => 'place-moremi-junc', 'area_id' => 'buk-new', 'name' => 'Moremi Junction Quad', 'aka' => ['Moremi Roundabout'], 'kind' => 'landmark', 'lat' => 11.98180, 'lng' => 8.47760, 'confirmed' => false, 'note' => 'Used by 9 students'],
            ['id' => 'place-mama-put', 'area_id' => 'buk-new', 'name' => 'Mama Put behind Sports Centre', 'aka' => ['Sports Canteen'], 'kind' => 'market', 'lat' => 11.98500, 'lng' => 8.48410, 'confirmed' => false, 'note' => 'New student food spot'],
            ['id' => 'place-feg-car-park', 'area_id' => 'buk-new', 'name' => 'FEG Faculty Car Park', 'aka' => ['Engineering Shed'], 'kind' => 'landmark', 'lat' => 11.97900, 'lng' => 8.47500, 'confirmed' => false, 'note' => 'Suggested by student Halima'],
        ];

        foreach ($places as $placeData) {
            Place::create($placeData);
        }

        // 3. Platform Rules
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
            PlatformRule::create($r);
        }

        // 4. Admin & Staff Accounts
        $superAdmin = User::create([
            'name' => 'Waydrop Headquarters',
            'first_name' => 'HQ',
            'last_name' => 'SuperAdmin',
            'email' => 'superadmin@waydrop.ng',
            'phone' => '+2348000000000',
            'role' => 'super_admin',
            'runner_status' => 'verified',
            'password' => Hash::make('password123'),
            'area_id' => null,
            'phone_verified_at' => now(),
            'email_verified_at' => now(),
        ]);

        Wallet::create([
            'user_id' => $superAdmin->id,
            'balance_kobo' => 100000000,
            'escrow_kobo' => 0,
            'virtual_bank_name' => 'Squad GTCO Master Escrow',
            'virtual_account_nuban' => '8010000001',
        ]);

        $admin = User::create([
            'name' => 'BUK Desk Lead',
            'first_name' => 'Musa',
            'last_name' => 'Ibrahim',
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
            'balance_kobo' => 50000000,
            'escrow_kobo' => 0,
            'virtual_bank_name' => 'Squad GTCO Escrow',
            'virtual_account_nuban' => '8019994821',
        ]);

        $unilagAdmin = User::create([
            'name' => 'UNILAG Desk Lead',
            'first_name' => 'Funmi',
            'last_name' => 'Adeyemi',
            'email' => 'unilag.admin@waydrop.ng',
            'phone' => '+2348000000002',
            'role' => 'admin',
            'runner_status' => 'verified',
            'password' => Hash::make('password123'),
            'area_id' => 'unilag',
            'phone_verified_at' => now(),
            'email_verified_at' => now(),
        ]);

        Wallet::create([
            'user_id' => $unilagAdmin->id,
            'balance_kobo' => 35000000,
            'escrow_kobo' => 0,
            'virtual_bank_name' => 'Squad GTCO Escrow',
            'virtual_account_nuban' => '8019997711',
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
            'balance_kobo' => 850000,
            'escrow_kobo' => 110000,
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
            'balance_kobo' => 345000,
            'escrow_kobo' => 0,
            'virtual_bank_name' => 'OPay',
            'virtual_account_nuban' => '8123456789',
        ]);

        RunnerVerification::create([
            'user_id' => $runner->id,
            'campus_id' => 'buk-new',
            'faculty' => 'Faculty of Computing',
            'department' => 'Software Engineering',
            'matric_number' => 'CST/22/SWE/00219',
            'document_type' => 'student_id_card',
            'document_url' => 'https://pub-r2.waydrop.app/demo/id_card_sample.jpg',
            'selfie_url' => 'https://pub-r2.waydrop.app/demo/selfie_sample.jpg',
            'payout_bank_code' => '999992',
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

        $chidi = User::create([
            'name' => 'Chidi Nwosu',
            'first_name' => 'Chidi',
            'last_name' => 'Nwosu',
            'email' => 'chidi@unilag.edu.ng',
            'phone' => '+2348091122334',
            'role' => 'student',
            'runner_status' => 'unverified',
            'password' => Hash::make('secret123'),
            'area_id' => 'unilag',
            'rating' => 4.90,
            'trips_count' => 23,
            'phone_verified_at' => now(),
        ]);

        Wallet::create([
            'user_id' => $chidi->id,
            'balance_kobo' => 1240000,
            'escrow_kobo' => 80000,
            'virtual_bank_name' => 'Access Bank',
            'virtual_account_nuban' => '0718293101',
        ]);

        $kunle = User::create([
            'name' => 'Kunle Bankole',
            'first_name' => 'Kunle',
            'last_name' => 'Bankole',
            'email' => 'kunle@unilag.edu.ng',
            'phone' => '+2348055566778',
            'role' => 'runner',
            'runner_status' => 'verified',
            'password' => Hash::make('secret123'),
            'area_id' => 'unilag',
            'rating' => 4.60,
            'trips_count' => 61,
            'phone_verified_at' => now(),
        ]);

        Wallet::create([
            'user_id' => $kunle->id,
            'balance_kobo' => 614000,
            'escrow_kobo' => 0,
            'virtual_bank_name' => 'Kuda Bank',
            'virtual_account_nuban' => '2001928374',
        ]);

        $ifeoma = User::create([
            'name' => 'Ifeoma Chukwu',
            'first_name' => 'Ifeoma',
            'last_name' => 'Chukwu',
            'email' => 'ifeoma@unilag.edu.ng',
            'phone' => '+2348182233445',
            'role' => 'student',
            'runner_status' => 'pending',
            'area_id' => 'unilag',
            'rating' => 5.00,
            'trips_count' => 0,
            'phone_verified_at' => now(),
        ]);

        Wallet::create([
            'user_id' => $ifeoma->id,
            'balance_kobo' => 300000,
            'escrow_kobo' => 0,
        ]);

        RunnerVerification::create([
            'user_id' => $ifeoma->id,
            'campus_id' => 'unilag',
            'faculty' => 'Faculty of Engineering',
            'department' => 'Electrical & Electronics',
            'matric_number' => '200805417',
            'document_type' => 'student_id_card',
            'document_url' => 'https://pub-r2.waydrop.app/demo/ifeoma_id.jpg',
            'selfie_url' => 'https://pub-r2.waydrop.app/demo/ifeoma_selfie.jpg',
            'payout_bank_code' => '058',
            'payout_account_number' => '0192837461',
            'payout_account_name' => 'CHUKWU IFEOMA NKECHI',
            'name_match_score' => 71.00,
            'biometric_provider' => 'smile_id',
            'biometric_job_id' => 'JOB_SM_819201',
            'biometric_confidence' => 71.00,
            'biometric_liveness_passed' => true,
            'status' => 'flagged',
            'rejection_reason' => 'Name order differs from bank account record: verify ID manually.',
        ]);

        $fatima = User::create([
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
            'user_id' => $fatima->id,
            'balance_kobo' => 200000,
            'escrow_kobo' => 0,
        ]);

        RunnerVerification::create([
            'user_id' => $fatima->id,
            'campus_id' => 'buk-new',
            'faculty' => 'Faculty of Allied Health Sciences',
            'department' => 'Nursing',
            'matric_number' => 'AHS/23/NUR/00104',
            'document_type' => 'portal_crf',
            'document_url' => 'https://pub-r2.waydrop.app/demo/crf_sample.jpg',
            'selfie_url' => 'https://pub-r2.waydrop.app/demo/selfie_fatima.jpg',
            'payout_bank_code' => '058',
            'payout_account_number' => '0291823741',
            'payout_account_name' => 'FATIMA ALIYU DAHIRU',
            'name_match_score' => 91.50,
            'biometric_provider' => 'smile_id',
            'biometric_job_id' => 'JOB_SM_928114',
            'biometric_confidence' => 94.20,
            'biometric_liveness_passed' => true,
            'status' => 'ai_verified',
        ]);

        $amaka = User::create([
            'name' => 'Amaka Okafor',
            'first_name' => 'Amaka',
            'last_name' => 'Okafor',
            'email' => 'amaka@buk.edu.ng',
            'phone' => '+2348087654321',
            'role' => 'runner',
            'runner_status' => 'verified',
            'password' => Hash::make('secret123'),
            'area_id' => 'buk-new',
            'rating' => 4.92,
            'trips_count' => 38,
            'phone_verified_at' => now(),
        ]);

        Wallet::create([
            'user_id' => $amaka->id,
            'balance_kobo' => 420000,
            'escrow_kobo' => 0,
        ]);

        // 6. Sample Tasks Across Campuses
        // Errand 1: In transit
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
            'bounty_kobo' => 50000,
            'suggested_min_kobo' => 35000,
            'platform_fee_kobo' => 5000,
            'pin_code' => '4829',
            'pin_attempts' => 1,
            'status' => 'picked_up',
            'accepted_at' => now()->subMinutes(25),
            'picked_up_at' => now()->subMinutes(12),
        ]);

        // Errand 2: Open waiting for runner
        Task::create([
            'id' => 'WD-7714',
            'requester_id' => $requester->id,
            'runner_id' => null,
            'area_id' => 'buk-new',
            'item' => 'White Lab Coat & Safety Glasses',
            'note' => 'Need it before 2 PM practicals start!',
            'pickup_place_id' => 'old-new-hall',
            'pickup_name' => 'New Hall Hostel Block A',
            'pickup_lat' => 11.99600,
            'pickup_lng' => 8.51650,
            'dropoff_place_id' => 'new-agric-library',
            'dropoff_name' => 'Faculty of Agric Lab 3',
            'dropoff_lat' => 11.98210,
            'dropoff_lng' => 8.48120,
            'bounty_kobo' => 45000,
            'suggested_min_kobo' => 30000,
            'platform_fee_kobo' => 4500,
            'pin_code' => '1928',
            'pin_attempts' => 0,
            'status' => 'pending',
        ]);

        // Errand 3: Open waiting for runner
        Task::create([
            'id' => 'WD-8830',
            'requester_id' => $chidi->id,
            'runner_id' => null,
            'area_id' => 'unilag',
            'item' => 'Calculus Lecture Notebook',
            'note' => 'Pick up from desk 14 on 2nd floor',
            'pickup_place_id' => 'new-main-library',
            'pickup_name' => 'Main Library 2nd Floor',
            'pickup_lat' => 6.5173,
            'pickup_lng' => 3.3871,
            'dropoff_place_id' => 'old-new-hall',
            'dropoff_name' => 'Moremi Hall Gate',
            'dropoff_lat' => 6.5160,
            'dropoff_lng' => 3.3890,
            'bounty_kobo' => 60000,
            'suggested_min_kobo' => 40000,
            'platform_fee_kobo' => 6000,
            'pin_code' => '9041',
            'pin_attempts' => 0,
            'status' => 'pending',
        ]);

        // Errand 4: Locked Handover (5 failed PIN attempts)
        $lockedTask = Task::create([
            'id' => 'WD-T9K4',
            'requester_id' => $requester->id,
            'runner_id' => $amaka->id,
            'area_id' => 'buk-new',
            'item' => 'Indomie Noodles x2 Pack & Boiled Eggs',
            'note' => 'Deliver to Ramat Hall Doorstep',
            'pickup_place_id' => 'coke-village',
            'pickup_name' => 'Coke Village Food Shed',
            'pickup_lat' => 11.98010,
            'pickup_lng' => 8.47820,
            'dropoff_place_id' => 'old-new-hall',
            'dropoff_name' => 'Ramat Hall Reception',
            'dropoff_lat' => 11.99600,
            'dropoff_lng' => 8.51650,
            'bounty_kobo' => 70000,
            'suggested_min_kobo' => 50000,
            'platform_fee_kobo' => 7000,
            'pin_code' => '4092',
            'pin_attempts' => 5,
            'status' => 'disputed',
            'accepted_at' => now()->subHours(1),
            'picked_up_at' => now()->subMinutes(35),
        ]);

        TaskActivity::create([
            'task_id' => 'WD-T9K4',
            'actor_id' => $amaka->id,
            'event' => 'locked',
            'metadata' => ['reason' => 'PIN entry failed 5 times at dropoff location', 'lat' => 11.9960, 'lng' => 8.5165],
            'created_at' => now()->subMinutes(12),
        ]);

        // Errand 5: Disputed (Fried rice spilled)
        $spilledTask = Task::create([
            'id' => 'WD-4821',
            'requester_id' => $chidi->id,
            'runner_id' => $kunle->id,
            'area_id' => 'unilag',
            'item' => 'Special Fried Rice with Grilled Chicken',
            'note' => 'Deliver to Block C Hostel',
            'pickup_place_id' => 'coke-village',
            'pickup_name' => 'Campus Canteen',
            'pickup_lat' => 6.5180,
            'pickup_lng' => 3.3860,
            'dropoff_place_id' => 'old-new-hall',
            'dropoff_name' => 'Block C Hostel Entrance',
            'dropoff_lat' => 6.5160,
            'dropoff_lng' => 3.3880,
            'bounty_kobo' => 80000,
            'suggested_min_kobo' => 60000,
            'platform_fee_kobo' => 8000,
            'pin_code' => '5512',
            'pin_attempts' => 1,
            'status' => 'disputed',
            'accepted_at' => now()->subHours(2),
            'picked_up_at' => now()->subHour(),
        ]);

        // Errand 6: Disputed (Buy-for-me price mismatch)
        $priceMismatchTask = Task::create([
            'id' => 'WD-5102',
            'requester_id' => $chidi->id,
            'runner_id' => $kunle->id,
            'area_id' => 'unilag',
            'item' => 'Paracetamol & Vitamin C Tablets from Pharmacy',
            'note' => 'Receipt was ₦1,650, runner recorded ₦1,800',
            'pickup_place_id' => 'coke-village',
            'pickup_name' => 'Campus Health Pharmacy',
            'pickup_lat' => 6.5175,
            'pickup_lng' => 3.3870,
            'dropoff_place_id' => 'new-main-library',
            'dropoff_name' => 'Library Lawn',
            'dropoff_lat' => 6.5173,
            'dropoff_lng' => 3.3871,
            'bounty_kobo' => 180000,
            'suggested_min_kobo' => 150000,
            'platform_fee_kobo' => 18000,
            'pin_code' => '3310',
            'pin_attempts' => 0,
            'status' => 'disputed',
            'accepted_at' => now()->subHours(3),
            'picked_up_at' => now()->subHours(2),
        ]);

        // 7. Disputes
        Dispute::create([
            'task_id' => 'WD-4821',
            'requester_id' => $chidi->id,
            'runner_id' => $kunle->id,
            'opened_by' => $chidi->id,
            'reason' => 'item_damaged',
            'explanation' => 'Fried rice arrived tipped over, sauce leaked and food is half gone.',
            'held_amount_kobo' => 80000,
            'status' => 'open',
            'sla_expires_at' => now()->addMinutes(9),
        ]);

        Dispute::create([
            'task_id' => 'WD-T9K4',
            'requester_id' => $requester->id,
            'runner_id' => $amaka->id,
            'opened_by' => $amaka->id,
            'reason' => 'pin_lockout',
            'explanation' => 'Recipient gave wrong PIN 5 times at doorstep. Amaka is waiting with parcel.',
            'held_amount_kobo' => 70000,
            'status' => 'open',
            'sla_expires_at' => now()->addMinutes(3),
        ]);

        Dispute::create([
            'task_id' => 'WD-5102',
            'requester_id' => $chidi->id,
            'runner_id' => $kunle->id,
            'opened_by' => $chidi->id,
            'reason' => 'price_discrepancy',
            'explanation' => 'Receipt shows ₦1,650, logged ₦1,800. Requester requesting ₦150 refund adjustment.',
            'held_amount_kobo' => 180000,
            'status' => 'open',
            'sla_expires_at' => now()->addMinutes(41),
        ]);

        // 8. Payouts (Failed Banking Transfers)
        Payout::create([
            'user_id' => $amaka->id,
            'amount_kobo' => 350000,
            'bank_name' => 'Access Bank',
            'bank_code' => '044',
            'account_number' => '0192834471',
            'account_name' => 'AMAKA BLOSSOM OKAFOR',
            'status' => 'failed',
            'gateway_provider' => 'squad',
            'failure_reason' => 'NIP Bank Switch Timeout (Access Bank gateway down)',
            'retry_count' => 2,
            'last_attempt_at' => now()->subMinutes(14),
        ]);

        Payout::create([
            'user_id' => $kunle->id,
            'amount_kobo' => 120000,
            'bank_name' => 'Kuda Microfinance Bank',
            'bank_code' => '50211',
            'account_number' => '2001920912',
            'account_name' => 'KUNLE OPEYEMI BANKOLE',
            'status' => 'failed',
            'gateway_provider' => 'squad',
            'failure_reason' => 'Account name mismatch during NIP verification',
            'retry_count' => 1,
            'last_attempt_at' => now()->subMinutes(30),
        ]);

        // 9. Crew Shifts
        CrewShift::create([
            'area_id' => 'buk-new',
            'name' => 'Afternoon Campus Radar Shift',
            'lead_user_id' => $admin->id,
            'start_time' => '12:00:00',
            'end_time' => '18:00:00',
            'days_of_week' => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
            'status' => 'active',
            'notes' => 'Priority coverage: Faculty of Science, Main Library, Coke Village',
        ]);

        // 10. Audit Logs
        AuditLog::create([
            'admin_id' => $admin->id,
            'action' => 'kyc.approve',
            'target_type' => 'RunnerVerification',
            'target_id' => '1',
            'reason' => 'Student ID matches selfie and name with 98.4% biometric confidence',
            'ip_address' => '127.0.0.1',
            'created_at' => now()->subHours(4),
        ]);

        AuditLog::create([
            'admin_id' => $admin->id,
            'action' => 'rule.update',
            'target_type' => 'PlatformRule',
            'target_id' => 'offer_ttl_seconds',
            'reason' => 'Walkers missed offers while crossing library road, increased TTL to 25s',
            'ip_address' => '127.0.0.1',
            'created_at' => now()->subHours(2),
        ]);

        AuditLog::create([
            'admin_id' => null, // System automated log
            'action' => 'task.pin_lockout',
            'target_type' => 'Task',
            'target_id' => 'WD-T9K4',
            'reason' => 'Automated lockout after 5 consecutive incorrect PIN entries',
            'ip_address' => '127.0.0.1',
            'created_at' => now()->subMinutes(40),
        ]);
    }
}
