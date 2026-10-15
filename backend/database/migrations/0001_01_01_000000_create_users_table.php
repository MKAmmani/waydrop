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
        Schema::create('users', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name')->nullable();
            $table->string('first_name', 60)->nullable();
            $table->string('last_name', 60)->nullable();
            $table->string('email')->unique()->nullable();
            $table->string('phone', 20)->unique()->nullable();
            $table->string('role', 20)->default('student'); // 'student', 'runner', 'staff', 'admin'
            $table->string('runner_status', 20)->default('unverified'); // 'unverified', 'pending', 'verified', 'rejected'
            $table->string('photo_url', 255)->nullable();
            $table->string('area_id', 50)->nullable();
            $table->string('google_id', 100)->unique()->nullable();
            $table->string('apple_id', 100)->unique()->nullable();
            $table->decimal('rating', 3, 2)->default(5.00);
            $table->unsignedInteger('trips_count')->default(0);
            $table->boolean('is_paused')->default(false);
            $table->boolean('is_blocked')->default(false);
            $table->text('block_reason')->nullable();
            $table->timestamp('phone_verified_at')->nullable();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password')->nullable();
            $table->rememberToken();
            $table->timestamps();

            $table->index('phone');
            $table->index('runner_status');
            $table->index('role');
            $table->index('area_id');
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignUuid('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('users');
    }
};
