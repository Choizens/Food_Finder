<?php
session_start();
header('Content-Type: application/json');

// Check all possible auth session scopes
if (isset($_SESSION['AUTH_USER'])) {
    $user = $_SESSION['AUTH_USER'];
} elseif (isset($_SESSION['AUTH_ADMIN'])) {
    $user = $_SESSION['AUTH_ADMIN'];
} elseif (isset($_SESSION['AUTH_SUPER_ADMIN'])) {
    $user = $_SESSION['AUTH_SUPER_ADMIN'];
} else {
    echo json_encode(['success' => false, 'message' => 'Not logged in']);
    exit;
}

// Return only necessary fields for security
echo json_encode([
    'success' => true,
    'user' => [
        'id' => $user['id'],
        'username' => $user['username'],
        'emailadd' => $user['emailadd'],
        'fname' => $user['fname'],
        'role' => $user['role']
    ]
]);
?>
