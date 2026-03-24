<?php
// get_user_requests.php — Handles fetching, approving, and rejecting pending user registrations
session_start();
header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 0);

$host   = "localhost";
$dbuser = "root";
$dbpass = "";
$dbname = "register";

$conn = new mysqli($host, $dbuser, $dbpass, $dbname);
if ($conn->connect_error) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit;
}
$conn->set_charset("utf8mb4");

// ── Ensure the `status` column exists (added later, not in original schema) ──
$conn->query(
    "ALTER TABLE user_reg MODIFY COLUMN status ENUM('active', 'blocked', 'inactive') NOT NULL DEFAULT 'active'"
);
// Also ensure `last_login` column exists
$conn->query(
    "ALTER TABLE user_reg ADD COLUMN IF NOT EXISTS last_login DATETIME DEFAULT NULL"
);

// ── Auth check: admin OR super admin session ──────────────────────────────
$currentUser =
    $_SESSION['AUTH_SUPER_ADMIN'] ??
    $_SESSION['AUTH_ADMIN'] ??
    $_SESSION['AUTH_USER'] ?? null;      // fallback — actual role check below

if (!$currentUser) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized — please log in as admin.']);
    exit;
}
$roleCheck = strtolower(trim($currentUser['role'] ?? 'user'));
if (!in_array($roleCheck, ['admin', 'super admin'])) {
    echo json_encode(['success' => false, 'message' => 'Access denied — admin only.']);
    exit;
}

$admin_username = $currentUser['username'] ?? 'unknown';
$action = $_REQUEST['action'] ?? '';

// ============================================================
// GET PENDING REGISTRATIONS
// ============================================================
if ($action === 'get_pending') {
    $result = $conn->query(
        "SELECT id, fname, middle, lname, exname, username, emailadd, sex, date,
                purok, barangay, city, province, country, zipcode
         FROM user_reg
         WHERE status = 'inactive'
         ORDER BY id DESC"
    );

    $users = [];
    if ($result && $result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $users[] = $row;
        }
    }

    // Error check on query
    if ($result === false) {
        echo json_encode(['success' => false, 'message' => 'Query failed: ' . $conn->error]);
        exit;
    }

    $countRes = $conn->query("SELECT COUNT(*) AS total FROM user_reg WHERE status = 'inactive'");
    $total    = $countRes ? (int)$countRes->fetch_assoc()['total'] : 0;

    echo json_encode(['success' => true, 'users' => $users, 'total' => $total]);

// ============================================================
// APPROVE (activate) A PENDING USER
// ============================================================
} elseif ($action === 'approve') {
    $user_id = intval($_POST['user_id'] ?? 0);
    if ($user_id <= 0) {
        echo json_encode(['success' => false, 'message' => 'Invalid user ID']);
        exit;
    }

    // Fetch username for logging
    $uRes = $conn->query("SELECT username FROM user_reg WHERE id = $user_id LIMIT 1");
    if (!$uRes || $uRes->num_rows === 0) {
        echo json_encode(['success' => false, 'message' => 'User not found']);
        exit;
    }
    $uRow = $uRes->fetch_assoc();

    if (!$conn->query("UPDATE user_reg SET status = 'active' WHERE id = $user_id")) {
        echo json_encode(['success' => false, 'message' => 'Failed to approve user: ' . $conn->error]);
        exit;
    }

    // Log the action
    $uname = $conn->real_escape_string($uRow['username']);
    $admin = $conn->real_escape_string($admin_username);
    $conn->query(
        "INSERT INTO admin_activity_log (admin_username, action_type, target_user, description, created_at)
         VALUES ('$admin', 'approve_user', '$uname', 'Approved pending registration for $uname', NOW())"
    );

    echo json_encode(['success' => true, 'message' => "User \"$uname\" has been approved and activated."]);

// ============================================================
// REJECT (delete) A PENDING USER
// ============================================================
} elseif ($action === 'reject') {
    $user_id = intval($_POST['user_id'] ?? 0);
    if ($user_id <= 0) {
        echo json_encode(['success' => false, 'message' => 'Invalid user ID']);
        exit;
    }

    // Fetch username for logging
    $uRes = $conn->query("SELECT username FROM user_reg WHERE id = $user_id LIMIT 1");
    if (!$uRes || $uRes->num_rows === 0) {
        echo json_encode(['success' => false, 'message' => 'User not found']);
        exit;
    }
    $uRow = $uRes->fetch_assoc();
    $uname = $conn->real_escape_string($uRow['username']);

    if (!$conn->query("DELETE FROM user_reg WHERE id = $user_id")) {
        echo json_encode(['success' => false, 'message' => 'Failed to reject user: ' . $conn->error]);
        exit;
    }

    // Log the action
    $admin = $conn->real_escape_string($admin_username);
    $conn->query(
        "INSERT INTO admin_activity_log (admin_username, action_type, target_user, description, created_at)
         VALUES ('$admin', 'reject_user', '$uname', 'Rejected and deleted pending registration for $uname', NOW())"
    );

    echo json_encode(['success' => true, 'message' => "Registration for \"$uname\" has been rejected and removed."]);

} else {
    echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

$conn->close();
?>
