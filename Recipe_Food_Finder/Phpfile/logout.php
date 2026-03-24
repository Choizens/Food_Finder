<?php
session_start();
$scope = $_POST['scope'] ?? $_GET['scope'] ?? 'all';

// Identify the user we are logging out
$userToLogout = null;
if ($scope === 'super_admin' && isset($_SESSION['AUTH_SUPER_ADMIN'])) {
    $userToLogout = $_SESSION['AUTH_SUPER_ADMIN'];
} elseif ($scope === 'admin' && isset($_SESSION['AUTH_ADMIN'])) {
    $userToLogout = $_SESSION['AUTH_ADMIN'];
} elseif ($scope === 'user' && isset($_SESSION['AUTH_USER'])) {
    $userToLogout = $_SESSION['AUTH_USER'];
} elseif ($scope === 'all') {
    // If logging out all, just pick the highest precedence user to log the action
    $userToLogout = $_SESSION['AUTH_SUPER_ADMIN'] ?? $_SESSION['AUTH_ADMIN'] ?? $_SESSION['AUTH_USER'] ?? null;
}

// Ensure device column logic and logging
if ($userToLogout) {
    $conn = new mysqli('localhost', 'root', '', 'register');
    if (!$conn->connect_error) {
        $conn->set_charset("utf8mb4");

        // Helper function for device detection
        function detectDeviceLogout($ua) {
            $ua_lower = strtolower($ua);
            if (strpos($ua_lower, 'windows nt') !== false)   $os = 'Windows';
            elseif (strpos($ua_lower, 'macintosh') !== false) $os = 'macOS';
            elseif (strpos($ua_lower, 'iphone') !== false)    $os = 'iPhone';
            elseif (strpos($ua_lower, 'ipad') !== false)      $os = 'iPad';
            elseif (strpos($ua_lower, 'android') !== false)   $os = 'Android';
            elseif (strpos($ua_lower, 'linux') !== false)     $os = 'Linux';
            else                                              $os = 'Unknown OS';

            if (strpos($ua_lower, 'edg/') !== false)          $browser = 'Edge';
            elseif (strpos($ua_lower, 'chrome') !== false)    $browser = 'Chrome';
            elseif (strpos($ua_lower, 'firefox') !== false)   $browser = 'Firefox';
            elseif (strpos($ua_lower, 'safari') !== false)    $browser = 'Safari';
            elseif (strpos($ua_lower, 'opera') !== false)     $browser = 'Opera';
            else                                              $browser = 'Unknown Browser';

            $is_mobile = (strpos($ua_lower, 'mobile') !== false || strpos($ua_lower, 'iphone') !== false);
            $type      = $is_mobile ? 'Mobile' : 'Desktop';
            return "$type · $os · $browser";
        }

        $ua     = $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown';
        $ip     = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? 'Unknown';
        $device = detectDeviceLogout($ua);

        $uname_esc  = $conn->real_escape_string($userToLogout['username'] ?? 'Unknown');
        $role_val   = $conn->real_escape_string($userToLogout['role'] ?? 'user');
        $device_esc = $conn->real_escape_string($device);
        $ip_esc     = $conn->real_escape_string($ip);
        $desc_esc   = "User logged out as $role_val";

        // Record the logout log
        $conn->query(
            "INSERT INTO admin_activity_log
                 (admin_username, action_type, target_user, description, ip_address, device, created_at)
             VALUES
                 ('$uname_esc', 'logout', '$uname_esc', '$desc_esc', '$ip_esc', '$device_esc', NOW())"
        );
        $conn->query(
            "UPDATE user_reg SET last_logout = NOW() WHERE username = '$uname_esc'"
        );
        $conn->close();
    }
}

// Execute the session deletion
if ($scope === 'super_admin') {
    unset($_SESSION['AUTH_SUPER_ADMIN']);
} elseif ($scope === 'admin') {
    unset($_SESSION['AUTH_ADMIN']);
} elseif ($scope === 'user') {
    unset($_SESSION['AUTH_USER']);
} else {
    // Default: Destroy everything
    session_unset();
    session_destroy();
}

if (isset($_GET['forced']) && $_GET['forced'] == '1') {
    header('Location: ../home.html?blocked=1');
    exit;
}

echo json_encode(['success' => true, 'message' => 'Logged out successfully']);
exit;
?>
