<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Database\Seeder;

class UserNotificationSeeder extends Seeder
{
    /**
     * Seed realistic in-app notifications for existing users.
     */
    public function run(): void
    {
        $users = User::all();

        if ($users->isEmpty()) {
            return;
        }

        $templates = [
            [
                'type' => 'money',
                'title' => '+₦450 landed in your wallet',
                'body' => 'You delivered a calculator to LT3. Nice one.',
                'hours_ago' => 0.2,
                'read' => false,
            ],
            [
                'type' => 'errand',
                'title' => '3 errands near Main Library',
                'body' => 'Heading that way? Set your route to catch them.',
                'hours_ago' => 0.7,
                'read' => false,
            ],
            [
                'type' => 'rating',
                'title' => 'Tobi rated you 5 stars',
                'body' => '"Quick and friendly, PIN handover was smooth."',
                'hours_ago' => 2,
                'read' => false,
            ],
            [
                'type' => 'bank',
                'title' => '₦2,000 sent to your Kuda account',
                'body' => 'Withdrawal completed in 38 seconds.',
                'hours_ago' => 72,
                'read' => true,
            ],
            [
                'type' => 'invite',
                'title' => 'Chidi joined with your invite',
                'body' => 'You both get ₦200 after their first errand.',
                'hours_ago' => 96,
                'read' => true,
            ],
        ];

        foreach ($users as $user) {
            foreach ($templates as $template) {
                UserNotification::firstOrCreate(
                    [
                        'user_id' => $user->id,
                        'type' => $template['type'],
                        'title' => $template['title'],
                    ],
                    [
                        'body' => $template['body'],
                        'read_at' => $template['read'] ? now()->subHours($template['hours_ago']) : null,
                        'created_at' => now()->subHours($template['hours_ago']),
                        'updated_at' => now()->subHours($template['hours_ago']),
                    ]
                );
            }
        }
    }
}
