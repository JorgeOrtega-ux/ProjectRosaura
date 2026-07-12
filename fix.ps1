$content = Get-Content F:\htdocs\ProjectRosaura\public\assets\css\components\components.css -Raw
$startStr = ".component-snapshot-card {"
$endStr = ".component-wrapper[data-ref=`"design-wrapper`"],"

$startIdx = $content.IndexOf($startStr)
$endIdx = $content.IndexOf($endStr)

if ($startIdx -ge 0 -and $endIdx -ge 0) {
    $before = $content.Substring(0, $startIdx)
    $after = $content.Substring($endIdx)
    
    $newCss = ".component-snapshot-card {
    height: 180px;
    background-color: #e9ecef;
    border-radius: 12px;
    position: relative;
    outline: 2px solid transparent;
    outline-offset: 0px;
    transition: outline 0.2s ease, outline-offset 0.2s ease, transform 0.2s ease;
    cursor: pointer;
    text-decoration: none;
}

.component-snapshot-card::after {
    content: '';
    position: absolute;
    inset: 0;
    box-shadow: inset 0px -70px 50px -20px rgba(0, 0, 0, 0.7);
    pointer-events: none;
    z-index: 2; 
    border-radius: inherit; 
}

.component-snapshot-card:hover {
    outline: 2px solid var(--text-primary, #000000);
    outline-offset: 2px;
}

.component-snapshot-card__image {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    image-rendering: pixelated;
    z-index: 1; 
    pointer-events: none;
    border-radius: inherit; 
}

.component-snapshot-link {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: flex-end;
    padding: 20px;
    text-decoration: none;
    z-index: 10; 
    border-radius: inherit;
}

.component-snapshot-title {
    margin: 0; 
    color: #ffffff; 
    font-size: 1.25rem; 
    font-family: inherit;
    text-shadow: 0px 2px 4px rgba(0,0,0,0.6);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
}

.component-snapshot-skeleton {
    height: 180px;
    border-radius: 12px;
    background: linear-gradient(90deg, var(--bg-tertiary) 25%, var(--bg-secondary) 50%, var(--bg-tertiary) 75%);
    background-size: 200% 100%;
    animation: loadingSkeleton 1.5s infinite;
}

@keyframes loadingSkeleton {
    0% {
        background-position: 200% 0;
    }
    100% {
        background-position: -200% 0;
    }
}

.component-snapshot-actions-wrapper {
    position: absolute;
    top: 12px;
    right: 12px;
    z-index: 20; 
    width: auto;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.2s ease, visibility 0.2s ease;
}

.component-snapshot-card:hover .component-snapshot-actions-wrapper,
.component-snapshot-actions-wrapper:has(.component-module.active) {
    opacity: 1;
    visibility: visible;
}

.component-snapshot-actions {
    background-color: var(--bg-surface, #ffffff);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--shadow-card, 0 2px 8px rgba(0,0,0,0.15));
    padding: 2px; 
}

"

    Set-Content -Path F:\htdocs\ProjectRosaura\public\assets\css\components\components.css -Value ($before + $newCss + $after) -NoNewline -Encoding UTF8
    Write-Host "Success"
} else {
    Write-Host "Failed"
}
