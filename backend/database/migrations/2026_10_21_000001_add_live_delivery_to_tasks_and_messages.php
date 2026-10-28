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
        Schema::table('tasks', function (Blueprint $table) {
            $table->timestamp('arrived_at')->nullable()->after('picked_up_at');
            $table->unsignedTinyInteger('rating')->nullable()->after('cancellation_reason');
            $table->json('rating_tags')->nullable()->after('rating');
            $table->text('rating_note')->nullable()->after('rating_tags');
            $table->unsignedBigInteger('tip_kobo')->default(0)->after('bounty_kobo');
            $table->boolean('is_late')->default(false)->after('status');
        });

        Schema::create('task_messages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('task_id', 12);
            $table->foreignUuid('sender_id')->constrained('users')->cascadeOnDelete();
            $table->string('sender_name', 100);
            $table->text('text');
            $table->boolean('is_runner')->default(false);
            $table->timestamps();

            $table->foreign('task_id')->references('id')->on('tasks')->cascadeOnDelete();
            $table->index(['task_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('task_messages');

        Schema::table('tasks', function (Blueprint $table) {
            $table->dropColumn(['arrived_at', 'rating', 'rating_tags', 'rating_note', 'tip_kobo', 'is_late']);
        });
    }
};
