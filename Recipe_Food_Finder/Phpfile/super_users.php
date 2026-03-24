<?php
session_start();
// super_users.php — SUPER ADMIN ONLY user management
// All actions are executed directly (no pending requests)
require_once 'admin_logs_helper.php';

header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

$servername = "localhost";
$username   = "root";
$password   = "";
$dbname     = "register";

try {
    $conn = new mysqli($servername, $username, $password, $dbname);
    if ($conn->connect_error) {
        throw new Exception('Database connection failed');
    }
    $conn->set_charset("utf8mb4");
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit;
}

// ── SUPER ADMIN AUTH CHECK ─────────────────────────────────────
$currentUser = null;

if (isset($_SESSION['AUTH_SUPER_ADMIN'])) {
    $currentUser = $_SESSION['AUTH_SUPER_ADMIN'];
}

// Deny access if not super admin
if (!$currentUser || strtolower(trim($currentUser['role'] ?? '')) !== 'super admin') {
    echo json_encode(['success' => false, 'message' => 'Access denied. Super Admin only.']);
    exit;
}

$admin_username = $currentUser['username'] ?? 'Unknown';

// ─────────────────────────────────────────────────────────────

$action = '';
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = $_GET['action'] ?? '';
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
}

// ============================================================
// GET ALL USERS
// ============================================================
if ($action === 'get_users') {
    try {
        $role_filter   = isset($_GET['role'])   ? $conn->real_escape_string($_GET['role'])   : 'all';
        $status_filter = isset($_GET['status']) ? $conn->real_escape_string($_GET['status']) : 'all';
        $search        = isset($_GET['search']) ? $conn->real_escape_string($_GET['search']) : '';

        $sql = "SELECT id, fname, lname, username, emailadd, role, status,
                       date AS created_at, last_login, last_logout
                FROM user_reg WHERE 1=1";

        if ($role_filter   !== 'all') $sql .= " AND role = '$role_filter'";
        if ($status_filter !== 'all') $sql .= " AND status = '$status_filter'";
        if (!empty($search)) {
            $sql .= " AND (fname LIKE '%$search%' OR lname LIKE '%$search%'
                         OR username LIKE '%$search%' OR emailadd LIKE '%$search%')";
        }

        $sql   .= " ORDER BY date DESC";
        $result = $conn->query($sql);

        if (!$result) throw new Exception('Query failed: ' . $conn->error);

        $users = [];
        if ($result->num_rows > 0) {
            while ($row = $result->fetch_assoc()) {
                $users[] = [
                    'id'          => (int)$row['id'],
                    'fname'       => $row['fname'],
                    'lname'       => $row['lname'],
                    'username'    => $row['username'],
                    'emailadd'    => $row['emailadd'],
                    'role'        => $row['role']        ?? 'user',
                    'status'      => $row['status']      ?? 'active',
                    'created_at'  => $row['created_at'],
                    'last_login'  => $row['last_login'],
                    'last_logout' => $row['last_logout']
                ];
            }
        }

        $stats_sql = "SELECT
                        COUNT(*) as total,
                        SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as users,
                        SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admins,
                        SUM(CASE WHEN role = 'super admin' THEN 1 ELSE 0 END) as super_admins,
                        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
                        SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blocked
                     FROM user_reg";
        $stats_result = $conn->query($stats_sql);
        $stats_row    = $stats_result->fetch_assoc();

        $stats = [
            'total'        => (int)$stats_row['total'],
            'users'        => (int)$stats_row['users'],
            'admins'       => (int)$stats_row['admins'],
            'super_admins' => (int)$stats_row['super_admins'],
            'active'       => (int)$stats_row['active'],
            'blocked'      => (int)$stats_row['blocked']
        ];

        echo json_encode(['success' => true, 'users' => $users, 'stats' => $stats]);

    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// ============================================================
// GET USER DETAILS
// ============================================================
elseif ($action === 'get_user_details') {
    try {
        $user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;
        if ($user_id <= 0) throw new Exception('Invalid user ID');

        $sql    = "SELECT id, fname, lname, username, emailadd, role, status,
                          date AS created_at, last_login, last_logout
                   FROM user_reg WHERE id = $user_id";
        $result = $conn->query($sql);

        if (!$result || $result->num_rows === 0) throw new Exception('User not found');

        $user = $result->fetch_assoc();

        $recipe_result = $conn->query(
            "SELECT COUNT(*) AS total FROM request_recipes WHERE submitted_by = '" .
            $conn->real_escape_string($user['username']) . "'"
        );
        $recipe_count = $recipe_result ? $recipe_result->fetch_assoc()['total'] : 0;

        $activity_result = $conn->query(
            "SELECT action_type, description, created_at
             FROM admin_activity_log
             WHERE target_user = '" . $conn->real_escape_string($user['username']) . "'
             ORDER BY created_at DESC LIMIT 10"
        );

        $activities = [];
        if ($activity_result && $activity_result->num_rows > 0) {
            while ($row = $activity_result->fetch_assoc()) $activities[] = $row;
        }

        echo json_encode([
            'success' => true,
            'user'    => [
                'id'           => (int)$user['id'],
                'fname'        => $user['fname'],
                'lname'        => $user['lname'],
                'username'     => $user['username'],
                'emailadd'     => $user['emailadd'],
                'role'         => $user['role']        ?? 'user',
                'status'       => $user['status']      ?? 'active',
                'created_at'   => $user['created_at'],
                'last_login'   => $user['last_login'],
                'last_logout'  => $user['last_logout'],
                'recipe_count' => (int)$recipe_count
            ],
            'activities'    => $activities,
            'login_history' => []
        ]);

    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// ============================================================
// UPDATE USER STATUS  (DIRECT — no permission needed)
// ============================================================
elseif ($action === 'update_status') {
    try {
        $user_id    = isset($_POST['user_id']) ? intval($_POST['user_id']) : 0;
        $new_status = isset($_POST['status'])  ? $_POST['status'] : '';

        if ($user_id <= 0) throw new Exception('Invalid user ID');
        if (!in_array($new_status, ['active', 'blocked'])) throw new Exception('Invalid status value');

        $user_result = $conn->query("SELECT username, role FROM user_reg WHERE id = $user_id");
        if (!$user_result || $user_result->num_rows === 0) throw new Exception('User not found');

        $user = $user_result->fetch_assoc();

        // Prevent self-block
        if ($user['username'] === $admin_username && $new_status === 'blocked') {
            throw new Exception('You cannot block your own super admin account.');
        }

        if (!$conn->query("UPDATE user_reg SET status = '$new_status' WHERE id = $user_id")) {
            throw new Exception('Failed to update user status');
        }

        logAdminActivity($conn, 'status_update', $user['username'],
            "Super Admin directly set status to: $new_status");

        echo json_encode([
            'success'    => true,
            'message'    => "User account " . ($new_status === 'blocked' ? 'blocked' : 'unblocked') . " successfully.",
            'user_id'    => $user_id,
            'new_status' => $new_status
        ]);

    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// ============================================================
// UPDATE USER ROLE  (DIRECT)
// ============================================================
elseif ($action === 'update_role') {
    try {
        $user_id  = isset($_POST['user_id']) ? intval($_POST['user_id']) : 0;
        $new_role = isset($_POST['role'])    ? $_POST['role'] : '';

        if ($user_id <= 0) throw new Exception('Invalid user ID');
        if (!in_array($new_role, ['user', 'admin', 'super admin'])) throw new Exception('Invalid role value');

        $user_result = $conn->query("SELECT username FROM user_reg WHERE id = $user_id");
        if (!$user_result || $user_result->num_rows === 0) throw new Exception('User not found');

        $user = $user_result->fetch_assoc();

        // Prevent super admin from downgrading themselves
        if ($user['username'] === $admin_username && $new_role !== 'super admin') {
            throw new Exception('You cannot downgrade your own super admin account.');
        }

        if (!$conn->query("UPDATE user_reg SET role = '$new_role' WHERE id = $user_id")) {
            throw new Exception('Failed to update user role');
        }

        logAdminActivity($conn, 'role_update', $user['username'],
            "Super Admin updated role to: $new_role");

        echo json_encode([
            'success'  => true,
            'message'  => "User role updated to $new_role successfully.",
            'user_id'  => $user_id,
            'new_role' => $new_role
        ]);

    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// ============================================================
// DELETE USER  (DIRECT — Super Admin only)
// ============================================================
elseif ($action === 'delete_user') {
    try {
        $user_id = isset($_POST['user_id']) ? intval($_POST['user_id']) : 0;
        if ($user_id <= 0) throw new Exception('Invalid user ID');

        $user_result = $conn->query("SELECT username, role FROM user_reg WHERE id = $user_id");
        if (!$user_result || $user_result->num_rows === 0) throw new Exception('User not found');

        $user = $user_result->fetch_assoc();

        // Prevent deleting own account
        if ($user['username'] === $admin_username) {
            throw new Exception('You cannot delete your own super admin account.');
        }

        if (!$conn->query("DELETE FROM user_reg WHERE id = $user_id")) {
            throw new Exception('Failed to delete user');
        }

        logAdminActivity($conn, 'user_delete', $user['username'],
            "Super Admin permanently deleted user account");

        echo json_encode([
            'success' => true,
            'message' => 'User account deleted successfully.',
            'user_id' => $user_id
        ]);

    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// ============================================================
// CREATE USER  (Full Registration from Super Admin)
// ============================================================
elseif ($action === 'create_user') {
    try {
        $fname        = $conn->real_escape_string(trim($_POST['firstname']  ?? ''));
        $middle       = $conn->real_escape_string(trim($_POST['middleinitial'] ?? ''));
        $lname        = $conn->real_escape_string(trim($_POST['lastname']   ?? ''));
        $exname       = $conn->real_escape_string(trim($_POST['exname']     ?? ''));
        $idnum        = $conn->real_escape_string(trim($_POST['idno']       ?? ''));
        $emailadd     = $conn->real_escape_string(trim($_POST['email']      ?? ''));
        $username_new = $conn->real_escape_string(trim($_POST['username']   ?? ''));
        
        $role         = $conn->real_escape_string(trim($_POST['role']       ?? 'user'));

        $password_raw = trim($_POST['password'] ?? '');
        if (strlen($password_raw) < 8) throw new Exception('Password must be at least 8 characters');
        $hashed     = password_hash($password_raw, PASSWORD_DEFAULT);
        $escaped_pw = $conn->real_escape_string($hashed);

        $sex      = $conn->real_escape_string(trim($_POST['Sex']      ?? ''));
        $date     = $conn->real_escape_string(trim($_POST['birthdate']?? ''));
        $age      = (int)($_POST['age'] ?? 0);
        
        $purok    = $conn->real_escape_string(trim($_POST['Purok']    ?? ''));
        $barangay = $conn->real_escape_string(trim($_POST['Barangay'] ?? ''));
        $city     = $conn->real_escape_string(trim($_POST['City']     ?? ''));
        $province = $conn->real_escape_string(trim($_POST['Province'] ?? ''));
        $country  = $conn->real_escape_string(trim($_POST['Country']  ?? ''));
        $zipcode  = $conn->real_escape_string(trim($_POST['Z_code']   ?? ''));
        
        $q1_id    = $conn->real_escape_string(trim($_POST['security_q1'] ?? ''));
        $a1       = $conn->real_escape_string(trim($_POST['answer1']     ?? ''));
        $q2_id    = $conn->real_escape_string(trim($_POST['security_q2'] ?? ''));
        $a2       = $conn->real_escape_string(trim($_POST['answer2']     ?? ''));
        $q3_id    = $conn->real_escape_string(trim($_POST['security_q3'] ?? ''));
        $a3       = $conn->real_escape_string(trim($_POST['answer3']     ?? ''));

        if (empty($fname))        throw new Exception('First name is required');
        if (empty($lname))        throw new Exception('Last name is required');
        if (empty($emailadd))     throw new Exception('Email address is required');
        if (empty($username_new)) throw new Exception('Username is required');

        if (!filter_var($emailadd, FILTER_VALIDATE_EMAIL)) {
            throw new Exception('Invalid email address format');
        }

        $chk_user = $conn->query("SELECT id FROM user_reg WHERE username = '$username_new' LIMIT 1");
        if ($chk_user && $chk_user->num_rows > 0) {
            throw new Exception('Username already exists. Please choose another.');
        }

        $chk_email = $conn->query("SELECT id FROM user_reg WHERE emailadd = '$emailadd' LIMIT 1");
        if ($chk_email && $chk_email->num_rows > 0) {
            throw new Exception('Email address is already registered.');
        }

        @$conn->query("ALTER TABLE user_reg ADD COLUMN IF NOT EXISTS created_by_admin TINYINT(1) DEFAULT 0");

        $sql = "INSERT INTO user_reg
                    (fname, middle, lname, exname, idnum, emailadd, username,
                     password, sex, date, age, role, status,
                     purok, barangay, city, province, country, zipcode,
                     q1_id, a1, q2_id, a2, q3_id, a3, created_by_admin)
                VALUES
                    ('$fname', '$middle', '$lname', '$exname', '$idnum',
                     '$emailadd', '$username_new', '$escaped_pw',
                     '$sex', '$date', '$age', '$role', 'inactive',
                     '$purok', '$barangay', '$city', '$province',
                     '$country', '$zipcode',
                     '$q1_id', '$a1', '$q2_id', '$a2', '$q3_id', '$a3', 1)";

        if (!$conn->query($sql)) {
            throw new Exception('Data Error: ' . $conn->error);
        }

        $new_id = $conn->insert_id;

        logAdminActivity($conn, 'create_user', $username_new,
            "Super Admin created new $role account (ID: $new_id) with inactive status");

        echo json_encode([
            'success'  => true,
            'message'  => "User account created successfully as $role.",
            'user_id'  => $new_id,
            'username' => $username_new,
            'role'     => $role
        ]);

    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// ============================================================
// GET CURRENT USER
// ============================================================
elseif ($action === 'get_current_user') {
    echo json_encode([
        'success'   => true,
        'username'  => $currentUser['username'] ?? 'Unknown',
        'role'      => $currentUser['role']      ?? 'Super Admin',
        'full_name' => ($currentUser['fname']    ?? '') . ' ' . ($currentUser['lname'] ?? ''),
        'email'     => $currentUser['emailadd']  ?? ''
    ]);
}

// ============================================================
// UNKNOWN ACTION
// ============================================================
else {
    echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

$conn->close();
?>
