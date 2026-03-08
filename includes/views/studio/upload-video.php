<?php
// includes/views/studio/upload-video.php
?>
<div class="view-content">
    <div class="component-wrapper component-wrapper--full no-padding">
        <div class="component-view-layout">
            
            <div class="component-view-bottom">
                <div class="component-upload-area" id="videoDropZone">
                    <div class="component-upload-content">
                        <div class="component-upload-icon-wrapper">
                            <span class="material-symbols-rounded component-upload-icon">upload</span>
                        </div>
                        <h2 class="component-upload-title"><?php echo __('studio_upload_drag_drop'); ?></h2>
                        <p class="component-upload-subtitle"><?php echo __('studio_upload_private_warning'); ?></p>
                        
                        <input type="file" id="videoFileInput" class="disabled" multiple accept="video/*">
                        <button class="component-upload-button" type="button" onclick="document.getElementById('videoFileInput').click();"><?php echo __('studio_upload_select_files'); ?></button>
                        
                        <div id="uploadProgressContainer" class="disabled">
                            <div>
                                <div id="uploadProgressBar"></div>
                            </div>
                            <p><?php echo __('studio_upload_uploading'); ?></p>
                        </div>
                    </div>
                    
                    <div class="component-upload-footer">
                        <p class="component-upload-terms">
                            <?php echo __('studio_upload_terms_prefix_1'); ?><a href="#" class="component-upload-terms-link"><?php echo __('studio_upload_terms_link_1'); ?></a><?php echo __('studio_upload_terms_mid'); ?><a href="#" class="component-upload-terms-link"><?php echo __('studio_upload_terms_link_2'); ?></a><?php echo __('studio_upload_terms_suffix_1'); ?><br>
                            <?php echo __('studio_upload_terms_prefix_2'); ?><a href="#" class="component-upload-terms-link"><?php echo __('studio_upload_terms_link_3'); ?></a>
                        </p>
                    </div>
                </div>

            </div>

        </div>
    </div>
</div>