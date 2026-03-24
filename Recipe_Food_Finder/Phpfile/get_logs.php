<?php
// ============================================================
// get_logs.php  —  FILE LOCATION: Phpfile/get_logs.php
// ============================================================
header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 0);

$conn = new mysqli("localhost","root","","register");
if ($conn->connect_error) { echo json_encode(['success'=>false,'message'=>'DB error']); exit; }
$conn->set_charset("utf8mb4");

// Add device column silently if missing
@$conn->query("ALTER TABLE admin_activity_log ADD COLUMN IF NOT EXISTS device VARCHAR(255) DEFAULT 'Unknown'");

$action      = $_GET['action'] ?? 'get_all';
$filter_type = $_GET['type']   ?? 'all';
$search      = isset($_GET['search']) ? $conn->real_escape_string(trim($_GET['search'])) : '';
$limit       = isset($_GET['limit'])  ? max(1, intval($_GET['limit']))  : 100;
$offset      = isset($_GET['offset']) ? max(0, intval($_GET['offset'])) : 0;

if ($action === 'get_all') {
    $where = "1=1";
    if ($filter_type !== 'all') {
        $ft    = $conn->real_escape_string($filter_type);
        if ($ft === 'login') {
            // When filtering for logins, we only want the primary login logs.
            // Logouts are fetched via subquery into the login row.
            $where .= " AND action_type = 'login'";
        } else {
            $where .= " AND action_type = '$ft'";
        }
    } else {
        // In "All" view, also exclude standalone logouts as they are merged into login rows.
        $where .= " AND action_type != 'logout'";
    }
    if (!empty($search)) {
        $where .= " AND (admin_username LIKE '%$search%' OR target_user LIKE '%$search%' OR description LIKE '%$search%' OR ip_address LIKE '%$search%' OR COALESCE(device,'') LIKE '%$search%')";
    }

    $total = 0;
    $cr = $conn->query("SELECT COUNT(*) AS t FROM admin_activity_log WHERE $where");
    if ($cr) $total = (int)$cr->fetch_assoc()['t'];

    $logs = [];
    $sql_logs = "SELECT l1.id, l1.admin_username, l1.action_type, l1.target_user, l1.description, l1.ip_address, 
                        COALESCE(l1.device,'Unknown') AS device, l1.created_at,
                        CASE WHEN l1.action_type = 'login' THEN (
                            SELECT MIN(l2.created_at) 
                            FROM admin_activity_log l2 
                            WHERE l2.action_type = 'logout' 
                              AND l2.admin_username = l1.admin_username 
                              AND l2.created_at > l1.created_at
                              AND (SELECT COUNT(*) FROM admin_activity_log l3 
                                   WHERE l3.action_type = 'login' 
                                     AND l3.admin_username = l1.admin_username 
                                     AND l3.created_at > l1.created_at 
                                     AND l3.created_at < l2.created_at) = 0
                        ) ELSE NULL END as session_logout_time
                 FROM admin_activity_log l1 
                 WHERE $where 
                 ORDER BY created_at DESC 
                 LIMIT $limit OFFSET $offset";
    $r = $conn->query($sql_logs);
    if ($r) while ($row = $r->fetch_assoc()) $logs[] = $row;

    $stats = ['total'=>0,'logins'=>0,'status'=>0,'deletes'=>0,'creates'=>0,'roles'=>0];
    $sr = $conn->query("SELECT 
        COUNT(*) AS total_logs, 
        SUM(action_type = 'login') AS login_count, 
        SUM(action_type = 'logout') AS logout_count, 
        SUM(action_type IN ('status_update', 'recipe_update')) AS status_u, 
        SUM(action_type IN ('user_delete', 'recipe_deleted', 'reject_user')) AS deletes, 
        SUM(action_type IN ('create_user', 'approve_user', 'request_created')) AS creates, 
        SUM(action_type = 'role_update') AS roles 
        FROM admin_activity_log");
    if ($sr) { 
        $sd=$sr->fetch_assoc(); 
        $stats=[
            'total'=>(int)($sd['total_logs'] ?? 0),
            'logins'=>(int)($sd['login_count'] ?? 0),
            'logouts'=>(int)($sd['logout_count'] ?? 0),
            'status'=>(int)($sd['status_u'] ?? 0),
            'deletes'=>(int)($sd['deletes'] ?? 0),
            'creates'=>(int)($sd['creates'] ?? 0),
            'roles'=>(int)($sd['roles'] ?? 0)
        ]; 
    }

    echo json_encode(['success'=>true,'logs'=>$logs,'total'=>$total,'stats'=>$stats]);
} else {
    echo json_encode(['success'=>false,'message'=>'Invalid action']);
}
$conn->close();
?>