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
        Schema::create('payouts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedBigInteger('amount_kobo');
            $table->string('bank_name', 100);
            $table->string('bank_code', 10);
            $table->string('account_number', 20);
            $table->string('account_name', 150);
            $table->string('status', 20)->default('pending'); // pending, processing, success, failed, retry_queued
            $table->string('gateway_provider', 30)->default('squad'); // squad, zainpay
            $table->string('gateway_reference', 100)->nullable();
            $table->text('failure_reason')->nullable();
            $table->unsignedSmallInteger('retry_count')->default(0);
            $table->timestamp('last_attempt_at')->nullable();
            $table->foreignUuid('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('status');
            $table->index('user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payouts');
    }
};
