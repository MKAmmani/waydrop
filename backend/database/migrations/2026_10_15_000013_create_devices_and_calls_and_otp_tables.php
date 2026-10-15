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
        Schema::create('devices', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('push_token', 255);
            $table->string('platform', 15); // android, ios, web
            $table->string('locale', 10)->default('en-NG');
            $table->timestamp('last_active_at')->useCurrent();
            $table->timestamps();

            $table->unique(['user_id', 'push_token']);
        });

        Schema::create('call_sessions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('task_id', 12);
            $table->foreignUuid('caller_id')->constrained('users');
            $table->foreignUuid('receiver_id')->constrained('users');
            $table->string('agora_channel', 64);
            $table->unsignedInteger('duration_seconds')->default(0);
            $table->string('status', 20)->default('initiated'); // initiated, connected, ended, missed
            $table->timestamp('started_at')->useCurrent();
            $table->timestamp('ended_at')->nullable();
            $table->timestamps();

            $table->foreign('task_id')->references('id')->on('tasks')->cascadeOnDelete();
            $table->index('task_id');
        });

        Schema::create('otp_requests', function (Blueprint $table) {
            $table->id();
            $table->string('phone', 20);
            $table->string('ip_address', 45);
            $table->string('code_hash', 255);
            $table->unsignedSmallInteger('attempts')->default(0);
            $table->boolean('is_used')->default(false);
            $table->timestamp('expires_at');
            $table->timestamps();

            $table->index(['phone', 'is_used']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('otp_requests');
        Schema::dropIfExists('call_sessions');
        Schema::dropIfExists('devices');
    }
};
