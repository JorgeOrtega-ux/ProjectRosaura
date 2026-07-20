<?php
require __DIR__ . '/vendor/autoload.php';

use chillerlan\QRCode\QRCode;
use chillerlan\QRCode\QROptions;

$options = new QROptions([
    'version'             => 5,
    'outputType'          => QRCode::OUTPUT_MARKUP_SVG,
    'drawCircularModules' => true,
    'circleRadius'        => 0.45,
    'addQuietzone'        => false,
    'svgAddXmlHeader'     => false,
]);

$qrcode = new QRCode($options);
$svg = $qrcode->render('otpauth://totp/ProjectRosaura:user@test.com?secret=JBSWY3DPEHPK3PXP&issuer=ProjectRosaura');

echo "SUCCESS: SVG Length = " . strlen($svg) . "\n";
