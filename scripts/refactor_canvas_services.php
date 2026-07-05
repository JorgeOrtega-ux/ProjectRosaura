<?php
$filePath = __DIR__ . '/../api/services/CanvasServices.php';
$content = file_get_contents($filePath);

// 1. resizeCanvas
$content = preg_replace(
    '/\$role = \$this->canvasRepository->getMemberRole\(\$canvasId, \$userId\);\s*if \(\$role !== \'admin\'\) \{/',
    'if (!$this->canvasRepository->hasCanvasPermission($canvasId, $userId, \'manage_resets\')) {',
    $content
);

// 2. removeMember
$content = preg_replace(
    '/\$role = \$this->canvasRepository->getMemberRole\(\$canvas\[\'id\'\], \$userId\);\s*if \(!\$role\) \{/',
    'if (!$this->canvasRepository->hasCanvasPermission($canvas[\'id\'], $userId, \'manage_members\') && $userId !== $targetUserId) { // Wait, the context here is removeMember. User can remove themselves.',
    $content
);
// Actually, let's fix removeMember properly:
// The code is: $role = $this->canvasRepository->getMemberRole($canvas['id'], $userId); if (!$role) { return error...
// Wait, is it checking the remover's role?

// Let's do a more careful replacement using multi_replace_file_content instead of regex to avoid breaking things, since context matters.
