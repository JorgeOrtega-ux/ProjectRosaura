<?php

namespace App\Core\Routing;

class Loader {
    private $viewsPath;

    public function __construct() {
        $this->viewsPath = ROOT_PATH . '/includes/views/';
    }

    public function load($viewName) {
        $file = $this->viewsPath . $viewName;
        
        if (file_exists($file)) {
            require $file;
        } else {
            http_response_code(404);
            echo '<div class="view-content component-message-layout">
                <div class="component-message-box">
                    <div class="component-message-icon-wrapper">
                        <span class="material-symbols-rounded component-message-icon">error_outline</span>
                    </div>
                    <h1 class="component-message-title">' . __('err_problem_occurred') . '</h1>
                    <p class="component-message-desc">' . __('err_load_section') . '</p>
                </div>
            </div>';
        }
    }
}
?>