<?php
$isSpaRequest = !empty($_SERVER['HTTP_X_SPA_REQUEST']);
$isLoggedIn = isset($_SESSION['user_id']);

$target = $isLoggedIn ? '/ProjectRosaura/settings/your-profile' : '/ProjectRosaura/settings/guest';

if ($isSpaRequest) {
    header("X-SPA-Redirect: " . $target);
    exit;
} else {
    header("Location: " . $target);
    exit;
}
?>