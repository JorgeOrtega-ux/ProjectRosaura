<?php
// api/avatar.php
// Generador dinámico de avatares en SVG

// Prevenir salidas accidentales (espacios en blanco, errores de otras librerías)
ob_start();
ini_set('display_errors', '0');
error_reporting(E_ALL);

// Limpiar el búfer antes de enviar los headers
while (ob_get_level() > 0) {
    ob_end_clean();
}

$token = $_GET['token'] ?? '';
$name = 'U';
$seed = '';

if (!empty($token)) {
    // Restaurar base64 original
    $b64 = strtr($token, '-_', '+/');
    $decoded = base64_decode($b64);
    if ($decoded && (strpos($decoded, 'SpriteboardUser:') === 0 || strpos($decoded, 'RosauraUser:') === 0)) {
        $prefixLen = strpos($decoded, 'SpriteboardUser:') === 0 ? 16 : 12;
        $payload = substr($decoded, $prefixLen);
        $parts = explode(':', $payload, 2);
        $name = $parts[0];
        if (isset($parts[1])) {
            $seed = $parts[1];
        }
    }
} else if (isset($_GET['name'])) {
    $name = $_GET['name']; // Fallback por si acaso
}

// Limpiar y obtener inicial de forma segura con UTF-8
$cleanText = trim(preg_replace('/[^\p{L}\p{N}\s]/u', '', $name));
$initial = mb_substr($cleanText, 0, 1, 'UTF-8');
$initial = mb_strtoupper($initial, 'UTF-8');
if ($initial === '') {
    $initial = 'U';
}

// Colores definidos
$colors = ['2563eb', '16a34a', '7c3aed', 'dc2626', 'ea580c', '374151'];

// Calcular hash para que el mismo usuario siempre tenga el mismo color (basado en seed o nombre)
$hashInput = !empty($seed) ? $seed : $name;
$colorIndex = abs(crc32(mb_strtolower($hashInput, 'UTF-8'))) % count($colors);
$bgColor = '#' . $colors[$colorIndex];

// Definir el SVG con alineación mejorada (bold y dy=.04em para centrado óptimo de mayúsculas)
$svg = '<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
    <rect width="256" height="256" fill="' . $bgColor . '"/>
    <text 
        x="50%" 
        y="50%" 
        text-anchor="middle" 
        dominant-baseline="central"
        dy="-0.06em"
        font-family="-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif" 
        font-size="140" 
        font-weight="500" 
        fill="#ffffff">
        ' . htmlspecialchars($initial, ENT_XML1, 'UTF-8') . '
    </text>
</svg>';

// Headers HTTP
header('Content-Type: image/svg+xml');
header('Cache-Control: public, max-age=86400, must-revalidate'); // Caché de 24 horas con revalidación

echo $svg;
exit;
