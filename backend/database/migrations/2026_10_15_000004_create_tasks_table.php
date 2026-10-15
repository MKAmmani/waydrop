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
        Schema::create('tasks', function (Blueprint $table) {
            $table->string('id', 12)->primary(); // e.g. 'WD-7X2P'
            $table->foreignUuid('requester_id')->constrained('users');
            $table->foreignUuid('runner_id')->nullable()->constrained('users');
            $table->string('area_id', 50);
            $table->string('item', 255);
            $table->text('note')->nullable();
            
            $table->string('pickup_place_id', 50)->nullable();
            $table->string('pickup_name', 100);
            $table->decimal('pickup_lat', 9, 6)->nullable();
            $table->decimal('pickup_lng', 9, 6)->nullable();
            
            $table->string('dropoff_place_id', 50)->nullable();
            $table->string('dropoff_name', 100);
            $table->decimal('dropoff_lat', 9, 6)->nullable();
            $table->decimal('dropoff_lng', 9, 6)->nullable();

            $table->unsignedBigInteger('bounty_kobo'); // minimum 20000 kobo (₦200)
            $table->unsignedBigInteger('suggested_min_kobo')->default(0);
            $table->unsignedBigInteger('platform_fee_kobo')->default(0);

            $table->string('pin_code', 255); // Encrypted 4-digit handshake delivery PIN (AES-256-CBC)
            $table->unsignedSmallInteger('pin_attempts')->default(0); // Anti-brute force counter

            $table->string('status', 20)->default('pending'); // pending, accepted, picked_up, completed, cancelled, disputed
            $table->string('cancellation_reason', 255)->nullable();
            $table->string('pickup_photo_url', 255)->nullable();
            $table->string('dropoff_photo_url', 255)->nullable();

            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('picked_up_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();

            $table->foreign('area_id')->references('id')->on('areas');
            $table->foreign('pickup_place_id')->references('id')->on('places')->nullOnDelete();
            $table->foreign('dropoff_place_id')->references('id')->on('places')->nullOnDelete();

            $table->index('status');
            $table->index('requester_id');
            $table->index('runner_id');
            $table->index(['area_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};
