<?php
$f='scripts/ws_server/src/actions.rs';
$c=file_get_contents($f);
file_put_contents($f, str_replace('"rust_node"', '&state.node_id', $c));

$f2='scripts/ws_server/src/handlers.rs';
$c2=file_get_contents($f2);
file_put_contents($f2, str_replace('"rust_node"', '&state.node_id', $c2));
