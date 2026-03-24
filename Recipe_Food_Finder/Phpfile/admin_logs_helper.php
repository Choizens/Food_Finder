<?php
// Phpfile/admin_logs_helper.php
// Centralized logging helper for admin and super admin actions

if (!function_exists('logAdminActivity')) {
    function logAdminActivity($conn, $action_type, $target_user, $description) {
        // Detect current session to get admin username
        $admin_username = 'Unknown';
        
        if (isset($_SESSION['AUTH_SUPER_ADMIN'])) {
            $admin_username = $_SESSION['AUTH_SUPER_ADMIN']['username'];
        } elseif (isset($_SESSION['AUTH_ADMIN'])) {
            $admin_username = $_SESSION['AUTH_ADMIN']['username'];
        }

        $a  = $conn->real_escape_string($admin_username);
        $at = $conn->real_escape_string($action_type);
        $tu = $conn->real_escape_string($target_user);
        $d  = $conn->real_escape_string($description);
        
        // IP address
        $ip = $_SERVER['HTTP_X_FORWARDED_FOR']
            ?? $_SERVER['REMOTE_ADDR']
            ?? 'Unknown';
        $ip = $conn->real_escape_string($ip);

        // Device detection
        $ua = $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown';
        $device = detectDeviceForLog($ua);
        $dev = $conn->real_escape_string($device);

        // Ensure table exists (optional, usually handled once)
        // @$conn->query("ALTER TABLE admin_activity_log ADD COLUMN IF NOT EXISTS device VARCHAR(255) DEFAULT 'Unknown'");

        $sql = "INSERT INTO admin_activity_log 
                    (admin_username, action_type, target_user, description, ip_address, device, created_at)
                VALUES 
                    ('$a', '$at', '$tu', '$d', '$ip', '$dev', NOW())";
        
        return $conn->query($sql);
    }
}

if (!function_exists('detectDeviceForLog')) {
    function detectDeviceForLog($ua) {
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
}
?>
