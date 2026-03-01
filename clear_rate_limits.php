<?php
// clear_rate_limits.php

require_once __DIR__ . '/vendor/autoload.php';

use App\Config\RedisCache;
use App\Core\System\Logger;

try {
    // 1. Instanciar la conexión a Redis configurada en tu proyecto
    $redisCache = new RedisCache();
    $client = $redisCache->getClient();

    // 2. Buscar todas las llaves que sigan el patrón de Rate Limiter
    // En tu sistema, las llaves de Redis usan el prefijo "rate_limit:"
    $pattern = 'rate_limit:*';
    $keys = $client->keys($pattern);

    if (!empty($keys)) {
        // 3. Borrar las llaves encontradas
        $client->del($keys);
        
        echo "✅ Éxito: Se han eliminado " . count($keys) . " registros de límites de tasa.";
        Logger::security("Limpieza manual de Rate Limits ejecutada vía script PHP.", 'notice');
    } else {
        echo "ℹ️ Información: No se encontraron límites de tasa activos para borrar.";
    }

} catch (\Exception $e) {
    echo "❌ Error: No se pudo conectar con Redis o ejecutar la limpieza: " . $e->getMessage();
}