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
        Schema::create('disputes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('task_id', 12);
            $table->foreignUuid('requester_id')->constrained('users');
            $table->foreignUuid('runner_id')->nullable()->constrained('users');
            $table->foreignUuid('opened_by')->constrained('users');
            $table->string('reason', 100); // wrong_item, runner_unreachable, damaged_item, pin_lockout, hostel_gate_blocked, other
            $table->text('explanation')->nullable();
            $table->json('evidence_urls')->nullable();
            $table->unsignedBigInteger('held_amount_kobo')->default(0);

            // Resolution workflow
            $table->string('status', 20)->default('open'); // open, under_review, resolved, escalated
            $table->string('resolution_type', 30)->nullable(); // refund_requester, release_runner, refund_cover, partial_split
            $table->unsignedBigInteger('refund_kobo')->default(0);
            $table->unsignedBigInteger('payout_kobo')->default(0);
            $table->foreignUuid('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('resolved_at')->nullable();
            $table->text('admin_notes')->nullable();
            $table->timestamp('sla_expires_at')->nullable();
            $table->timestamps();

            $table->foreign('task_id')->references('id')->on('tasks')->cascadeOnDelete();
            $table->index('status');
            $table->index('sla_expires_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('disputes');
    }
};
