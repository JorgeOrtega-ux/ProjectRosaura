$content = Get-Content -Path 'f:\htdocs\ProjectRosaura\scripts\ws_server\src\actions.rs' -Raw
$content = $content.Replace('"rust_node"', '&state.node_id')
Set-Content -Path 'f:\htdocs\ProjectRosaura\scripts\ws_server\src\actions.rs' -Value $content -NoNewline

$content2 = Get-Content -Path 'f:\htdocs\ProjectRosaura\scripts\ws_server\src\handlers.rs' -Raw
$content2 = $content2.Replace('"rust_node"', '&state.node_id')
Set-Content -Path 'f:\htdocs\ProjectRosaura\scripts\ws_server\src\handlers.rs' -Value $content2 -NoNewline
