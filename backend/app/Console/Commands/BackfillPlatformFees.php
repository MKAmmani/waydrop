<?php

namespace App\Console\Commands;

use App\Models\Task;
use App\Services\PlatformRevenueService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

#[Signature('waydrop:backfill-platform-fees {--dry-run : Report missing fee entries without writing them}')]
#[Description('Book platform commission ledger entries for completed errands that are missing one')]
class BackfillPlatformFees extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(PlatformRevenueService $platformRevenue): int
    {
        $booked = 0;
        $skipped = 0;
        $dryRun = (bool) $this->option('dry-run');

        Task::query()
            ->where('status', 'completed')
            ->orderBy('completed_at')
            ->chunkById(100, function ($tasks) use ($platformRevenue, $dryRun, &$booked, &$skipped) {
                foreach ($tasks as $task) {
                    $fee = (int) ($task->platform_fee_kobo ?: round($task->bounty_kobo * 0.10));

                    if ($fee <= 0) {
                        $skipped++;

                        continue;
                    }

                    if ($dryRun) {
                        $this->line("Would book {$fee} kobo for {$task->id}");
                        $booked++;

                        continue;
                    }

                    $payoutKobo = max(0, $task->bounty_kobo - $fee);
                    $cashRefundKobo = isset($task->cash_purchase['amount_kobo'])
                        ? (int) $task->cash_purchase['amount_kobo']
                        : 0;

                    $transaction = DB::transaction(
                        fn () => $platformRevenue->recordFee($task, $fee, $payoutKobo, $cashRefundKobo)
                    );

                    if ($transaction) {
                        $booked++;
                        $this->line("Booked {$fee} kobo for {$task->id}");
                    } else {
                        $skipped++;
                    }
                }
            });

        $this->info("Platform fee entries booked: {$booked}; already recorded or zero-fee: {$skipped}.");

        return self::SUCCESS;
    }
}
