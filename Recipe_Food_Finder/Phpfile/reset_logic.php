<?php

require_once dirname(__DIR__) . '/vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

header('Content-Type: application/json');

// Use your actual database name 'register'
$conn = new mysqli("localhost", "root", "", "register");

if ($conn->connect_error) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
if (!$data || !isset($data['action'])) {
    echo json_encode(['success' => false, 'message' => 'Invalid Request']);
    exit;
}

$action = $data['action'];


// --- STEP 1: SEND OTP (Unique Recipe_Food_Finder Design) ---
if ($action == 'send_otp') {
    $email = $conn->real_escape_string($data['email']);
    $check = $conn->query("SELECT fname FROM user_reg WHERE emailadd = '$email'"); 

    if ($check->num_rows > 0) {
        $user = $check->fetch_assoc();
        $otp = rand(100000, 999999);
        
        $conn->query("DELETE FROM authentication_code WHERE email = '$email'");
        $conn->query("INSERT INTO authentication_code (email, otp_code, created_at) VALUES ('$email', '$otp', NOW())");

        $mail = new PHPMailer(true);
        try {
            $mail->isSMTP();
            $mail->Host       = 'smtp.gmail.com';
            $mail->SMTPAuth   = true;
            $mail->Username   = 'teofilochristian37@gmail.com'; 
            $mail->Password   = 'cedx ytcc lhnu nzti'; 
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port       = 587;

            $mail->setFrom('teofilochristian37@gmail.com', 'Recipe_Food_Finder'); 
            $mail->addAddress($email);

            $mail->isHTML(true);
            $mail->Subject = 'Verify Your Identity - Recipe_Food_Finder';

            // Formal & Unique HTML Template
            $mail->Body = "
            <div style='background-color: #1a1a1a; padding: 50px 20px; font-family: \"Helvetica Neue\", Helvetica, Arial, sans-serif;'>
                <table align='center' border='0' cellpadding='0' cellspacing='0' width='100%' style='max-width: 550px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);'>
                    <tr>
                        <td align='center' style='padding: 30px; background-color: #222222;'>
                            <h1 style='color: #f39c12; margin: 0; font-size: 22px; letter-spacing: 3px; text-transform: uppercase;'>Recipe_Food_Finder</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style='padding: 40px 40px 20px 40px; text-align: center;'>
                            <h2 style='color: #333333; font-size: 24px; margin-bottom: 10px;'>Identity Verification</h2>
                            <p style='color: #666666; font-size: 16px;'>Hello " . htmlspecialchars($user['fname']) . ",</p>
                            <p style='color: #666666; font-size: 16px; line-height: 1.5;'>Please use the secure code below to finalize your password reset request. This code is strictly confidential.</p>
                        </td>
                    </tr>
                    <tr>
                        <td align='center' style='padding: 0 40px 40px 40px;'>
                            <div style='background-color: #fdf2e9; border: 1px solid #f39c12; border-radius: 8px; padding: 20px; display: inline-block;'>
                                <span style='font-size: 40px; font-weight: bold; color: #d35400; letter-spacing: 8px; font-family: monospace;'>$otp</span>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style='padding: 0 40px 40px 40px; text-align: center;'>
                            <p style='color: #999999; font-size: 13px;'>Expires in 2 minutes (120 seconds).</p>
                            <div style='height: 1px; background-color: #eeeeee; margin: 20px 0;'></div>
                            <p style='color: #cccccc; font-size: 11px;'>If you did not make this request, please disregard this email or contact support.</p>
                        </td>
                    </tr>
                </table>
                <p style='text-align: center; color: #555555; font-size: 12px; margin-top: 20px;'>&copy; 2026 Recipe_Food_Finder Official Platform</p>
            </div>";

            $mail->send();
            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => 'Mailer Error: ' . $mail->ErrorInfo]);
        }
    } else {
        echo json_encode(['success' => false, 'message' => 'Email not found.']);
    }
}

// --- STEP 2: VERIFY OTP (With 2-Minute Limit) ---
if ($action == 'verify_otp') {
    $email = $conn->real_escape_string($data['email']);
    $otp = $conn->real_escape_string($data['otp']);

    // Verify OTP and 2-minute limit
    $res = $conn->query("SELECT * FROM authentication_code WHERE email = '$email' AND otp_code = '$otp' AND created_at >= NOW() - INTERVAL 120 SECOND ORDER BY id DESC LIMIT 1");
    
    if ($res->num_rows > 0) {
        // Fetch q1, q2, and q3 IDs for this account
        $userRes = $conn->query("SELECT q1_id, q2_id, q3_id FROM user_reg WHERE emailadd = '$email'");
        $userData = $userRes->fetch_assoc();

        // Join with security_questions to get the text for all three
        $questions = [];
        $ids = [$userData['q1_id'], $userData['q2_id'], $userData['q3_id']];
        
        foreach($ids as $index => $id) {
            if($id) {
                $qTextRes = $conn->query("SELECT question_text FROM security_questions WHERE id = '$id'");
                if($row = $qTextRes->fetch_assoc()) {
                    $questions[] = [
                        'id' => $id,
                        'text' => $row['question_text'],
                        'type' => 'a' . ($index + 1) // Store as a1, a2, or a3 for verification
                    ];
                }
            }
        }

        echo json_encode(['success' => true, 'questions' => $questions]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Invalid or expired OTP.']);
    }
}

// Fix the Verify Answer section to check against column 'a1'
if ($action == 'verify_answer') {
    $email = $conn->real_escape_string($data['email']);
    $answer = $conn->real_escape_string($data['answer']);
    $column = $conn->real_escape_string($data['column']); // Gets 'a1', 'a2', or 'a3'

    // Validate that the column name is safe to prevent SQL injection
    $allowed_columns = ['a1', 'a2', 'a3'];
    if (!in_array($column, $allowed_columns)) {
        echo json_encode(['success' => false, 'message' => 'Invalid question selection.']);
        exit;
    }

    // Check the specific answer column for this account
    $res = $conn->query("SELECT * FROM user_reg WHERE emailadd = '$email' AND $column = '$answer'");
    
    if ($res && $res->num_rows > 0) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Incorrect answer for that specific question.']);
    }
}

// --- STEP 4: UPDATE PASSWORD ---
if ($action == 'update_password') {
    $email = $conn->real_escape_string($data['email']);
    // Note: If you use password_hash, remember to use password_verify during login!
    $newPass = password_hash($data['password'], PASSWORD_DEFAULT);
    
    if ($conn->query("UPDATE user_reg SET password = '$newPass' WHERE emailadd = '$email'")) {
        // Clean up: delete the OTP after successful reset
        $conn->query("DELETE FROM authentication_code WHERE email = '$email'");
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to update password.']);
    }
}
?>