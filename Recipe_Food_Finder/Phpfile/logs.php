<?php
session_start();

$host     = "localhost";
$username = "root";
$password = "";
$dbname   = "register";

$conn = new mysqli($host, $username, $password, $dbname);

if ($conn->connect_error) {
    die(json_encode(['status' => 'error', 'message' => 'Database connection failed']));
}

// Ensure required columns exist (added after original schema)
@$conn->query("ALTER TABLE user_reg MODIFY COLUMN status ENUM('active', 'blocked', 'inactive') NOT NULL DEFAULT 'active'");
@$conn->query("ALTER TABLE user_reg ADD COLUMN IF NOT EXISTS last_login DATETIME DEFAULT NULL");

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input_username = trim($_POST['username']);
    $input_password = trim($_POST['password']);

    $sql  = "SELECT * FROM user_reg WHERE username = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $input_username);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $user = $result->fetch_assoc();

        if (password_verify($input_password, $user['password'])) {

            // Ensure column exists for seamless transition
            @$conn->query("ALTER TABLE user_reg ADD COLUMN IF NOT EXISTS created_by_admin TINYINT(1) DEFAULT 0");
            
            // ── 1. Check if blocked or inactive ────────────────────────────
            $status = strtolower(trim($user['status'] ?? 'active'));
            if ($status === 'blocked') {
                echo json_encode([
                    'status'  => 'error',
                    'message' => 'Your account has been blocked by the super admin'
                ]);
                $stmt->close();
                $conn->close();
                exit;
            }
            if ($status === 'inactive') {
                if (isset($user['created_by_admin']) && $user['created_by_admin'] == 1) {
                    // Activate automatically because it was created by super admin
                    $conn->query("UPDATE user_reg SET status = 'active' WHERE id = " . intval($user['id']));
                    $user['status'] = 'active'; // Update local array as well
                } else {
                    echo json_encode([
                        'status'  => 'error',
                        'message' => 'Your account is pending admin approval. Please wait for an administrator to activate your account.'
                    ]);
                    $stmt->close();
                    $conn->close();
                    exit;
                }
            }

            // ── 2. Set session (Namespaced for Multi-Login) ─────────────────
            // Save into specific scope based on role
            $role_lower = strtolower(trim($user['role']));
            if ($role_lower === 'super admin') {
                $_SESSION['AUTH_SUPER_ADMIN'] = $user;
            } elseif ($role_lower === 'admin') {
                $_SESSION['AUTH_ADMIN'] = $user;
            } else {
                $_SESSION['AUTH_USER'] = $user;
            }

            // ── 3. Update last_login ────────────────────────────────────────
            $upd = $conn->prepare("UPDATE user_reg SET last_login = NOW() WHERE id = ?");
            $upd->bind_param("i", $user['id']);
            $upd->execute();
            $upd->close();

            // ── 4. Detect device from User-Agent ───────────────────────────
            $ua     = $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown';
            $device = detectDevice($ua);

            // ── 5. Get IP address ───────────────────────────────────────────
            $ip = $_SERVER['HTTP_X_FORWARDED_FOR']
                ?? $_SERVER['REMOTE_ADDR']
                ?? 'Unknown';

            // ── 6. Add device column if it doesn't exist yet ────────────────
            @$conn->query(
                "ALTER TABLE admin_activity_log
                 ADD COLUMN IF NOT EXISTS device VARCHAR(255) DEFAULT 'Unknown'"
            );

            // ── 7. Log the login event ──────────────────────────────────────
            $role_val   = $conn->real_escape_string($user['role']);
            $uname_esc  = $conn->real_escape_string($user['username']);
            $device_esc = $conn->real_escape_string($device);
            $ip_esc     = $conn->real_escape_string($ip);
            $desc_esc   = "User logged in as $role_val";

            $conn->query(
                "INSERT INTO admin_activity_log
                     (admin_username, action_type, target_user, description, ip_address, device, created_at)
                 VALUES
                     ('$uname_esc', 'login', '$uname_esc', '$desc_esc', '$ip_esc', '$device_esc', NOW())"
            );

            // ── 8. Redirect based on role ───────────────────────────────────
            $role_clean = strtolower(trim($user['role'] ?? 'user'));
            if ($role_clean === 'super admin') {
                $redirect = 'super_admin_dashboard.html';
            } elseif ($role_clean === 'admin') {
                $redirect = 'admin_dashboard.html';
            } else {
                $redirect = 'Dashboard.html';
            }

            echo json_encode(['status' => 'success', 'redirect' => $redirect]);

        } else {
            echo json_encode(['status' => 'error', 'message' => 'Invalid Credentials']);
        }
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Invalid Credentials']);
    }

    $stmt->close();
}

$conn->close();

// ── Device detection helper ─────────────────────────────────────────────────
function detectDevice($ua) {
    $ua_lower = strtolower($ua);

    // Detect OS
    if (strpos($ua_lower, 'windows nt') !== false)   $os = 'Windows';
    elseif (strpos($ua_lower, 'macintosh') !== false) $os = 'macOS';
    elseif (strpos($ua_lower, 'iphone') !== false)    $os = 'iPhone';
    elseif (strpos($ua_lower, 'ipad') !== false)      $os = 'iPad';
    elseif (strpos($ua_lower, 'android') !== false)   $os = 'Android';
    elseif (strpos($ua_lower, 'linux') !== false)     $os = 'Linux';
    else                                              $os = 'Unknown OS';

    // Detect Browser
    if (strpos($ua_lower, 'edg/') !== false)          $browser = 'Edge';
    elseif (strpos($ua_lower, 'chrome') !== false)    $browser = 'Chrome';
    elseif (strpos($ua_lower, 'firefox') !== false)   $browser = 'Firefox';
    elseif (strpos($ua_lower, 'safari') !== false)    $browser = 'Safari';
    elseif (strpos($ua_lower, 'opera') !== false)     $browser = 'Opera';
    else                                              $browser = 'Unknown Browser';

    // Detect type
    $is_mobile = (strpos($ua_lower, 'mobile') !== false || strpos($ua_lower, 'iphone') !== false);
    $type      = $is_mobile ? 'Mobile' : 'Desktop';

    return "$type · $os · $browser";
}
?>