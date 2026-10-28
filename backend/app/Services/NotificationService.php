<?php

namespace App\Services;

use App\Jobs\SendExpoPush;
use App\Models\User;
use App\Models\UserNotification;

class NotificationService
{
    /**
     * Create an in-app notification for a user and queue a push dispatch.
     */
    public function send(User $user, string $type, string $title, string $body, array $data = []): UserNotification
    {
        $notification = UserNotification::create([
            'user_id' => $user->id,
            'type' => $type,
            'title' => $title,
            'body' => $body,
            'data' => $data ?: null,
        ]);

        SendExpoPush::dispatch((string) $user->id, $title, $body, $data);

        return $notification;
    }

    /**
     * Count of unread notifications for a user.
     */
    public function unreadCount(User $user): int
    {
        return $user->userNotifications()->unread()->count();
    }
}
