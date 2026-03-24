<?php
session_start();
header('Content-Type: application/json');

$host     = "localhost";
$username = "root";
$password = "";
$dbname   = "register";

$conn = new mysqli($host, $username, $password, $dbname);

if ($conn->connect_error) {
    echo json_encode(['success' => false, 'message' => 'Connection failed']);
    exit;
}

$userId   = null;
$username = null;

if (isset($_SESSION['AUTH_USER'])) {
    $userId   = $_SESSION['AUTH_USER']['id'] ?? null;
    $username = $_SESSION['AUTH_USER']['username'] ?? null;
} elseif (isset($_SESSION['AUTH_ADMIN'])) {
    $userId   = $_SESSION['AUTH_ADMIN']['id'] ?? null;
    $username = $_SESSION['AUTH_ADMIN']['username'] ?? null;
} elseif (isset($_SESSION['AUTH_SUPER_ADMIN'])) {
    $userId   = $_SESSION['AUTH_SUPER_ADMIN']['id'] ?? null;
    $username = $_SESSION['AUTH_SUPER_ADMIN']['username'] ?? null;
}

if (!$userId && !$username) {
    echo json_encode(['success' => false, 'message' => 'Not logged in', 'logged_out' => true]);
    exit;
}

// Query by ID if available, otherwise by username
if ($userId) {
    $sql = "SELECT status FROM user_reg WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $userId);
} else {
    $sql = "SELECT status FROM user_reg WHERE username = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $username);
}

$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    $user = $result->fetch_assoc();
    $status = strtolower(trim($user['status']));
    
    if ($status === 'blocked') {
        // Clear session if blocked
        session_destroy();
        echo json_encode(['success' => true, 'status' => 'blocked', 'force_logout' => true]);
    } else {
        echo json_encode(['success' => true, 'status' => 'active', 'force_logout' => false]);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'User not found', 'force_logout' => true]);
}

$stmt->close();
$conn->close();
?>
