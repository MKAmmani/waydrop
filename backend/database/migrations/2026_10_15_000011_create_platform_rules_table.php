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
        Schema::create('platform_rules', function (Blueprint $table) {
            $table->id();
            $table->string('key', 60)->unique();
            $table->text('value');
            $table->string('group', 30)->default('general'); // pricing, kyc, safety, payout, general
            $table->string('title', 100);
            $table->string('description', 255)->nullable();
            $table->boolean('is_active')->default(true);
            $table->foreignUuid('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('group');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('platform_rules');
    }
};
