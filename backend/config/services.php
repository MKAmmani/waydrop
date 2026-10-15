<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | Configuration for all finalized external APIs powering Waydrop:
    | SMS (Termii), Banking & Payments (Squad / Zainpay), Biometrics (Smile ID / Prembly),
    | WebSockets (Ably), VoIP (Agora), and Notifications (Expo).
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    // Termii (SMS OTP - Nigeria DND bypass)
    'termii' => [
        'api_key' => env('TERMII_API_KEY'),
        'sender_id' => env('TERMII_SENDER_ID', 'Waydrop'),
        'base_url' => env('TERMII_BASE_URL', 'https://api.ng.termii.com'),
    ],

    // Squad Co / HabariPay (GTCO - Virtual Accounts & Bank Transfers)
    'squad' => [
        'secret_key' => env('SQUAD_SECRET_KEY'),
        'public_key' => env('SQUAD_PUBLIC_KEY'),
        'webhook_secret' => env('SQUAD_WEBHOOK_SECRET'),
        'base_url' => env('SQUAD_BASE_URL', 'https://api-d.squadco.com'), // sandbox default
    ],

    // Zainpay (Alternative Nigerian Banking Gateway)
    'zainpay' => [
        'public_key' => env('ZAINPAY_PUBLIC_KEY'),
        'secret_key' => env('ZAINPAY_SECRET_KEY'),
        'base_url' => env('ZAINPAY_BASE_URL', 'https://sandbox.zainpay.ng'),
    ],

    // Smile ID (Biometric 1:1 Face Match & Liveness)
    'smile_id' => [
        'partner_id' => env('SMILE_ID_PARTNER_ID'),
        'api_key' => env('SMILE_ID_API_KEY'),
        'sid_server' => env('SMILE_ID_SERVER', 'https://testapi.smileidentity.com/v1'),
    ],

    // Prembly / Identitypass (Alternative Nigerian Biometrics & Verification)
    'prembly' => [
        'app_id' => env('PREMBLY_APP_ID'),
        'api_key' => env('PREMBLY_API_KEY'),
        'base_url' => env('PREMBLY_BASE_URL', 'https://api.prembly.com'),
    ],

    // Ably (Real-Time Pub/Sub & Map Radar)
    'ably' => [
        'api_key' => env('ABLY_API_KEY'),
    ],

    // Agora.io (In-App VoIP Encrypted Calling)
    'agora' => [
        'app_id' => env('AGORA_APP_ID'),
        'app_certificate' => env('AGORA_APP_CERTIFICATE'),
    ],

    // Expo Push Notification Gateway
    'expo' => [
        'access_token' => env('EXPO_ACCESS_TOKEN'),
    ],

    // Waydrop Platform Treasury
    'platform' => [
        'treasury_wallet_id' => env('PLATFORM_TREASURY_WALLET_ID'),
    ],

];
