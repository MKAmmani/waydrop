<?php

use App\Http\Controllers\Api\V1\AblyController;
use App\Services\AblyService;
use App\Services\ExpoNotificationService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('waydrop:radar-pulse {--campus=buk-new}', function (AblyService $ably) {
    $campusId = $this->option('campus');
    $this->info("Starting real-time radar broadcaster for campus: {$campusId}");
    $controller = app(AblyController::class);
    $request = request();
    while (true) {
        $controller->broadcastCampusRadar($campusId, $request, $ably);
        sleep(2);
    }
})->purpose('Continuously broadcast live moving runners to Ably WebSocket channel');

Artisan::command('waydrop:push {target} {--title=Waydrop Alert} {--body=This is a test notification from Waydrop.}', function ($target, ExpoNotificationService $expo) {
    $this->info("Dispatching test push to: {$target}");
    $title = $this->option('title');
    $body = $this->option('body');

    if ($expo->isValidExpoPushToken($target)) {
        $res = $expo->sendPushNotification($target, $title, $body, ['type' => 'test']);
    } else {
        $res = $expo->sendToUser($target, $title, $body, ['type' => 'test']);
    }

    $this->info('Result: '.json_encode($res, JSON_PRETTY_PRINT));
})->purpose('Send a live high-priority test push notification via Expo Push Gateway');
