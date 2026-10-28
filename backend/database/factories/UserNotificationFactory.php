<?php

namespace Database\Factories;

use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<UserNotification>
 */
class UserNotificationFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $type = fake()->randomElement(UserNotification::TYPES);

        $content = match ($type) {
            'money' => [
                'title' => '+₦450 landed in your wallet',
                'body' => 'You delivered a calculator to LT3. Nice one.',
            ],
            'errand' => [
                'title' => '3 errands near Main Library',
                'body' => 'Heading that way? Set your route to catch them.',
            ],
            'rating' => [
                'title' => 'Tobi rated you 5 stars',
                'body' => '"Quick and friendly, PIN handover was smooth."',
            ],
            'bank' => [
                'title' => '₦2,000 sent to your Kuda account',
                'body' => 'Withdrawal completed in 38 seconds.',
            ],
            default => [
                'title' => 'Chidi joined with your invite',
                'body' => 'You both get ₦200 after their first errand.',
            ],
        };

        return [
            'user_id' => User::factory(),
            'type' => $type,
            'title' => $content['title'],
            'body' => $content['body'],
            'data' => null,
            'read_at' => fake()->boolean(40) ? fake()->dateTimeBetween('-5 days', 'now') : null,
        ];
    }

    /**
     * Indicate that the notification has been read.
     */
    public function read(): static
    {
        return $this->state(fn (array $attributes) => [
            'read_at' => now(),
        ]);
    }

    /**
     * Indicate that the notification is unread.
     */
    public function unread(): static
    {
        return $this->state(fn (array $attributes) => [
            'read_at' => null,
        ]);
    }
}
