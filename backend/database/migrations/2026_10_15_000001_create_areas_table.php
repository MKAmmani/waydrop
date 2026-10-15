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
        Schema::create('areas', function (Blueprint $table) {
            $table->string('id', 50)->primary(); // e.g. 'buk-new', 'unilag', 'oau'
            $table->string('name', 100);
            $table->string('subtitle', 150);
            $table->decimal('lat', 9, 6);
            $table->decimal('lng', 9, 6);
            $table->unsignedInteger('radius_meters')->default(3500);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('areas');
    }
};
