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
        Schema::create('transactions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('wallet_id')->constrained('wallets')->cascadeOnDelete();
            $table->string('task_id', 12)->nullable();
            $table->string('type', 30); // deposit, escrow_lock, escrow_release, escrow_refund, payout, fee, landmark_bounty
            $table->unsignedBigInteger('amount_kobo');
            $table->unsignedBigInteger('balance_before_kobo');
            $table->unsignedBigInteger('balance_after_kobo');
            $table->string('reference', 100)->unique();
            $table->string('gateway_reference', 100)->nullable();
            $table->string('status', 20)->default('success'); // pending, success, failed
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->foreign('task_id')->references('id')->on('tasks')->nullOnDelete();
            $table->index(['wallet_id', 'type']);
            $table->index('reference');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};
