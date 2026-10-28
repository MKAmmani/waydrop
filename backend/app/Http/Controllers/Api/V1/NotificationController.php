<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\UserNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * List the authenticated user's notifications (latest first)
     * GET /api/notifications
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $perPage = min(50, max(1, (int) $request->input('per_page', 20)));

        $notifications = $user->userNotifications()
            ->latest()
            ->paginate($perPage);

        return response()->json([
            'items' => array_map([$this, 'transform'], $notifications->items()),
            'unread_count' => $user->userNotifications()->unread()->count(),
            'current_page' => $notifications->currentPage(),
            'last_page' => $notifications->lastPage(),
            'total' => $notifications->total(),
        ]);
    }

    /**
     * Mark a single notification as read
     * POST /api/notifications/{id}/read
     */
    public function markRead(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        $notification = $user->userNotifications()->whereKey($id)->first();

        if (! $notification) {
            return response()->json([
                'error' => [
                    'code' => 'NOT_FOUND',
                    'message' => 'Notification not found.',
                ],
            ], 404);
        }

        if (! $notification->read_at) {
            $notification->update(['read_at' => now()]);
        }

        return response()->json([
            'unread_count' => $user->userNotifications()->unread()->count(),
        ]);
    }

    /**
     * Mark every notification as read
     * POST /api/notifications/read-all
     */
    public function markAllRead(Request $request): JsonResponse
    {
        $request->user()
            ->userNotifications()
            ->unread()
            ->update(['read_at' => now()]);

        return response()->json([
            'unread_count' => 0,
        ]);
    }

    /**
     * Shape a notification for the mobile API response.
     *
     * @return array{id: string, type: string, title: string, desc: string, read: bool, created_at: string|null, data: array|null}
     */
    private function transform(UserNotification $notification): array
    {
        return [
            'id' => (string) $notification->id,
            'type' => $notification->type,
            'title' => $notification->title,
            'desc' => $notification->body,
            'read' => $notification->read_at !== null,
            'created_at' => $notification->created_at?->toIso8601String(),
            'data' => $notification->data,
        ];
    }
}
