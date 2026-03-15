<?php
// api/controllers/TrendsController.php

namespace App\Api\Controllers;

use App\Core\Repositories\VideoRepository;
use App\Core\Repositories\RankingRepository;
use App\Core\Repositories\TagRepository;

class TrendsController {
    private $videoRepo;
    private $rankingRepo;
    private $tagRepo;

    public function __construct(VideoRepository $videoRepo, RankingRepository $rankingRepo, TagRepository $tagRepo) {
        $this->videoRepo = $videoRepo;
        $this->rankingRepo = $rankingRepo;
        $this->tagRepo = $tagRepo;
    }

    public function get_dashboard($input) {
        // 1. Obtener datos crudos de los repositorios
        $hero = $this->videoRepo->getTopTrendingVideo();
        $rising = $this->videoRepo->getRisingVideos(12); // Traemos 12 para que el carrusel se vea bien
        $creators = $this->rankingRepo->getTrendingCreators(6);
        $tags = $this->tagRepo->getHotTags(10);

        // 2. Formatear las rutas de las imágenes del Hero Video
        if ($hero) {
            $hero['thumbnail'] = !empty($hero['thumbnail']) 
                ? APP_URL . '/' . $hero['thumbnail'] 
                : APP_URL . '/public/assets/images/default-thumb.png';
        }

        // 3. Formatear los Videos en Ascenso (exactamente como lo requiere tu VideoCardSystem)
        if ($rising) {
            foreach ($rising as &$video) {
                $video['avatar_url'] = !empty($video['avatar_path']) 
                    ? APP_URL . '/' . $video['avatar_path'] 
                    : APP_URL . '/public/storage/profilePictures/default/default.png'; 
                    
                $video['thumbnail_url'] = !empty($video['thumbnail_path'])
                    ? APP_URL . '/' . $video['thumbnail_path']
                    : APP_URL . '/public/assets/images/default-thumb.png'; 

                $video['video_url'] = !empty($video['hls_path'])
                    ? APP_URL . '/' . $video['hls_path']
                    : ''; 

                $video['duration'] = $video['duration'] ?? 0;
                $video['thumbnail_dominant_color'] = $video['thumbnail_dominant_color'] ?? 'transparent';
            }
        }

        // Nota: Los Creadores y Tags no necesitan formateo extra porque 
        // nuestro TrendsController.js de frontend ya está armando sus URLs correctamente.

        // 4. Devolver la respuesta en formato estándar de tu API
        return [
            'success' => true,
            'data' => [
                'hero' => $hero,
                'rising' => $rising,
                'creators' => $creators,
                'tags' => $tags
            ]
        ];
    }
}
?>