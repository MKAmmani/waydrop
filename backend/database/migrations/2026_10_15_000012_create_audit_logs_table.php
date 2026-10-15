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
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('admin_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action', 60); // kyc.approve, dispute.resolve, pin.unlock, user.block, etc.
            $table->string('target_type', 60); // User, Task, Dispute, RunnerVerification, Payout
            $table->string('target_id', 60);
            $table->text('reason'); // Mandatory human justification per UI spec
            $table->json('before_state')->nullable();
            $table->json('after_state')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['target_type', 'target_id']);
            $table->index('action');
            $table->index('admin_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
