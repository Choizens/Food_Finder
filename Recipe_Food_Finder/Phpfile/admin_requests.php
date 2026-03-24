<?php
// admin_requests.php
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

session_start();

// ── SCOPED AUTHENTICATION ───────────────────────────────────
$scope = $_REQUEST['scope'] ?? 'auto';
$admin_role     = 'user';
$admin_username = 'Unknown';

// 1. Check Super Admin Scope
if (($scope === 'super_admin' || $scope === 'auto') && isset($_SESSION['AUTH_SUPER_ADMIN'])) {
    $admin_role     = $_SESSION['AUTH_SUPER_ADMIN']['role'];
    $admin_username = $_SESSION['AUTH_SUPER_ADMIN']['username'];
} else {
    // Not authenticated as Super Admin
    echo json_encode(['success' => false, 'message' => 'Unauthorized access']);
    exit;
}

// Only Super Admin can manage requests
if (trim($admin_role) !== 'super admin') {
    echo json_encode(['success' => false, 'message' => 'Unauthorized access']);
    exit;
}

$action = '';
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = $_GET['action'] ?? '';
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
}

// ============================================================
// GET PENDING REQUESTS
// ============================================================
if ($action === 'get_pending') {
    try {
        $requests = [];

        // Only fetch admin action requests (block, role change, delete, etc.)
        $sql = "SELECT * FROM admin_requests WHERE status = 'pending' ORDER BY created_at DESC";
        $result = $conn->query($sql);
        if ($result && $result->num_rows > 0) {
            while ($row = $result->fetch_assoc()) {
                $row['target_data'] = json_decode($row['target_data'], true);
                $requests[] = $row;
            }
        }

        // Also include pending registrations (inactive users)
        $reg_result = $conn->query("SELECT * FROM user_reg WHERE status = 'inactive' ORDER BY id DESC");
        if ($reg_result && $reg_result->num_rows > 0) {
            while ($reg_row = $reg_result->fetch_assoc()) {
                $requests[] = [
                    'id'                  => 'reg_' . $reg_row['id'],
                    'real_id'             => $reg_row['id'],
                    'requester_username'  => $reg_row['username'],
                    'action_type'         => 'register_user',
                    'status'              => 'pending',
                    'target_data'         => [
                        'user_id'  => $reg_row['id'],
                        'username' => $reg_row['username'],
                        'email'    => $reg_row['emailadd'],
                        'fname'    => $reg_row['fname'],
                        'lname'    => $reg_row['lname'],
                        'role'     => $reg_row['role'] ?? 'user',
                    ],
                    'created_at'          => $reg_row['date'] ?? date('Y-m-d H:i:s')
                ];
            }
        }
        
        echo json_encode(['success' => true, 'requests' => $requests]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// ============================================================
// APPROVE REQUEST
// ============================================================
elseif ($action === 'approve') {
    try {
        // Handle Synthesized ID (reg_ID)
        $is_registration = false;
        $real_id = 0;
        
        $request_id_str = $_POST['request_id'] ?? '';
        if (strpos($request_id_str, 'reg_') === 0) {
            $is_registration = true;
            $real_id = intval(substr($request_id_str, 4));
        } else {
            // Numeric admin_requests ID
            $real_id = intval($request_id_str);
            if ($real_id <= 0) throw new Exception('Invalid request ID');
        }

        if ($is_registration) {
            // Fetch registration directly from user_reg
            $stmt = $conn->prepare("SELECT * FROM user_reg WHERE id = ? AND status = 'inactive'");
            $stmt->bind_param("i", $real_id);
            $stmt->execute();
            $result = $stmt->get_result();
            if ($result->num_rows === 0) throw new Exception('Registration not found or already processed');
            
            $user_data = $result->fetch_assoc();
            $type = 'create_user';
            
            // Map user_reg columns to target_data format
            $data = [
                'user_id' => $user_data['id'],
                'username' => $user_data['username'],
                'emailadd' => $user_data['emailadd'],
                'role' => $user_data['role'] ?? 'user',
                'fname' => $user_data['fname'],
                'lname' => $user_data['lname'],
                'age' => $user_data['age'],
                'sex' => $user_data['sex'],
                'is_hashed' => true, // Password already hashed in register
                'password' => $user_data['password']
            ];
            $requester_username = $user_data['username'];
        } else {
            // Fetch from admin_requests
            $stmt = $conn->prepare("SELECT * FROM admin_requests WHERE id = ? AND status = 'pending'");
            $stmt->bind_param("i", $real_id);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows === 0) throw new Exception('Request not found or already processed');
            
            $request = $result->fetch_assoc();
            $data    = json_decode($request['target_data'], true);
            $type    = $request['action_type'];
            $requester_username = $request['requester_username'];
        }
        
        // EXECUTE ACTION based on type
        if (!$is_registration) {
            if ($type === 'create_user') {
                // Logic similar to create_user in admin_users.php
                // Extract data
                $fname    = $conn->real_escape_string($data['fname']);
                $lname    = $conn->real_escape_string($data['lname']);
                $emailadd = $conn->real_escape_string($data['emailadd']);
                $username_new = $conn->real_escape_string($data['username']);
                $role     = $conn->real_escape_string($data['role']);
                $sex      = $conn->real_escape_string($data['sex']);
                $age      = intval($data['age']);
                
                // Handle Password (it might be hashed or plain)
                if (isset($data['is_hashed']) && $data['is_hashed'] === true) {
                    $password = $conn->real_escape_string($data['password']); // Already hashed
                } else {
                     $password = password_hash($data['password'], PASSWORD_DEFAULT); // Hash it now
                     $password = $conn->real_escape_string($password);
                }

                // Optional fields
                $middle   = $conn->real_escape_string($data['middle'] ?? '');
                $exname   = $conn->real_escape_string($data['exname'] ?? '');
                $ldnum    = $conn->real_escape_string($data['ldnum'] ?? '');
                $purok    = $conn->real_escape_string($data['purok'] ?? '');
                $barangay = $conn->real_escape_string($data['barangay'] ?? '');
                $city     = $conn->real_escape_string($data['city'] ?? '');
                $province = $conn->real_escape_string($data['province'] ?? '');
                $country  = $conn->real_escape_string($data['country'] ?? '');
                $zipcode  = $conn->real_escape_string($data['zipcode'] ?? '');
                
                // Check uniqueness again just in case
                $check = $conn->query("SELECT id FROM user_reg WHERE username = '$username_new' OR emailadd = '$emailadd'");
                if ($check->num_rows > 0) throw new Exception('User already exists (username or email)');
                
                 if ($role === 'user') {
                    $sql = "INSERT INTO user_reg
                                (fname, middle, lname, exname, ldnum, emailadd, username,
                                 password, sex, age, role, status,
                                 purok, barangay, city, province, country, zipcode, date)
                            VALUES
                                ('$fname', '$middle', '$lname', '$exname', '$ldnum',
                                 '$emailadd', '$username_new', '$password',
                                 '$sex', $age, 'user', 'active',
                                 '$purok', '$barangay', '$city', '$province',
                                 '$country', '$zipcode', NOW())";
                } else {
                    $sql = "INSERT INTO user_reg
                                (fname, middle, lname, emailadd, username,
                                 password, sex, age, role, status, date)
                            VALUES
                                ('$fname', '$middle', '$lname', '$emailadd',
                                 '$username_new', '$password',
                                 '$sex', $age, '$role', 'active', NOW())";
                }
                
                if (!$conn->query($sql)) throw new Exception("Failed to insert user: " . $conn->error);
                
            } elseif ($type === 'update_status') {
                $user_id = intval($data['user_id']);
                $status  = $conn->real_escape_string($data['status']);
                $conn->query("UPDATE user_reg SET status = '$status' WHERE id = $user_id");
                
            } elseif ($type === 'update_role') {
                $user_id = intval($data['user_id']);
                $role    = $conn->real_escape_string($data['role']);
                $conn->query("UPDATE user_reg SET role = '$role' WHERE id = $user_id");
                
            } elseif ($type === 'delete_user') {
                $user_id = intval($data['user_id']);
                $conn->query("DELETE FROM user_reg WHERE id = $user_id");
            }
        }
        
        // Update request status
        if ($is_registration) {
             $conn->query("UPDATE user_reg SET status = 'active' WHERE id = $real_id");
        } else {
            $conn->query("UPDATE admin_requests SET status = 'approved' WHERE id = $real_id");
        }
        
        // Log it
        logAdminActivity($conn, 'request_approved', $requester_username, "Approved request: $type");
        
        echo json_encode(['success' => true, 'message' => 'Request approved and executed successfully']);
        
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// ============================================================
// REJECT REQUEST
// ============================================================
elseif ($action === 'reject') {
    try {
        $raw_id = $_POST['request_id'] ?? '';
        if (strpos($raw_id, 'reg_') === 0) {
            $real_id = intval(substr($raw_id, 4));
            $conn->query("DELETE FROM user_reg WHERE id = $real_id");
        } else {
            $real_id = intval($raw_id);
            $conn->query("UPDATE admin_requests SET status = 'rejected' WHERE id = $real_id");
        }
        
        // Log it
        logAdminActivity($conn, 'request_rejected', 'system', "Rejected request ID: $raw_id");
        
        echo json_encode(['success' => true, 'message' => 'Request rejected']);
        
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// ============================================================
// DELETE REQUEST (NEW)
// ============================================================
elseif ($action === 'delete') {
    try {
        $request_id = isset($_POST['request_id']) ? intval($_POST['request_id']) : 0;
        if ($request_id <= 0) throw new Exception('Invalid request ID');
        
        $conn->query("DELETE FROM admin_requests WHERE id = $request_id");
        
        // Log it
        logAdminActivity($conn, 'request_deleted', 'system', "Deleted/Purged request ID: $request_id");
        
        echo json_encode(['success' => true, 'message' => 'Request deleted permanently']);
        
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

else {
    echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

$conn->close();

?>
