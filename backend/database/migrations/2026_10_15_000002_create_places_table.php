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
        Schema::create('places', function (Blueprint $table) {
            $table->string('id', 50)->primary(); // e.g. 'new-main-library', 'old-new-hall'
            $table->string('area_id', 50);
            $table->string('name', 100);
            $table->json('aka')->nullable(); // alternative student aliases/slang
            $table->string('kind', 30); // hostel, faculty, library, gate, market, landmark
            $table->decimal('lat', 9, 6)->nullable();
            $table->decimal('lng', 9, 6)->nullable();
            $table->boolean('confirmed')->default(false);
            $table->text('note')->nullable();
            $table->unsignedInteger('used_count')->default(0);
            $table->foreignUuid('suggested_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('bounty_paid')->default(false); // +₦50 wallet reward upon verification
            $table->timestamps();

            $table->foreign('area_id')->references('id')->on('areas')->cascadeOnDelete();
            $table->index(['area_id', 'kind']);
            $table->index('confirmed');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('places');
    }
};
