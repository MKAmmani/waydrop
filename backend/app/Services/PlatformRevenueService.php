<?php

namespace App\Services;

use App\Models\Task;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Support\Str;

class PlatformRevenueService
{
    public const ACCOUNT_EMAIL = 'revenue@waydrop.ng';

    /**
     * Resolve (or provision) the platform's dedicated revenue wallet.
     */
    public function wallet(): Wallet
    {
        $user = User::firstOrCreate(
            ['email' => self::ACCOUNT_EMAIL],
            [
                'name' => 'Waydrop Platform Revenue',
                'first_name' => 'Waydrop',
                'last_name' => 'Revenue',
                'role' => 'platform',
                'runner_status' => 'unverified',
                'password' => Str::random(40),
            ]
        );

        return Wallet::firstOrCreate(
            ['user_id' => $user->id],
            [
                'balance_kobo' => 0,
                'escrow_kobo' => 0,
                'virtual_bank_name' => 'Waydrop Platform Revenue',
            ]
        );
    }

    /**
     * Book the platform commission for a completed errand.
     *
     * Safe to call more than once for the same task: the fee is only
     * recorded once, so retries cannot double-credit the platform wallet.
     */
    public function recordFee(
        Task $task,
        int $feeKobo,
        int $payoutKobo,
        int $cashRefundKobo = 0
    ): ?Transaction {
        if ($feeKobo <= 0) {
            return null;
        }

        $alreadyRecorded = Transaction::query()
            ->where('task_id', $task->id)
            ->where('type', 'fee')
            ->exists();

        if ($alreadyRecorded) {
            return null;
        }

        $wallet = Wallet::query()
            ->whereKey($this->wallet()->id)
            ->lockForUpdate()
            ->firstOrFail();

        $balanceBefore = $wallet->balance_kobo;
        $wallet->balance_kobo = $balanceBefore + $feeKobo;
        $wallet->save();

        return Transaction::create([
            'wallet_id' => $wallet->id,
            'task_id' => $task->id,
            'type' => 'fee',
            'amount_kobo' => $feeKobo,
            'balance_before_kobo' => $balanceBefore,
            'balance_after_kobo' => $wallet->balance_kobo,
            'reference' => 'WD_FEE_'.strtoupper(Str::random(10)),
            'status' => 'success',
            'metadata' => [
                'task_id' => $task->id,
                'bounty_kobo' => $task->bounty_kobo,
                'fee_kobo' => $feeKobo,
                'fee_percent' => $task->bounty_kobo > 0
                    ? round(($feeKobo / $task->bounty_kobo) * 100, 2)
                    : 0,
                'runner_payout_kobo' => $payoutKobo,
                'cash_refund_kobo' => $cashRefundKobo,
            ],
        ]);
    }
}
