<?php
$f='actions.tmp.rs';
$c=file_get_contents($f);
file_put_contents('scripts/ws_server/src/actions.rs', str_replace('"rust_node"', '&state.node_id', $c));

$f2='handlers.tmp.rs';
$c2=file_get_contents($f2);
file_put_contents('scripts/ws_server/src/handlers.rs', str_replace('"rust_node"', '&state.node_id', $c2));
