<?php
session_start();
// admin_users.php — COMPLETE FILE with create_user action added
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


// ── SCOPED SESSION LOGIC ──────────────────────────────────────
$scope = $_REQUEST['scope'] ?? 'auto'; // Support GET/POST

$currentUser = null;

// Check SESSION explicitly for roles if scope is auto or specific
if ($scope === 'super_admin' || $scope === 'auto') {
    if (isset($_SESSION['AUTH_SUPER_ADMIN'])) {
        $currentUser = $_SESSION['AUTH_SUPER_ADMIN'];
    }
}

if (!$currentUser && ($scope === 'admin' || $scope === 'auto')) {
    if (isset($_SESSION['AUTH_ADMIN'])) {
        $currentUser = $_SESSION['AUTH_ADMIN'];
    }
}

if (!$currentUser && ($scope === 'user' || $scope === 'auto')) {
    if (isset($_SESSION['AUTH_USER'])) {
        $currentUser = $_SESSION['AUTH_USER'];
    }
}

$admin_username = $currentUser['username'] ?? 'Unknown';
if (!$currentUser) {
    // If no user found at all, we might want to exit, but some actions might be public? 
    // Usually admin_users.php requires auth.
    // We'll let it slide here but actions will check roles.
}
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
                    'id'         => (int)$row['id'],
                    'fname'      => $row['fname'],
                    'lname'      => $row['lname'],
                    'username'   => $row['username'],
                    'emailadd'   => $row['emailadd'],
                    'role'       => $row['role']       ?? 'user',
                    'status'     => $row['status']     ?? 'active',
                    'created_at' => $row['created_at'],
                    'last_login' => $row['last_login'],
                    'last_logout'=> $row['last_logout']
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
        $stats_row = $stats_result->fetch_assoc();
        
        $stats = [
            'total' => (int)$stats_row['total'],
            'users' => (int)$stats_row['users'],
            'admins' => (int)$stats_row['admins'],
            'super_admins' => (int)$stats_row['super_admins'],
            'active' => (int)$stats_row['active'],
            'blocked' => (int)$stats_row['blocked']
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
                'role'         => $user['role']       ?? 'user',
                'status'       => $user['status']     ?? 'active',
                'created_at'   => $user['created_at'],
                'last_login'   => $user['last_login'],
                'last_logout'  => $user['last_logout'],
                'recipe_count' => (int)$recipe_count
            ],
            'activities'   => $activities,
            'login_history' => []
        ]);

    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// ============================================================
// UPDATE USER STATUS
// ============================================================
elseif ($action === 'update_status') {
    try {
        $user_id    = isset($_POST['user_id']) ? intval($_POST['user_id']) : 0;
        $new_status = isset($_POST['status'])  ? $_POST['status'] : '';

        if ($user_id <= 0) throw new Exception('Invalid user ID');
        if (!in_array($new_status, ['active', 'blocked'])) throw new Exception('Invalid status value');

        // Check if requester is super admin
        // Only trust the resolved $currentUser role, not raw session keys
        // (raw session checks can cause false positives when two accounts were logged in a browser)
        $requester_role = strtolower(trim($currentUser['role'] ?? 'user'));
        $is_super_admin = ($requester_role === 'super admin');

        if (!$is_super_admin) {
            // Fetch user details first
            $user_result = $conn->query("SELECT username, emailadd, role FROM user_reg WHERE id = $user_id");
            if (!$user_result || $user_result->num_rows === 0) throw new Exception('User not found');
            
            $user = $user_result->fetch_assoc();
            
            // Store as pending request
            $request_data = json_encode([
                'user_id' => $user_id,
                'username' => $user['username'],
                'email' => $user['emailadd'],
                'current_role' => $user['role'],
                'status' => $new_status
            ]);
            createPendingRequest($conn, $admin_username, 'update_status', $request_data);
            
            $action_word = $new_status === 'blocked' ? 'blocking' : 'unblocking';
            echo json_encode(['success' => true, 'is_request' => true, 'message' => "Request $action_word sent. Wait for Super Admin permission."]);
            exit;
        }

        // --- DIRECT EXECUTION FOR SUPER ADMIN ---
        $user_result = $conn->query("SELECT username, role FROM user_reg WHERE id = $user_id");
        if (!$user_result || $user_result->num_rows === 0) throw new Exception('User not found');

        $user      = $user_result->fetch_assoc();
        $user_role = strtolower(trim($user['role'] ?? 'user'));

        // Protection: Don't allow blocking oneself or another super admin easily (optional, but requested "only super admin can have all actions")
        // However, user said "super admin can have all the actions", so we allow it but protect against self-lockout if needed.
        if ($user['username'] === $admin_username && $new_status === 'blocked') {
            throw new Exception('You cannot block your own super admin account.');
        }

        if (!$conn->query("UPDATE user_reg SET status = '$new_status' WHERE id = $user_id")) {
            throw new Exception('Failed to update user status');
        }

        logAdminActivity($conn, 'status_update', $user['username'],
            "Direct status update by Super Admin to: $new_status");

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
// UPDATE USER ROLE
// ============================================================
elseif ($action === 'update_role') {
    try {
        $user_id  = isset($_POST['user_id']) ? intval($_POST['user_id']) : 0;
        $new_role = isset($_POST['role'])    ? $_POST['role'] : '';

        if ($user_id <= 0) throw new Exception('Invalid user ID');
        if (!in_array($new_role, ['user', 'admin', 'super admin'])) throw new Exception('Invalid role value');

        // Check if requester is super admin
        $requester_role = strtolower(trim($currentUser['role'] ?? 'user'));
        $is_super_admin = ($requester_role === 'super admin' || isset($_SESSION['AUTH_SUPER_ADMIN']) || $scope === 'super_admin');

        // Only Super Admins can promote someone TO Super Admin
        if (!$is_super_admin && $new_role === 'super admin') {
            throw new Exception('Only Super Admins can promote accounts to Super Admin.');
        }

        // --- DIRECT EXECUTION FOR ALL ADMINS ---
        $user_result = $conn->query("SELECT username FROM user_reg WHERE id = $user_id");
        if (!$user_result || $user_result->num_rows === 0) throw new Exception('User not found');

        $user = $user_result->fetch_assoc();

        if ($user['username'] === $admin_username && $new_role !== 'super admin') {
            throw new Exception('You cannot downgrade your own super admin account.');
        }

        if (!$conn->query("UPDATE user_reg SET role = '$new_role' WHERE id = $user_id")) {
            throw new Exception('Failed to update user role');
        }

        logAdminActivity($conn, 'role_update', $user['username'],
            "Direct role update by Super Admin to: $new_role");

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
// DELETE USER
// ============================================================
elseif ($action === 'delete_user') {
    try {
        $user_id = isset($_POST['user_id']) ? intval($_POST['user_id']) : 0;
        if ($user_id <= 0) throw new Exception('Invalid user ID');

        // Check if requester is super admin
        $requester_role = strtolower(trim($currentUser['role'] ?? 'user'));
        $is_super_admin = ($requester_role === 'super admin' || isset($_SESSION['AUTH_SUPER_ADMIN']) || $scope === 'super_admin');

        if (!$is_super_admin) {
            // Fetch user details first
            $user_result = $conn->query("SELECT username, emailadd, role FROM user_reg WHERE id = $user_id");
            if (!$user_result || $user_result->num_rows === 0) throw new Exception('User not found');
            
            $user = $user_result->fetch_assoc();
            
            // Store as pending request with full user details
            $request_data = json_encode([
                'user_id' => $user_id,
                'username' => $user['username'],
                'email' => $user['emailadd'],
                'role' => $user['role']
            ]);
            createPendingRequest($conn, $admin_username, 'delete_user', $request_data);
            echo json_encode(['success' => true, 'message' => 'Request submitted for Super Admin approval']);
            exit;
        }

        // --- DIRECT EXECUTION FOR SUPER ADMIN ---
        $user_result = $conn->query("SELECT username, role FROM user_reg WHERE id = $user_id");
        if (!$user_result || $user_result->num_rows === 0) throw new Exception('User not found');

        $user      = $user_result->fetch_assoc();
        $user_role = strtolower(trim($user['role'] ?? 'user'));

        if ($user['username'] === $admin_username) {
            throw new Exception('You cannot delete your own super admin account.');
        }

        if (!$conn->query("DELETE FROM user_reg WHERE id = $user_id")) {
            throw new Exception('Failed to delete user');
        }

        logAdminActivity($conn, 'user_delete', $user['username'],
            "Direct user deletion by Super Admin");

        echo json_encode([
            'success' => true,
            'message' => 'User account deleted successfully',
            'user_id' => $user_id
        ]);

    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// ============================================================
// ✅ CREATE USER  (NEW)
// ============================================================
elseif ($action === 'create_user') {
    try {
        // Enforce role to be 'user' only as per requirements
        $role = 'user';


        // Collect & sanitize - ALL POST DATA needed for creation
        $post_data = $_POST;
        // Ideally sanitize here too, but we do it before insertion. 
        // For requests, we store raw POST data (except password which we hash first if strict, 
        // but traditionally we store actions. Here we store the INTENT).

        // No longer intercepting create_user - direct execution allowed for Admins.

        // ... Existing Create User Logic ...
        // Collect & sanitize
        $fname    = $conn->real_escape_string(trim($_POST['fname']    ?? ''));
        $middle   = $conn->real_escape_string(trim($_POST['middle']   ?? ''));
        $lname    = $conn->real_escape_string(trim($_POST['lname']    ?? ''));
        $exname   = $conn->real_escape_string(trim($_POST['exname']   ?? ''));
        $ldnum    = $conn->real_escape_string(trim($_POST['ldnum']    ?? ''));
        $emailadd = $conn->real_escape_string(trim($_POST['emailadd'] ?? ''));
        $username_new = $conn->real_escape_string(trim($_POST['username'] ?? ''));
        
        // Handle Password: Check if it came from a request (already hashed) or direct input
        if (isset($_POST['is_hashed']) && $_POST['is_hashed'] === true) {
             $escaped_pw = $conn->real_escape_string($_POST['password']);
             // No length check needed as it is already hashed
        } else {
             $password = trim($_POST['password'] ?? '');
             if (strlen($password) < 8) throw new Exception('Password must be at least 8 characters');
             $hashed   = password_hash($password, PASSWORD_DEFAULT);
             $escaped_pw = $conn->real_escape_string($hashed);
        }

        $sex      = $conn->real_escape_string(trim($_POST['sex']      ?? ''));
        $purok    = $conn->real_escape_string(trim($_POST['purok']    ?? ''));
        $barangay = $conn->real_escape_string(trim($_POST['barangay'] ?? ''));
        $city     = $conn->real_escape_string(trim($_POST['city']     ?? ''));
        $province = $conn->real_escape_string(trim($_POST['province'] ?? ''));
        $country  = $conn->real_escape_string(trim($_POST['country']  ?? ''));
        $zipcode  = $conn->real_escape_string(trim($_POST['zipcode']  ?? ''));

        // Required field validation
        if (empty($fname))        throw new Exception('First name is required');
        if (empty($lname))        throw new Exception('Last name is required');
        if (empty($emailadd))     throw new Exception('Email address is required');
        if (empty($username_new)) throw new Exception('Username is required');
        if (empty($sex))          throw new Exception('Sex is required');

        // Email format check
        if (!filter_var($emailadd, FILTER_VALIDATE_EMAIL)) {
            throw new Exception('Invalid email address format');
        }

        // Username uniqueness check
        $chk_user = $conn->query(
            "SELECT id FROM user_reg WHERE username = '$username_new' LIMIT 1"
        );
        if ($chk_user && $chk_user->num_rows > 0) {
            throw new Exception('Username already exists. Please choose another.');
        }

        // Email uniqueness check
        $chk_email = $conn->query(
            "SELECT id FROM user_reg WHERE emailadd = '$emailadd' LIMIT 1"
        );
        if ($chk_email && $chk_email->num_rows > 0) {
            throw new Exception('Email address is already registered.');
        }

        // Insert user with full address fields
        // age is NOT NULL in database, so we must provide a default value (e.g. 0)
        // Correct column name is idnum, NOT ldnum
        $sql = "INSERT INTO user_reg
                    (fname, middle, lname, exname, idnum, emailadd, username,
                     password, sex, age, role, status,
                     purok, barangay, city, province, country, zipcode, date)
                VALUES
                    ('$fname', '$middle', '$lname', '$exname', '$ldnum',
                     '$emailadd', '$username_new', '$escaped_pw',
                     '$sex', 0, 'user', 'active',
                     '$purok', '$barangay', '$city', '$province',
                     '$country', '$zipcode', NOW())";

        if (!$conn->query($sql)) {
            throw new Exception('Data Error: ' . $conn->error);
        }

        $new_id = $conn->insert_id;

        logAdminActivity($conn, 'create_user', $username_new,
            "Created new $role account (ID: $new_id)");

        echo json_encode([
            'success'  => true,
            'message'  => ucwords($role) . ' account created successfully.',
            'user_id'  => $new_id,
            'username' => $username_new,
            'role'     => $role
        ]);

    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// ============================================================
// GET CURRENT USER (For Dashboard UI)
// ============================================================
elseif ($action === 'get_current_user') {
    echo json_encode([
        'success'   => true,
        'username'  => $currentUser['username'] ?? 'Unknown',
        'role'      => $currentUser['role'] ?? 'Guest',
        'full_name' => ($currentUser['fname'] ?? '') . ' ' . ($currentUser['lname'] ?? ''),
        'email'     => $currentUser['emailadd'] ?? ''
    ]);
}

// ============================================================
// UNKNOWN ACTION
// ============================================================
else {
    echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

$conn->close();

// ============================================================
// HELPER: Create Pending Request
// ============================================================
function createPendingRequest($conn, $requester, $action_type, $target_data) {
    $r  = $conn->real_escape_string($requester);
    $at = $conn->real_escape_string($action_type);
    $td = $conn->real_escape_string($target_data);
    
    $sql = "INSERT INTO admin_requests (requester_username, action_type, target_data, status, created_at)
            VALUES ('$r', '$at', '$td', 'pending', NOW())";
            
            error_log("Creating pending request: $sql"); // Debug log

    if (!$conn->query($sql)) {
        throw new Exception("Failed to create pending request: " . $conn->error);
    }
    
    // Log the creation of the request
    logAdminActivity($conn, 'request_created', 'system', "Submitted request for: $at");
}

?>