<?php
// includes/views/canvases/snapshots-gallery.php
?>
<div class="view-content">
    <div class="component-wrapper component-wrapper--full no-padding">

        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title" data-ref="gallery-title"><?php echo __('snapshots_gallery_title_loading'); ?></h1>
            </div>

            <div class="component-top-right">
                <div class="component-actions active"></div>
            </div>
        </div>

        <div class="component-bottom" style="padding: 0;" data-ref="dynamic-content-area">
            <!-- JS inyectará el component-grid o el component-empty-state aquí -->
        </div>

    </div>
</div>
