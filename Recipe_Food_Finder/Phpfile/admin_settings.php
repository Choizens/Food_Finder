<?php
// Phpfile/admin_settings.php
require_once 'admin_logs_helper.php';

header('Content-Type: application/json');
session_start();

$host = "localhost";
$dbuser = "root";
$dbpass = "";
$dbname = "register";

$conn = new mysqli($host, $dbuser, $dbpass, $dbname);
if ($conn->connect_error) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit;
}
$conn->set_charset("utf8mb4");

// Auth check
$currentUser = $_SESSION['AUTH_SUPER_ADMIN'] ?? $_SESSION['AUTH_ADMIN'] ?? null;
if (!$currentUser) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$admin_username = $currentUser['username'];
$action = $_POST['action'] ?? '';

// ===================================
// UPDATE PROFILE (Email)
// ===================================
if ($action === 'update_profile') {
    $email = $conn->real_escape_string(trim($_POST['email'] ?? ''));

    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['success' => false, 'message' => 'Invalid email address']);
        exit;
    }

    $sql = "UPDATE user_reg SET emailadd = '$email' WHERE username = '$admin_username'";
    if ($conn->query($sql)) {
        // Update session email too
        if (isset($_SESSION['AUTH_SUPER_ADMIN']))
            $_SESSION['AUTH_SUPER_ADMIN']['emailadd'] = $email;
        if (isset($_SESSION['AUTH_ADMIN']))
            $_SESSION['AUTH_ADMIN']['emailadd'] = $email;

        logAdminActivity($conn, 'status_update', $admin_username, "Updated own profile email to: $email");
        echo json_encode(['success' => true, 'message' => 'Profile updated successfully']);
    }
    else {
        echo json_encode(['success' => false, 'message' => 'Update failed: ' . $conn->error]);
    }
}

// ===================================
// CHANGE PASSWORD
// ===================================
elseif ($action === 'change_password') {
    $current = $_POST['current_password'] ?? '';
    $new = $_POST['new_password'] ?? '';

    if (strlen($new) < 8) {
        echo json_encode(['success' => false, 'message' => 'New password must be at least 8 characters']);
        exit;
    }

    // Verify current password
    $res = $conn->query("SELECT password FROM user_reg WHERE username = '$admin_username' LIMIT 1");
    $user = $res->fetch_assoc();

    if (!$user || !password_verify($current, $user['password'])) {
        echo json_encode(['success' => false, 'message' => 'Incorrect current password']);
        exit;
    }

    $hashed = password_hash($new, PASSWORD_DEFAULT);
    $escaped_hashed = $conn->real_escape_string($hashed);

    if ($conn->query("UPDATE user_reg SET password = '$escaped_hashed' WHERE username = '$admin_username'")) {
        logAdminActivity($conn, 'status_update', $admin_username, "Changed own account password");
        echo json_encode(['success' => true, 'message' => 'Password changed successfully']);
    }
    else {
        echo json_encode(['success' => false, 'message' => 'Failed to change password']);
    }
}

else {
    echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

$conn->close();
?>
