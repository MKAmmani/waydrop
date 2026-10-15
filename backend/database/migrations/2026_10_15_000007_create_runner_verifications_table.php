<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('runner_verifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->string('campus_id', 50);
            $table->string('faculty', 100);
            $table->string('department', 100);
            $table->string('matric_number', 50);
            $table->string('document_type', 30); // student_id_card, portal_crf, admission_letter
            $table->string('document_url', 255); // Cloudflare R2 private URI
            $table->string('selfie_url', 255);   // Cloudflare R2 private URI

            // Payout Bank Matching (Squad / Zainpay NUBAN resolution)
            $table->string('payout_bank_code', 10);
            $table->string('payout_account_number', 20);
            $table->string('payout_account_name', 150);
            $table->decimal('name_match_score', 5, 2)->default(0.00); // 0.00 - 100.00%

            // Automated Biometric AI Verification (Smile ID / Prembly)
            $table->string('biometric_provider', 30)->nullable(); // smile_id, prembly
            $table->string('biometric_job_id', 100)->nullable();
            $table->decimal('biometric_confidence', 5, 2)->nullable();
            $table->boolean('biometric_liveness_passed')->nullable();
            $table->json('biometric_raw_response')->nullable();

            // Admin Review Desk Lifecycle
            $table->string('status', 20)->default('pending'); // pending, ai_verified, flagged, approved, rejected
            $table->text('rejection_reason')->nullable();
            $table->foreignUuid('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->foreign('campus_id')->references('id')->on('areas');
            $table->index('status');
            $table->index('matric_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('runner_verifications');
    }
};
