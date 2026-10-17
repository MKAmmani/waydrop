<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('waydrop:radar-pulse {--campus=buk-new}', function (App\Services\AblyService $ably) {
    $campusId = $this->option('campus');
    $this->info("Starting real-time radar broadcaster for campus: {$campusId}");
    $controller = app(App\Http\Controllers\Api\V1\AblyController::class);
    $request = request();
    while (true) {
        $controller->broadcastCampusRadar($campusId, $request, $ably);
        sleep(2);
    }
})->purpose('Continuously broadcast live moving runners to Ably WebSocket channel');
