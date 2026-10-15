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
        Schema::create('crew_shifts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('area_id', 50);
            $table->string('name', 100);
            $table->foreignUuid('lead_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('start_time', 10); // e.g. 08:00
            $table->string('end_time', 10);   // e.g. 13:00
            $table->json('days_of_week')->nullable(); // e.g. ["mon", "tue", "wed", "thu", "fri"]
            $table->string('status', 20)->default('active'); // active, paused, archived
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('area_id')->references('id')->on('areas')->cascadeOnDelete();
            $table->index('status');
        });

        Schema::create('crew_shift_members', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('shift_id')->constrained('crew_shifts')->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('role', 30)->default('marshal'); // lead, marshal, backup
            $table->timestamps();

            $table->unique(['shift_id', 'user_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('crew_shift_members');
        Schema::dropIfExists('crew_shifts');
    }
};
