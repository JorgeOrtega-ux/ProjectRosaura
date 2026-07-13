<?php
?>
<div class="component-module component-module--sidebar component-module--sidebar-responsive disabled" data-module="moduleTimelapseTools">
    
    <div class="component-menu component-menu--w265 component-menu--h-full component-menu--no-padding disabled" data-ref="menu-timelapse">
        <div class="pill-container"><div class="drag-handle"></div></div>
        
        <div class="component-menu-header">
            <div class="component-menu-header-box">
                <span class="material-symbols-rounded">speed</span>
                <span class="component-menu-header-title">Timelapse Controls</span>
            </div>
        </div>
        
        <div class="component-menu-section-parent">
            <div class="component-menu-center">
                
                <div class="component-menu-section-parent component-menu-section-parent--bordered">
                    <div class="component-menu-top">
                        <div class="component-menu-header-box">
                            <span class="material-symbols-rounded">fast_forward</span>
                            <span class="component-menu-header-title">Speed (Pixels/Frame)</span>
                        </div>
                    </div>
                    <div class="component-menu-bottom">
                        <div class="component-inline-control component-inline-control--full">
                            <div class="component-inline-control__group">
                                <button type="button" class="component-inline-control__btn" data-action="adjustTimelapseSpeed" data-step="fast_down"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                <button type="button" class="component-inline-control__btn" data-action="adjustTimelapseSpeed" data-step="down"><span class="material-symbols-rounded">chevron_left</span></button>
                            </div>
                            <div class="component-inline-control__center" data-ref="val_timelapse_speed" data-val="1">1x</div>
                            <div class="component-inline-control__group">
                                <button type="button" class="component-inline-control__btn" data-action="adjustTimelapseSpeed" data-step="up"><span class="material-symbols-rounded">chevron_right</span></button>
                                <button type="button" class="component-inline-control__btn" data-action="adjustTimelapseSpeed" data-step="fast_up"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
            
            <div class="component-menu-bottom">
                <div class="component-form-group">
                    <button class="component-button component-button--full component-button--primary component-button--h40" data-action="toggleTimelapsePlayPause" data-ref="btn-timelapse-play-pause">
                        <span class="material-symbols-rounded">pause</span> Pause
                    </button>

                    <button class="component-button component-button--full component-button--dark component-button--h40" data-action="restartTimelapse">
                        <span class="material-symbols-rounded">replay</span> Restart
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>
