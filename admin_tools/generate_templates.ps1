Add-Type -AssemblyName System.Drawing

$scriptDir = Split-Path -Path $MyInvocation.MyCommand.Definition -Parent
$projectRoot = Split-Path -Path $scriptDir -Parent
$mastersDir = Join-Path $projectRoot "public\assets\img\templates\masters"
$targetDir = Join-Path $projectRoot "public\assets\img\templates"
$templatesConfigPath = Join-Path $projectRoot "public\assets\config\canvas_templates.json"

if (!(Test-Path $templatesConfigPath)) {
    Write-Error "Config file canvas_templates.json not found!"
    exit 1
}

# Parse canvas_templates.json to see what templates are registered and their configured sizes
$templatesConfig = Get-Content -Raw -Path $templatesConfigPath | ConvertFrom-Json

function Process-Image {
    param (
        [string]$SourcePath,
        [string]$TargetPath,
        [int]$TargetWidth,
        [int]$TargetHeight
    )
    
    if (!(Test-Path $SourcePath)) {
        Write-Warning "Source image not found: $SourcePath"
        return
    }

    Write-Host "Generating: $TargetWidth x $TargetHeight -> $TargetPath"
    
    $src = [System.Drawing.Image]::FromFile($SourcePath)
    $srcWidth = $src.Width
    $srcHeight = $src.Height
    
    $targetAspect = $TargetWidth / $TargetHeight
    $srcAspect = $srcWidth / $srcHeight
    
    $cropWidth = $srcWidth
    $cropHeight = $srcHeight
    $cropX = 0
    $cropY = 0
    
    if ($srcAspect -gt $targetAspect) {
        $cropWidth = [int]($srcHeight * $targetAspect)
        $cropX = [int](($srcWidth - $cropWidth) / 2)
    } elseif ($srcAspect -lt $targetAspect) {
        $cropHeight = [int]($srcWidth / $targetAspect)
        $cropY = [int](($srcHeight - $cropHeight) / 2)
    }
    
    $bmp = New-Object System.Drawing.Bitmap($TargetWidth, $TargetHeight)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    
    # Use NearestNeighbor to preserve pixel-art crispness
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
    
    $srcRect = New-Object System.Drawing.Rectangle($cropX, $cropY, $cropWidth, $cropHeight)
    $destRect = New-Object System.Drawing.Rectangle(0, 0, $TargetWidth, $TargetHeight)
    
    $g.DrawImage($src, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
    
    $g.Dispose()
    $src.Dispose()
    
    $bmp.Save($TargetPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

foreach ($tpl in $templatesConfig) {
    $id = $tpl.id
    $masterPath = Join-Path $mastersDir "${id}.jpg"
    
    # Create subfolder for this template
    $tplSubdir = Join-Path $targetDir $id
    if (!(Test-Path $tplSubdir)) {
        New-Item -ItemType Directory -Force -Path $tplSubdir | Out-Null
    }
    
    # Generate all registered sizes
    foreach ($sizeStr in $tpl.sizes) {
        $parts = $sizeStr.Split('x')
        $w = [int]$parts[0]
        $h = [int]$parts[1]
        
        $destPath = Join-Path $tplSubdir "${sizeStr}.png"
        Process-Image -SourcePath $masterPath -TargetPath $destPath -TargetWidth $w -TargetHeight $h
    }
    
    # Generate thumbnail
    $thumbPath = Join-Path $tplSubdir "thumbnail.png"
    Process-Image -SourcePath $masterPath -TargetPath $thumbPath -TargetWidth 128 -TargetHeight 128
}

Write-Host "Finished processing all templates!"
