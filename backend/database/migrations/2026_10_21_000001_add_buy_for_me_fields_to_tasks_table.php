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
            $table->string('type', 20)->default('move')->after('id'); // 'move' or 'buy'
            $table->json('items')->nullable()->after('note');
            $table->json('source')->nullable()->after('items');
            $table->json('rules')->nullable()->after('source');
            $table->unsignedBigInteger('budget_kobo')->default(0)->after('bounty_kobo');
            $table->unsignedBigInteger('spent_kobo')->default(0)->after('budget_kobo');
            $table->unsignedBigInteger('refund_kobo')->default(0)->after('spent_kobo');
            $table->string('seat_photo_url', 255)->nullable()->after('dropoff_photo_url');
            $table->boolean('live_share')->default(false)->after('seat_photo_url');
            $table->boolean('beacon_active')->default(false)->after('live_share');
            $table->json('vendor_payment')->nullable()->after('beacon_active');
            $table->json('cash_purchase')->nullable()->after('vendor_payment');
            $table->json('active_ask')->nullable()->after('cash_purchase');

            $table->index(['type', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropIndex(['type', 'status']);
            $table->dropColumn([
                'type',
                'items',
                'source',
                'rules',
                'budget_kobo',
                'spent_kobo',
                'refund_kobo',
                'seat_photo_url',
                'live_share',
                'beacon_active',
                'vendor_payment',
                'cash_purchase',
                'active_ask',
            ]);
        });
    }
};
