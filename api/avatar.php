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

if (!empty($token)) {
    // Restaurar base64 original
    $b64 = strtr($token, '-_', '+/');
    $decoded = base64_decode($b64);
    if ($decoded && strpos($decoded, 'RosauraUser:') === 0) {
        $name = substr($decoded, 12); // Quitar "RosauraUser:"
    }
} else if (isset($_GET['name'])) {
    $name = $_GET['name']; // Fallback por si acaso
}

// Limpiar y obtener inicial
$cleanText = strtoupper(trim(preg_replace('/[^a-zA-Z0-9\s]/', '', $name)));
$initial = substr($cleanText, 0, 1);
if ($initial === '') {
    $initial = 'U';
}

// Colores definidos
$colors = ['2563eb', '16a34a', '7c3aed', 'dc2626', 'ea580c', '374151'];

// Calcular hash para que el mismo nombre siempre tenga el mismo color
$colorIndex = abs(crc32($name)) % count($colors);
$bgColor = '#' . $colors[$colorIndex];

// Definir el SVG
$svg = '<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
    <rect width="256" height="256" fill="' . $bgColor . '"/>
    <text 
        x="50%" 
        y="50%" 
        text-anchor="middle" 
        alignment-baseline="central" 
        dominant-baseline="central"
        font-family="-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif" 
        font-size="120" 
        font-weight="500" 
        fill="#ffffff">
        ' . htmlspecialchars($initial, ENT_XML1, 'UTF-8') . '
    </text>
</svg>';

// Headers HTTP
header('Content-Type: image/svg+xml');
header('Cache-Control: public, max-age=31536000, immutable'); // Caché de 1 año

echo $svg;
exit;
