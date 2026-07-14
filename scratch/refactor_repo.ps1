$repoPath = "F:\htdocs\ProjectRosaura\includes\core\Repositories\CanvasRepository.php"
$content = Get-Content $repoPath -Raw

$replacements = @{
    "canvas_favorites" = '" . DB::TBL_CANVAS_FAVORITES . "'
    "canvas_access_requests" = '" . DB::TBL_CANVAS_ACCESS_REQUESTS . "'
    "canvas_user_roles" = '" . DB::TBL_CANVAS_USER_ROLES . "'
    "canvas_roles" = '" . DB::TBL_CANVAS_ROLES . "'
    "canvas_role_permissions" = '" . DB::TBL_CANVAS_ROLE_PERMISSIONS . "'
    "canvas_permissions" = '" . DB::TBL_CANVAS_PERMISSIONS . "'
    "user_templates" = '" . DB::TBL_USER_TEMPLATES . "'
    "canvas_snapshots" = '" . DB::TBL_CANVAS_SNAPSHOTS . "'
    "canvas_reset_settings" = '" . DB::TBL_CANVAS_RESET_SETTINGS . "'
    "canvas_resize_settings" = '" . DB::TBL_CANVAS_RESIZE_SETTINGS . "'
    "canvas_snapshots_likes" = '" . DB::TBL_CANVAS_SNAPSHOTS_LIKES . "'
    "canvas_invites" = '" . DB::TBL_CANVAS_INVITES . "'
}

foreach ($key in $replacements.Keys) {
    # Match whole words (surrounded by word boundaries) to avoid partial replacements
    # For example, we don't want to replace "canvas_snapshots" inside "canvas_snapshots_history"
    # Note: \b doesn't always work perfectly with underscores, so we check for boundaries with lookarounds
    $pattern = "(?<!\w)" + $key + "(?!\w)"
    $content = [System.Text.RegularExpressions.Regex]::Replace($content, $pattern, $replacements[$key])
}

Set-Content -Path $repoPath -Value $content
Write-Host "CanvasRepository.php refactored."
