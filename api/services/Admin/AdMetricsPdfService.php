<?php

namespace App\Api\Services\Admin;

class AdMetricsPdfService {

    private array $pages = [];
    private string $currentPageStream = '';
    private int $pageCount = 0;

    public function __construct() {
        $this->reset();
    }

    public function reset(): void {
        $this->pages = [];
        $this->currentPageStream = '';
        $this->pageCount = 0;
    }

    private function startNewPage(): void {
        if ($this->currentPageStream !== '') {
            $this->pages[] = $this->currentPageStream;
        }
        $this->currentPageStream = '';
        $this->pageCount++;
    }

    private function endPage(): void {
        if ($this->currentPageStream !== '') {
            $this->pages[] = $this->currentPageStream;
            $this->currentPageStream = '';
        }
    }

    private function escapePdfText(string $text): string {
        $converted = @iconv('UTF-8', 'ISO-8859-1//TRANSLIT', $text);
        if ($converted === false) {
            $converted = utf8_decode($text);
        }
        return str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $converted);
    }

    private function setFillColor(array $rgb): void {
        $r = number_format($rgb[0] / 255, 3, '.', '');
        $g = number_format($rgb[1] / 255, 3, '.', '');
        $b = number_format($rgb[2] / 255, 3, '.', '');
        $this->currentPageStream .= "{$r} {$g} {$b} rg\n";
    }

    private function setStrokeColor(array $rgb): void {
        $r = number_format($rgb[0] / 255, 3, '.', '');
        $g = number_format($rgb[1] / 255, 3, '.', '');
        $b = number_format($rgb[2] / 255, 3, '.', '');
        $this->currentPageStream .= "{$r} {$g} {$b} RG\n";
    }

    private function drawRect(float $x, float $y, float $w, float $h, ?array $fill = null, ?array $stroke = null, float $lineWidth = 1): void {
        if ($stroke) {
            $this->currentPageStream .= "{$lineWidth} w\n";
            $this->setStrokeColor($stroke);
        }
        if ($fill) {
            $this->setFillColor($fill);
        }

        $this->currentPageStream .= sprintf("%.2f %.2f %.2f %.2f re\n", $x, $y, $w, $h);

        if ($fill && $stroke) {
            $this->currentPageStream .= "B\n";
        } elseif ($fill) {
            $this->currentPageStream .= "f\n";
        } elseif ($stroke) {
            $this->currentPageStream .= "S\n";
        }
    }

    private function drawLine(float $x1, float $y1, float $x2, float $y2, array $color, float $width = 1): void {
        $this->currentPageStream .= "{$width} w\n";
        $this->setStrokeColor($color);
        $this->currentPageStream .= sprintf("%.2f %.2f m %.2f %.2f l S\n", $x1, $y1, $x2, $y2);
    }

    private function drawText(string $text, float $x, float $y, string $font = 'F1', float $size = 10, array $color = [30, 41, 59]): void {
        $this->setFillColor($color);
        $escaped = $this->escapePdfText($text);
        $this->currentPageStream .= "BT /{$font} {$size} Tf " . sprintf("%.2f %.2f", $x, $y) . " Td ({$escaped}) Tj ET\n";
    }

    private function drawBadge(string $text, float $x, float $y, array $bgColor, array $textColor, float $fontSize = 8): float {
        $len = strlen($text);
        $width = max(45.0, ($len * ($fontSize * 0.58)) + 14.0);
        $height = $fontSize + 8.0;

        $this->drawRect($x, $y - 3.0, $width, $height, $bgColor);
        $this->drawText($text, $x + 7.0, $y + 1.0, 'F2', $fontSize, $textColor);

        return $width;
    }

    private function drawHeader(string $superTitle, string $mainTitle, string $reportCode): void {
        // Dark premium brand top header bar
        $this->drawRect(40, 770, 515, 50, [15, 23, 42]);
        $this->drawRect(40, 767, 515, 3, [2, 132, 199]); // Accent line

        // Brand & title
        $this->drawText('PROJECT ROSAURA', 55, 797, 'F2', 14, [255, 255, 255]);
        $this->drawText(strtoupper($superTitle), 55, 780, 'F1', 8, [148, 163, 184]);

        // Right side info
        $this->drawText(strtoupper($mainTitle), 360, 797, 'F2', 9, [255, 255, 255]);
        $this->drawText("REPORTE: " . $reportCode, 360, 780, 'F1', 8, [148, 163, 184]);

        // Meta info line under header
        $now = date('d/m/Y H:i:s');
        $this->drawText("Emitido el: " . $now . " | Servidor Oficial Project Rosaura", 42, 750, 'F1', 8, [100, 116, 139]);
        $this->drawLine(40, 742, 555, 742, [226, 232, 240], 1);
    }

    private function drawFooter(int $pageNum, int $total): void {
        $this->drawLine(40, 50, 555, 50, [226, 232, 240], 1);
        $this->drawText("Project Rosaura Analytics Engine © " . date('Y') . " - Documento Confidencial de Auditoria", 40, 38, 'F1', 7.5, [148, 163, 184]);
        $this->drawText("Pagina {$pageNum} de {$total}", 495, 38, 'F1', 7.5, [148, 163, 184]);
    }

    private function drawKpiCard(float $x, float $y, float $w, float $h, string $title, string $value, string $subtitle, array $topColor): void {
        // Card background
        $this->drawRect($x, $y, $w, $h, [248, 250, 252], [226, 232, 240], 1);
        // Top accent line
        $this->drawRect($x, $y + $h - 3, $w, 3, $topColor);

        // Titles and Value
        $this->drawText(strtoupper($title), $x + 10, $y + $h - 16, 'F2', 7.5, [100, 116, 139]);
        $this->drawText($value, $x + 10, $y + $h - 35, 'F2', 15, [15, 23, 42]);
        $this->drawText($subtitle, $x + 10, $y + 10, 'F1', 7.5, [148, 163, 184]);
    }

    public function generateIndividualAdReport(array $ad, array $summary, array $dailyBreakdown): string {
        $this->reset();
        $this->startNewPage();

        $adTitle = $ad['title'] ?? ($ad['name'] ?? 'Anuncio');
        $sponsor = $ad['sponsor_label'] ?? ($ad['provider_name'] ?? 'General');
        $format = $ad['format'] ?? 'feed';
        $status = strtoupper($ad['status'] ?? 'ACTIVE');
        $targetUrl = !empty($ad['target_url']) ? $ad['target_url'] : 'Sin enlace directo';
        $reportCode = 'AD-' . strtoupper(substr(md5($ad['uuid'] ?? (string)time()), 0, 8));

        // Format label
        $formatLabels = [
            'feed' => 'Feed Principal (Home / Busqueda)',
            'module_colors' => 'Modulo: Paleta de Colores',
            'module_templates' => 'Modulo: Plantillas',
            'module_info' => 'Modulo: Informacion de Lienzo',
            'banner' => 'Banner Publicitario',
            'custom' => 'Personalizado'
        ];
        $formatText = $formatLabels[$format] ?? ucfirst($format);

        $this->drawHeader('AUDITORIA DE ANUNCIO INDIVIDUAL', 'METRICAS Y RENDIMIENTO', $reportCode);

        // Section 1: Ad Information Box
        $boxY = 645;
        $boxH = 88;
        $this->drawRect(40, $boxY, 515, $boxH, [255, 255, 255], [226, 232, 240], 1);
        $this->drawRect(40, $boxY + $boxH - 24, 515, 24, [241, 245, 249]);

        $this->drawText("INFORMACION DEL ANUNCIO Y CONFIGURACION", 50, $boxY + $boxH - 16, 'F2', 8.5, [30, 41, 59]);

        // Status Badge in header of info box
        $statusBg = ($status === 'ACTIVE') ? [220, 252, 231] : [254, 226, 226];
        $statusText = ($status === 'ACTIVE') ? [22, 101, 52] : [153, 27, 27];
        $this->drawBadge($status === 'ACTIVE' ? 'ACTIVO' : 'INACTIVO', 475, $boxY + $boxH - 18, $statusBg, $statusText, 7.5);

        // Fields inside Info Box
        $this->drawText("Titulo / Campana:", 50, $boxY + 46, 'F2', 8, [100, 116, 139]);
        $this->drawText(mb_strimwidth($adTitle, 0, 45, '...'), 145, $boxY + 46, 'F2', 8.5, [15, 23, 42]);

        $this->drawText("Patrocinador:", 50, $boxY + 28, 'F2', 8, [100, 116, 139]);
        $this->drawText(mb_strimwidth($sponsor, 0, 45, '...'), 145, $boxY + 28, 'F1', 8.5, [15, 23, 42]);

        $this->drawText("URL de Destino:", 50, $boxY + 10, 'F2', 8, [100, 116, 139]);
        $this->drawText(mb_strimwidth($targetUrl, 0, 50, '...'), 145, $boxY + 10, 'F1', 8, [2, 132, 199]);

        $this->drawText("Formato / Zona:", 340, $boxY + 46, 'F2', 8, [100, 116, 139]);
        $this->drawText(mb_strimwidth($formatText, 0, 30, '...'), 425, $boxY + 46, 'F1', 8, [15, 23, 42]);

        $createdStr = !empty($ad['created_at']) ? explode(' ', $ad['created_at'])[0] : date('Y-m-d');
        $this->drawText("Fecha Creacion:", 340, $boxY + 28, 'F2', 8, [100, 116, 139]);
        $this->drawText($createdStr, 425, $boxY + 28, 'F1', 8.5, [15, 23, 42]);

        $expText = !empty($ad['expiration_date']) ? explode(' ', $ad['expiration_date'])[0] : 'Sin expiracion';
        $this->drawText("Vigencia:", 340, $boxY + 10, 'F2', 8, [100, 116, 139]);
        $this->drawText($expText, 425, $boxY + 10, 'F1', 8.5, [15, 23, 42]);

        // Section 2: KPI Metrics Cards
        $kpiY = 570;
        $cardW = 122;
        $cardH = 62;
        $gap = 9;

        $totImpressions = number_format((int)($summary['total_impressions'] ?? 0));
        $totClicks = number_format((int)($summary['total_clicks'] ?? 0));
        $ctrVal = number_format((float)($summary['ctr'] ?? 0), 2) . '%';
        $uniqueUsers = number_format((int)($summary['unique_users'] ?? 0));

        $this->drawKpiCard(40, $kpiY, $cardW, $cardH, 'Impresiones (Vistas)', $totImpressions, 'Impactos visuales', [2, 132, 199]);
        $this->drawKpiCard(40 + ($cardW + $gap), $kpiY, $cardW, $cardH, 'Clics Totales', $totClicks, 'Interaccion directa', [16, 185, 129]);
        $this->drawKpiCard(40 + ($cardW + $gap) * 2, $kpiY, $cardW, $cardH, 'CTR Promedio', $ctrVal, 'Clics / Impresiones', [139, 92, 246]);
        $this->drawKpiCard(40 + ($cardW + $gap) * 3, $kpiY, $cardW, $cardH, 'Usuarios Unicos', $uniqueUsers, 'Alcance estimado', [245, 158, 11]);

        // Section 3: Performance Table (Daily Breakdown)
        $tblY = 525;
        $this->drawText("HISTORIAL DE RENDIMIENTO DIARIO (ULTIMOS REGISTROS)", 40, $tblY, 'F2', 9, [15, 23, 42]);
        $this->drawText("Monitoreo continuo de eventos", 390, $tblY, 'F1', 7.5, [100, 116, 139]);

        // Table header
        $thY = $tblY - 22;
        $this->drawRect(40, $thY, 515, 18, [15, 23, 42]);
        $this->drawText("FECHA", 50, $thY + 5, 'F2', 7.5, [255, 255, 255]);
        $this->drawText("IMPRESIONES", 160, $thY + 5, 'F2', 7.5, [255, 255, 255]);
        $this->drawText("CLICS", 270, $thY + 5, 'F2', 7.5, [255, 255, 255]);
        $this->drawText("CTR (%)", 370, $thY + 5, 'F2', 7.5, [255, 255, 255]);
        $this->drawText("ESTADO DE RENDIMIENTO", 450, $thY + 5, 'F2', 7.5, [255, 255, 255]);

        $rowY = $thY - 18;
        $rowCount = 0;
        $maxRows = 16;

        if (empty($dailyBreakdown)) {
            $this->drawRect(40, $rowY, 515, 24, [248, 250, 252], [226, 232, 240], 1);
            $this->drawText("No hay registros diarios de interaccion registrados todavia.", 155, $rowY + 8, 'F1', 8.5, [148, 163, 184]);
            $rowY -= 28;
        } else {
            foreach ($dailyBreakdown as $day) {
                if ($rowCount >= $maxRows) break;

                $bg = ($rowCount % 2 === 0) ? [255, 255, 255] : [248, 250, 252];
                $this->drawRect(40, $rowY, 515, 18, $bg, [241, 245, 249], 0.5);

                $dayDate = $day['date_only'] ?? $day['date'] ?? date('Y-m-d');
                $dayImp = (int)($day['impressions'] ?? 0);
                $dayClk = (int)($day['clicks'] ?? 0);
                $dayCtr = ($dayImp > 0) ? round(($dayClk / $dayImp) * 100, 2) : 0;

                $perfText = ($dayCtr >= 2.0) ? 'Optimo' : (($dayCtr > 0.5) ? 'Normal' : 'Bajo');
                $perfColor = ($dayCtr >= 2.0) ? [22, 101, 52] : (($dayCtr > 0.5) ? [30, 41, 59] : [100, 116, 139]);

                $this->drawText($dayDate, 50, $rowY + 5, 'F1', 8, [30, 41, 59]);
                $this->drawText(number_format($dayImp), 160, $rowY + 5, 'F2', 8, [15, 23, 42]);
                $this->drawText(number_format($dayClk), 270, $rowY + 5, 'F2', 8, [16, 185, 129]);
                $this->drawText(number_format($dayCtr, 2) . '%', 370, $rowY + 5, 'F2', 8, [139, 92, 246]);
                $this->drawText($perfText, 450, $rowY + 5, 'F1', 8, $perfColor);

                $rowY -= 18;
                $rowCount++;
            }
        }

        // Section 4: Resources & Media Attached
        if ($rowY > 140 && !empty($ad['resources'])) {
            $this->drawText("RECURSOS Y CREATIVOS ASOCIADOS", 40, $rowY - 10, 'F2', 8.5, [15, 23, 42]);
            $resBoxY = $rowY - 60;
            $this->drawRect(40, $resBoxY, 515, 42, [248, 250, 252], [226, 232, 240], 1);

            $resCount = count($ad['resources']);
            $resSummary = [];
            foreach ($ad['resources'] as $res) {
                $resSummary[] = strtoupper($res['resource_type'] ?? 'MEDIO') . ' (' . basename($res['content_url'] ?? 'script') . ')';
            }
            $resStr = implode(', ', array_slice($resSummary, 0, 3));
            if ($resCount > 3) $resStr .= " y " . ($resCount - 3) . " mas...";

            $this->drawText("Total de creativos registrados: " . $resCount, 50, $resBoxY + 24, 'F2', 8, [30, 41, 59]);
            $this->drawText(mb_strimwidth($resStr, 0, 95, '...'), 50, $resBoxY + 10, 'F1', 7.5, [100, 116, 139]);
        }

        // Certification Seal Box
        $certY = 62;
        $this->drawRect(40, $certY, 515, 28, [241, 245, 249], [226, 232, 240], 1);
        $this->drawText("CERTIFICACION DE INTEGRIDAD: Reporte generado de manera automatica por el modulo de publicidad.", 50, $certY + 15, 'F2', 7, [71, 85, 105]);
        $this->drawText("Los datos mostrados corresponden a metricas directas de interaccion validadas contra bots e impresiones fraudulentas.", 50, $certY + 6, 'F1', 6.5, [148, 163, 184]);

        $this->drawFooter(1, 1);
        $this->endPage();

        return $this->compilePdf();
    }

    public function generateGlobalAdsReport(array $globalSummary, array $providersBreakdown, array $formatsBreakdown, array $topAds): string {
        $this->reset();
        $this->startNewPage();

        $reportCode = 'GLOBAL-' . strtoupper(substr(md5((string)time()), 0, 8));
        $this->drawHeader('AUDITORIA GLOBAL DE PUBLICIDAD', 'ESTADISTICAS DE TODA LA PLATAFORMA', $reportCode);

        // Section 1: Top Macro KPI Cards
        $kpiY = 665;
        $cardW = 97;
        $cardH = 62;
        $gap = 7.5;

        $totProviders = number_format((int)($globalSummary['total_providers'] ?? 0));
        $totAds = number_format((int)($globalSummary['total_ads'] ?? 0));
        $totImpressions = number_format((int)($globalSummary['total_impressions'] ?? 0));
        $totClicks = number_format((int)($globalSummary['total_clicks'] ?? 0));
        $ctrAvg = number_format((float)($globalSummary['average_ctr'] ?? 0), 2) . '%';

        $this->drawKpiCard(40, $kpiY, $cardW, $cardH, 'Proveedores', $totProviders, 'Redes y Directos', [2, 132, 199]);
        $this->drawKpiCard(40 + ($cardW + $gap), $kpiY, $cardW, $cardH, 'Anuncios Totales', $totAds, 'Creativos activos', [16, 185, 129]);
        $this->drawKpiCard(40 + ($cardW + $gap) * 2, $kpiY, $cardW, $cardH, 'Impresiones Totales', $totImpressions, 'Vistas globales', [139, 92, 246]);
        $this->drawKpiCard(40 + ($cardW + $gap) * 3, $kpiY, $cardW, $cardH, 'Clics Totales', $totClicks, 'Interaccion total', [245, 158, 11]);
        $this->drawKpiCard(40 + ($cardW + $gap) * 4, $kpiY, $cardW, $cardH, 'CTR Promedio', $ctrAvg, 'Tasa de respuesta', [239, 68, 68]);

        // Section 2: Breakdown by Provider Table
        $provY = 635;
        $this->drawText("RENDIMIENTO CONSOLIDADO POR PROVEEDOR PUBLICITARIO", 40, $provY, 'F2', 9, [15, 23, 42]);

        $thY = $provY - 20;
        $this->drawRect(40, $thY, 515, 18, [15, 23, 42]);
        $this->drawText("PROVEEDOR / RED", 50, $thY + 5, 'F2', 7.5, [255, 255, 255]);
        $this->drawText("TIPO", 195, $thY + 5, 'F2', 7.5, [255, 255, 255]);
        $this->drawText("ANUNCIOS", 280, $thY + 5, 'F2', 7.5, [255, 255, 255]);
        $this->drawText("IMPRESIONES", 345, $thY + 5, 'F2', 7.5, [255, 255, 255]);
        $this->drawText("CLICS", 435, $thY + 5, 'F2', 7.5, [255, 255, 255]);
        $this->drawText("CTR (%)", 495, $thY + 5, 'F2', 7.5, [255, 255, 255]);

        $rowY = $thY - 17;
        $rowCount = 0;
        if (empty($providersBreakdown)) {
            $this->drawRect(40, $rowY, 515, 20, [248, 250, 252], [226, 232, 240], 1);
            $this->drawText("No hay proveedores publicitarios registrados.", 180, $rowY + 6, 'F1', 8, [148, 163, 184]);
            $rowY -= 24;
        } else {
            foreach ($providersBreakdown as $p) {
                if ($rowCount >= 7) break;
                $bg = ($rowCount % 2 === 0) ? [255, 255, 255] : [248, 250, 252];
                $this->drawRect(40, $rowY, 515, 17, $bg, [241, 245, 249], 0.5);

                $pName = mb_strimwidth($p['name'] ?? 'Proveedor', 0, 26, '...');
                $pType = (($p['provider_type'] ?? 'direct') === 'network') ? 'Red Programatica' : 'Anunciante Directo';
                $pAds = (int)($p['total_ads'] ?? 0);
                $pImp = (int)($p['total_impressions'] ?? 0);
                $pClk = (int)($p['total_clicks'] ?? 0);
                $pCtr = ($pImp > 0) ? round(($pClk / $pImp) * 100, 2) : 0;

                $this->drawText($pName, 50, $rowY + 5, 'F2', 8, [15, 23, 42]);
                $this->drawText($pType, 195, $rowY + 5, 'F1', 7.5, [71, 85, 105]);
                $this->drawText((string)$pAds, 280, $rowY + 5, 'F1', 8, [15, 23, 42]);
                $this->drawText(number_format($pImp), 345, $rowY + 5, 'F2', 8, [2, 132, 199]);
                $this->drawText(number_format($pClk), 435, $rowY + 5, 'F2', 8, [16, 185, 129]);
                $this->drawText(number_format($pCtr, 2) . '%', 495, $rowY + 5, 'F2', 8, [139, 92, 246]);

                $rowY -= 17;
                $rowCount++;
            }
        }

        // Section 3: Distribution by Format / Placement
        $fmtY = $rowY - 15;
        $this->drawText("DISTRIBUCION POR UBICACION Y FORMATO PUBLICITARIO", 40, $fmtY, 'F2', 9, [15, 23, 42]);

        $fmtThY = $fmtY - 18;
        $this->drawRect(40, $fmtThY, 515, 18, [30, 41, 59]);
        $this->drawText("ZONA / FORMATO", 50, $fmtThY + 5, 'F2', 7.5, [255, 255, 255]);
        $this->drawText("ANUNCIOS", 240, $fmtThY + 5, 'F2', 7.5, [255, 255, 255]);
        $this->drawText("IMPRESIONES", 345, $fmtThY + 5, 'F2', 7.5, [255, 255, 255]);
        $this->drawText("CLICS", 435, $fmtThY + 5, 'F2', 7.5, [255, 255, 255]);
        $this->drawText("CTR (%)", 495, $fmtThY + 5, 'F2', 7.5, [255, 255, 255]);

        $fmtRowY = $fmtThY - 17;
        $fmtIndex = 0;
        foreach ($formatsBreakdown as $fmtKey => $fmtData) {
            if ($fmtIndex >= 5) break;
            $bg = ($fmtIndex % 2 === 0) ? [255, 255, 255] : [248, 250, 252];
            $this->drawRect(40, $fmtRowY, 515, 17, $bg, [241, 245, 249], 0.5);

            $label = $fmtData['label'] ?? ucfirst($fmtKey);
            $fAds = (int)($fmtData['total_ads'] ?? 0);
            $fImp = (int)($fmtData['total_impressions'] ?? 0);
            $fClk = (int)($fmtData['total_clicks'] ?? 0);
            $fCtr = ($fImp > 0) ? round(($fClk / $fImp) * 100, 2) : 0;

            $this->drawText($label, 50, $fmtRowY + 5, 'F1', 8, [15, 23, 42]);
            $this->drawText((string)$fAds, 240, $fmtRowY + 5, 'F1', 8, [71, 85, 105]);
            $this->drawText(number_format($fImp), 345, $fmtRowY + 5, 'F2', 8, [2, 132, 199]);
            $this->drawText(number_format($fClk), 435, $fmtRowY + 5, 'F2', 8, [16, 185, 129]);
            $this->drawText(number_format($fCtr, 2) . '%', 495, $fmtRowY + 5, 'F2', 8, [139, 92, 246]);

            $fmtRowY -= 17;
            $fmtIndex++;
        }

        // Section 4: Top Performing Ads Ranking
        $topY = $fmtRowY - 15;
        if ($topY > 120 && !empty($topAds)) {
            $this->drawText("TOP ANUNCIOS CON MAYOR IMPACTO Y RESPUESTA", 40, $topY, 'F2', 9, [15, 23, 42]);

            $topThY = $topY - 18;
            $this->drawRect(40, $topThY, 515, 18, [15, 23, 42]);
            $this->drawText("#", 50, $topThY + 5, 'F2', 7.5, [255, 255, 255]);
            $this->drawText("TITULO DEL ANUNCIO", 70, $topThY + 5, 'F2', 7.5, [255, 255, 255]);
            $this->drawText("PATROCINADOR", 260, $topThY + 5, 'F2', 7.5, [255, 255, 255]);
            $this->drawText("IMPRESIONES", 365, $topThY + 5, 'F2', 7.5, [255, 255, 255]);
            $this->drawText("CLICS", 440, $topThY + 5, 'F2', 7.5, [255, 255, 255]);
            $this->drawText("CTR (%)", 495, $topThY + 5, 'F2', 7.5, [255, 255, 255]);

            $topRowY = $topThY - 17;
            $rank = 1;
            foreach ($topAds as $tAd) {
                if ($topRowY < 85 || $rank > 5) break;

                $bg = ($rank % 2 === 0) ? [248, 250, 252] : [255, 255, 255];
                $this->drawRect(40, $topRowY, 515, 17, $bg, [241, 245, 249], 0.5);

                $tTitle = mb_strimwidth($tAd['title'] ?? ($tAd['name'] ?? 'Anuncio'), 0, 32, '...');
                $tSponsor = mb_strimwidth($tAd['sponsor_label'] ?? ($tAd['provider_name'] ?? 'General'), 0, 20, '...');
                $tImp = (int)($tAd['impressions'] ?? 0);
                $tClk = (int)($tAd['clicks'] ?? 0);
                $tCtr = ($tImp > 0) ? round(($tClk / $tImp) * 100, 2) : 0;

                $this->drawText((string)$rank, 50, $topRowY + 5, 'F2', 8, [2, 132, 199]);
                $this->drawText($tTitle, 70, $topRowY + 5, 'F2', 8, [15, 23, 42]);
                $this->drawText($tSponsor, 260, $topRowY + 5, 'F1', 7.5, [71, 85, 105]);
                $this->drawText(number_format($tImp), 365, $topRowY + 5, 'F1', 8, [15, 23, 42]);
                $this->drawText(number_format($tClk), 440, $topRowY + 5, 'F2', 8, [16, 185, 129]);
                $this->drawText(number_format($tCtr, 2) . '%', 495, $topRowY + 5, 'F2', 8, [139, 92, 246]);

                $topRowY -= 17;
                $rank++;
            }
        }

        // Bottom seal
        $sealY = 58;
        $this->drawRect(40, $sealY, 515, 24, [241, 245, 249], [226, 232, 240], 1);
        $this->drawText("INFORME EJECUTIVO CONSOLIDADO - Datos globales calculados a partir de telemetria en tiempo real.", 50, $sealY + 12, 'F2', 7, [71, 85, 105]);
        $this->drawText("Project Rosaura Ad Server v2.0 - Todos los derechos reservados.", 50, $sealY + 4, 'F1', 6.5, [148, 163, 184]);

        $this->drawFooter(1, 1);
        $this->endPage();

        return $this->compilePdf();
    }

    private function compilePdf(): string {
        $numPages = count($this->pages);
        if ($numPages === 0) {
            $numPages = 1;
            $this->pages = [""];
        }

        // Object map:
        // 1: Catalog
        // 2: Pages
        // 3: Font F1 (Helvetica)
        // 4: Font F2 (Helvetica-Bold)
        // 5: Font F3 (Helvetica-Oblique)
        // Page 1: Obj 6, Content 1: Obj 7
        // Page 2: Obj 8, Content 2: Obj 9 ...

        $pageObjIds = [];
        $contentObjIds = [];
        $nextId = 6;

        for ($i = 0; $i < $numPages; $i++) {
            $pageObjIds[$i] = $nextId++;
            $contentObjIds[$i] = $nextId++;
        }

        $kids = [];
        foreach ($pageObjIds as $pid) {
            $kids[] = "{$pid} 0 R";
        }
        $kidsStr = implode(' ', $kids);

        $pdf = "%PDF-1.4\n";

        // 1 0 obj Catalog
        $pdf .= "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";

        // 2 0 obj Pages
        $pdf .= "2 0 obj\n<< /Type /Pages /Kids [{$kidsStr}] /Count {$numPages} >>\nendobj\n";

        // 3 0 obj Helvetica
        $pdf .= "3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n";

        // 4 0 obj Helvetica-Bold
        $pdf .= "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n";

        // 5 0 obj Helvetica-Oblique
        $pdf .= "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>\nendobj\n";

        // Pages and Contents
        for ($i = 0; $i < $numPages; $i++) {
            $pid = $pageObjIds[$i];
            $cid = $contentObjIds[$i];
            $stream = $this->pages[$i];
            $len = strlen($stream);

            $pdf .= "{$pid} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents {$cid} 0 R >>\nendobj\n";
            $pdf .= "{$cid} 0 obj\n<< /Length {$len} >>\nstream\n{$stream}\nendstream\nendobj\n";
        }

        $totalObjs = $nextId - 1;
        $xrefOffset = strlen($pdf);

        $xref = "xref\n0 " . ($totalObjs + 1) . "\n0000000000 65535 f \n";

        for ($obj = 1; $obj <= $totalObjs; $obj++) {
            $pos = strpos($pdf, "{$obj} 0 obj");
            if ($pos !== false) {
                $xref .= sprintf("%010d 00000 n \n", $pos);
            } else {
                $xref .= "0000000000 00000 n \n";
            }
        }

        $trailer = "trailer\n<< /Size " . ($totalObjs + 1) . " /Root 1 0 R >>\nstartxref\n{$xrefOffset}\n%%EOF";

        return $pdf . $xref . $trailer;
    }
}
