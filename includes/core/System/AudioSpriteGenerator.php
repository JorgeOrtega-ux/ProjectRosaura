<?php

namespace App\Core\System;

class AudioSpriteGenerator {

    /**
     * Genera un Audio Sprite empaquetado (sounds_sprite.mp3 + sounds_sprite.json)
     * concatenando todos los archivos MP3 individuales de la carpeta /public/assets/sounds/
     */
    public static function buildSprite(): array {
        $soundsDir = ROOT_PATH . '/public/assets/sounds/';
        $spriteMp3File = $soundsDir . 'sounds_sprite.mp3';
        $spriteJsonFile = $soundsDir . 'sounds_sprite.json';

        if (!is_dir($soundsDir)) {
            return ['success' => false, 'message' => 'Directory not found'];
        }

        $audioFiles = array_merge(glob($soundsDir . '*.ogg'), glob($soundsDir . '*.mp3'));
        $spriteMap = [];
        $combinedMp3Data = '';
        $currentOffset = 0.0;

        // Mapeo de perfiles conocidos
        $profiles = [
            'orbital_cannon.ogg'         => 'orbital_cannon_1',
            'orbital_cannon_warning.ogg' => 'orbital_cannon_1_warn',
            'atomic_bomb.ogg'            => 'atomic_bomb_1',
            'atomic_bomb_warning.ogg'    => 'atomic_bomb_1_warn',
            'black_hole.ogg'             => 'black_hole_1',
            'black_hole_warning.ogg'     => 'black_hole_1_warn',
            'meteor_shower.ogg'          => 'meteor_shower_1',
            'meteor_shower_warning.ogg'  => 'meteor_shower_1_warn',
            'cluster_bomb.ogg'           => 'cluster_bomb_1',
            'cluster_bomb_warning.ogg'   => 'cluster_bomb_1_warn',
            'pixel_missile.ogg'          => 'pixel_missile_1',
            'pixel_missile_warning.ogg'  => 'pixel_missile_1_warn',
            'pixel_missile_impact.ogg'   => 'pixel_missile_impact',
            'pixel_bomb.ogg'             => 'pixel_bomb_1',
            'pixel_bomb_warning.ogg'     => 'pixel_bomb_1_warn',
            'mines.ogg'                  => 'mines_1',
            'supernova_blast.ogg'        => 'supernova_blast',
            'supernova_blast_warning.ogg'=> 'supernova_blast_warn',
            'ion_strike.ogg'             => 'ion_strike',
            'ion_strike_warning.ogg'     => 'ion_strike_warn',
            'orbital_cannon.mp3'         => 'orbital_cannon_1',
            'orbital_cannon_warning.mp3' => 'orbital_cannon_1_warn',
            'atomic_bomb.mp3'            => 'atomic_bomb_1',
            'atomic_bomb_warning.mp3'    => 'atomic_bomb_1_warn',
            'black_hole.mp3'             => 'black_hole_1',
            'black_hole_warning.mp3'     => 'black_hole_1_warn',
            'meteor_shower.mp3'          => 'meteor_shower_1',
            'meteor_shower_warning.mp3'  => 'meteor_shower_1_warn',
            'cluster_bomb.mp3'           => 'cluster_bomb_1',
            'cluster_bomb_warning.mp3'   => 'cluster_bomb_1_warn',
            'pixel_missile.mp3'          => 'pixel_missile_1',
            'pixel_missile_warning.mp3'  => 'pixel_missile_1_warn',
            'pixel_missile_impact.mp3'   => 'pixel_missile_impact',
            'pixel_bomb.mp3'             => 'pixel_bomb_1',
            'pixel_bomb_warning.mp3'     => 'pixel_bomb_1_warn',
            'mines.mp3'                  => 'mines_1',
            'supernova_blast.mp3'        => 'supernova_blast',
            'supernova_blast_warning.mp3'=> 'supernova_blast_warn',
            'ion_strike.mp3'             => 'ion_strike',
            'ion_strike_warning.mp3'     => 'ion_strike_warn',
        ];

        foreach ($audioFiles as $filePath) {
            $filename = basename($filePath);
            if ($filename === 'sounds_sprite.mp3') continue;

            $key = $profiles[$filename] ?? pathinfo($filename, PATHINFO_FILENAME);
            $content = file_get_contents($filePath);
            if (empty($content)) continue;

            $duration = self::getMp3Duration($filePath);
            if ($duration <= 0) {
                // Fallback aproximado por tamaño (128kbps) si el parser no halla marcos
                $duration = strlen($content) / 16000.0;
            }

            $spriteMap[$key] = [
                'start'    => round($currentOffset, 3),
                'duration' => round($duration, 3)
            ];

            $combinedMp3Data .= $content;
            $currentOffset += $duration;
        }

        file_put_contents($spriteMp3File, $combinedMp3Data);
        file_put_contents($spriteJsonFile, json_encode($spriteMap, JSON_PRETTY_PRINT));

        return [
            'success' => true,
            'sounds_count' => count($spriteMap),
            'total_duration' => round($currentOffset, 2),
            'sprite_mp3' => 'assets/sounds/sounds_sprite.mp3',
            'sprite_json' => 'assets/sounds/sounds_sprite.json'
        ];
    }

    /**
     * Calcula la duración exacta en segundos de un archivo MP3 leyendo las cabeceras MPEG
     */
    private static function getMp3Duration(string $filePath): float {
        $handle = fopen($filePath, 'rb');
        if (!$handle) return 0.0;

        $duration = 0.0;
        $bitrates = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
        $sampleRates = [44100, 48000, 32000];

        while (!feof($handle)) {
            $block = fread($handle, 4);
            if (strlen($block) < 4) break;

            if (ord($block[0]) === 0xFF && (ord($block[1]) & 0xE0) === 0xE0) {
                $bitrateIdx = (ord($block[2]) >> 4) & 0x0F;
                $sampleRateIdx = (ord($block[2]) >> 2) & 0x03;
                $padding = (ord($block[2]) >> 1) & 0x01;

                $bitrate = ($bitrateIdx > 0 && $bitrateIdx < 15) ? $bitrates[$bitrateIdx] * 1000 : 128000;
                $sampleRate = ($sampleRateIdx < 3) ? $sampleRates[$sampleRateIdx] : 44100;

                $frameDuration = 1152 / $sampleRate;
                $duration += $frameDuration;

                $frameLen = (int)floor((144 * $bitrate / $sampleRate) + $padding);
                if ($frameLen > 4) {
                    fseek($handle, $frameLen - 4, SEEK_CUR);
                }
            }
        }
        fclose($handle);
        return $duration;
    }
}
