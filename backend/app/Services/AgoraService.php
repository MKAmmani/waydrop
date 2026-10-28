<?php

namespace App\Services;

use RuntimeException;

class AgoraService
{
    private string $appId;

    private string $appCertificate;

    public function __construct()
    {
        $this->appId = config('services.agora.app_id', '');
        $this->appCertificate = config('services.agora.app_certificate', '');
    }

    public function appId(): string
    {
        return $this->appId;
    }

    public function uidForUser(string $userId): int
    {
        $hash = hash('sha256', $userId, true);
        $parts = unpack('Nuid', substr($hash, 0, 4));
        $uid = ((int) ($parts['uid'] ?? 0)) & 0x7FFFFFFF;

        return $uid > 0 ? $uid : 1;
    }

    public function generateRtcToken(string $channelName, int|string $uid, int $expireSeconds = 3600): string
    {
        if (! preg_match('/^[0-9a-f]{32}$/i', $this->appId) || ! preg_match('/^[0-9a-f]{32}$/i', $this->appCertificate)) {
            throw new RuntimeException('Agora credentials are not configured. Set AGORA_APP_ID and AGORA_APP_CERTIFICATE.');
        }

        if ($channelName === '' || strlen($channelName) > 64) {
            throw new RuntimeException('Invalid Agora channel name.');
        }

        $issueTimestamp = time();
        $salt = random_int(1, 99999999);
        $privilegeExpiry = $expireSeconds;
        $uidString = (string) $uid;

        $service = $this->packUint16(1);
        $privileges = [
            1 => $privilegeExpiry,
            2 => $privilegeExpiry,
            3 => $privilegeExpiry,
            4 => $privilegeExpiry,
        ];
        ksort($privileges, SORT_NUMERIC);
        $service .= $this->packUint16(count($privileges));
        foreach ($privileges as $privilege => $expiry) {
            $service .= $this->packUint16($privilege).$this->packUint32($expiry);
        }
        $service .= $this->packString($channelName).$this->packString($uidString);

        $data = $this->packString($this->appId)
            .$this->packUint32($issueTimestamp)
            .$this->packUint32($expireSeconds)
            .$this->packUint32($salt)
            .$this->packUint16(1)
            .$service;

        $firstKey = hash_hmac('sha256', $this->appCertificate, $this->packUint32($issueTimestamp), true);
        $signingKey = hash_hmac('sha256', $firstKey, $this->packUint32($salt), true);
        $signature = hash_hmac('sha256', $data, $signingKey, true);
        $payload = $this->packString($signature).$data;
        $compressed = zlib_encode($payload, ZLIB_ENCODING_DEFLATE);

        if ($compressed === false) {
            throw new RuntimeException('Unable to build Agora token.');
        }

        return '007'.base64_encode($compressed);
    }

    private function packUint16(int $value): string
    {
        return pack('v', $value);
    }

    private function packUint32(int $value): string
    {
        return pack('V', $value);
    }

    private function packString(string $value): string
    {
        return $this->packUint16(strlen($value)).$value;
    }
}
