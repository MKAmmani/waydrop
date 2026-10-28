<?php

use App\Jobs\SendExpoPush;
use App\Models\User;
use App\Models\UserNotification;
use App\Services\NotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

describe('Notification API', function () {
    it('requires authentication to list notifications', function () {
        $this->getJson('/api/notifications')->assertStatus(401);
    });

    it('requires authentication to mark a notification read', function () {
        $user = User::factory()->create();
        $notification = UserNotification::factory()->for($user)->create();

        $this->postJson("/api/notifications/{$notification->id}/read")->assertStatus(401);
    });

    it('lists the authenticated user notifications with unread count', function () {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        UserNotification::factory()->count(3)->for($user)->unread()->create();
        UserNotification::factory()->count(2)->for($user)->read()->create();
        UserNotification::factory()->count(4)->create();

        $response = $this->getJson('/api/notifications')->assertStatus(200);

        $response->assertJsonStructure([
            'items' => [['id', 'type', 'title', 'desc', 'read', 'created_at']],
            'unread_count',
            'current_page',
            'last_page',
            'total',
        ]);

        expect($response->json('total'))->toBe(5)
            ->and($response->json('unread_count'))->toBe(3)
            ->and($response->json('items.0.read'))->toBeBool();
    });

    it('marks a single notification as read', function () {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $unread = UserNotification::factory()->for($user)->unread()->create();
        UserNotification::factory()->for($user)->unread()->create();

        $response = $this->postJson("/api/notifications/{$unread->id}/read")->assertStatus(200);

        expect($response->json('unread_count'))->toBe(1)
            ->and($unread->fresh()->read_at)->not->toBeNull();
    });

    it('returns 404 when marking a notification that does not belong to the user', function () {
        Sanctum::actingAs(User::factory()->create());

        $otherUsersNotification = UserNotification::factory()->unread()->create();

        $this->postJson("/api/notifications/{$otherUsersNotification->id}/read")
            ->assertStatus(404);

        expect($otherUsersNotification->fresh()->read_at)->toBeNull();
    });

    it('marks all notifications as read', function () {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        UserNotification::factory()->count(4)->for($user)->unread()->create();

        $response = $this->postJson('/api/notifications/read-all')->assertStatus(200);

        expect($response->json('unread_count'))->toBe(0)
            ->and($user->userNotifications()->unread()->count())->toBe(0);
    });
});

describe('NotificationService', function () {
    it('creates an in-app notification and queues an expo push', function () {
        Queue::fake();

        $user = User::factory()->create();

        $notification = app(NotificationService::class)->send(
            $user,
            'money',
            '+₦450 landed in your wallet',
            'You delivered a calculator to LT3. Nice one.',
            ['amount_kobo' => 45000]
        );

        expect($notification->user_id)->toBe($user->id)
            ->and($notification->type)->toBe('money')
            ->and($notification->read_at)->toBeNull()
            ->and($notification->data)->toBe(['amount_kobo' => 45000]);

        Queue::assertPushed(SendExpoPush::class);
    });

    it('counts unread notifications for a user', function () {
        $user = User::factory()->create();

        UserNotification::factory()->count(2)->for($user)->unread()->create();
        UserNotification::factory()->count(3)->for($user)->read()->create();

        expect(app(NotificationService::class)->unreadCount($user))->toBe(2);
    });
});

describe('Home unread count', function () {
    it('returns the real unread count on the home payload', function () {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        UserNotification::factory()->count(3)->for($user)->unread()->create();
        UserNotification::factory()->count(2)->for($user)->read()->create();

        $response = $this->getJson('/api/home')->assertStatus(200);

        expect($response->json('unread'))->toBe(3);
    });
});
