<?php
require 'includes/core/bootstrap.php';
$c = new \App\Core\Container();
$sm = $c->get(\App\Core\Interfaces\SessionManagerInterface::class);
var_dump(session_id());
var_dump($_SESSION);
