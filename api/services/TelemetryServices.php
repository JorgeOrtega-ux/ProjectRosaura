<?php
namespace App\Api\Services;

use App\Config\RedisCache;
use App\Core\System\Logger;
use App\Core\Helpers\Utils;
use App\Core\Helpers\GeoIpHelper;

class TelemetryServices {
    private RedisCache $redis;

    public function __construct(RedisCache $redis) {
        $this->redis = $redis;
    }

    public function logApiLatency(array $data): void {
        $this->pushToQueue('telemetry_api_latency', $data);
    }

    public function logAuthEvent(array $data): void {
        $this->pushToQueue('telemetry_auth', $data);
    }

    public function processFrontendPayload(array $payload, ?string $userUuid, ?string $ipAddress): void {
        if (!isset($payload['type']) || !isset($payload['data'])) {
            return;
        }

        $type = $payload['type'];
        $data = $payload['data'];
        
        $data['user_uuid'] = $userUuid;
        
        if ($ipAddress) {
            $data['ip_address'] = $ipAddress;
        }
        
        if ($type === 'pageview') {
            $this->pushToQueue('telemetry_pageviews', $data);
        } elseif ($type === 'interaction') {
            $this->pushToQueue('telemetry_interactions', $data);
        }
    }

    private function pushToQueue(string $queueName, array $data): void {
        try {
            if (!isset($data['created_at'])) {
                $data['created_at'] = date('Y-m-d H:i:s');
            }

            // Inyección automática del ASN si la IP está presente
            $ip = $data['ip_address'] ?? Utils::getIpAddress();
            if (!isset($data['asn']) && $ip) {
                $data['asn'] = GeoIpHelper::getASN($ip);
            }
            
            $jsonPayload = json_encode($data);
            if ($jsonPayload) {
                $client = $this->redis->getClient();
                if ($client) {
                    $client->rpush($queueName, $jsonPayload);
                }
            }
        } catch (\Exception $e) {
            Logger::error("Telemetry Redis Push Error: " . $e->getMessage());
        }
    }
}
?>