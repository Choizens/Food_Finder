<?php
// session_info.php — Returns basic info about the currently logged-in admin/super admin user
session_start();
header('Content-Type: application/json');

$user =
    $_SESSION['AUTH_SUPER_ADMIN'] ??
    $_SESSION['AUTH_ADMIN'] ??
    null;

if (!$user) {
    echo json_encode(['success' => false, 'username' => null, 'role' => null]);
    exit;
}

$role = strtolower(trim($user['role'] ?? ''));

// Only return info for admin-level users
if (!in_array($role, ['admin', 'super admin'])) {
    echo json_encode(['success' => false, 'username' => null, 'role' => null]);
    exit;
}

echo json_encode([
    'success'  => true,
    'username' => $user['username'] ?? 'Admin',
    'role'     => $user['role'] ?? 'admin'
]);
?>
