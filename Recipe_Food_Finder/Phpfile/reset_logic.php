<?php

require_once dirname(__DIR__) . '/vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

header('Content-Type: application/json');

// Use your actual database name 'register'
$conn = new mysqli("localhost", "root", "", "register");
$conn->set_charset("utf8mb4");

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


// --- STEP 0: CHECK EMAIL & GET USERNAME ---
if ($action == 'check_email') {
    $email = $data['email'];
    
    $stmt = $conn->prepare("SELECT username, idnum FROM user_reg WHERE emailadd = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $user = $result->fetch_assoc();
        echo json_encode(['success' => true, 'username' => $user['username'], 'idnum' => $user['idnum']]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Email not found.']);
    }
    $stmt->close();
    exit;
}


// --- STEP 1: SEND OTP (Unique Recipe_Food_Finder Design with Hashed OTP) ---
if ($action == 'send_otp') {
    $email = $data['email'];
    
    $stmt = $conn->prepare("SELECT fname, username, idnum FROM user_reg WHERE emailadd = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $user = $result->fetch_assoc();
        $stmt->close();
        
        // Generate plain OTP for email
        $otp = str_pad(strval(rand(0, 999999)), 6, '0', STR_PAD_LEFT);
        
        // Hash the OTP before storing in database
        $hashedOtp = password_hash($otp, PASSWORD_DEFAULT);
        
        // Delete old OTP entries for this email
        $deleteStmt = $conn->prepare("DELETE FROM authentication_code WHERE email = ?");
        $deleteStmt->bind_param("s", $email);
        $deleteStmt->execute();
        $deleteStmt->close();
        
        // Store hashed OTP in database
        $insertStmt = $conn->prepare("INSERT INTO authentication_code (email, otp_code, created_at) VALUES (?, ?, NOW())");
        $insertStmt->bind_param("ss", $email, $hashedOtp);
        
        if (!$insertStmt->execute()) {
            echo json_encode(['success' => false, 'message' => 'Failed to store OTP: ' . $conn->error]);
            $insertStmt->close();
            exit;
        }
        $insertStmt->close();

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

            // Formal & Unique HTML Template (Send plain OTP to user)
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
            echo json_encode(['success' => true, 'username' => $user['username'], 'idnum' => $user['idnum']]);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => 'Mailer Error: ' . $mail->ErrorInfo]);
        }
    } else {
        $stmt->close();
        echo json_encode(['success' => false, 'message' => 'Email not found.']);
    }
}

// --- STEP 2: VERIFY OTP (With Hashed Comparison & 2-Minute Limit) ---
if ($action == 'verify_otp') {
    $email = $data['email'];
    $inputOtp = trim(strval($data['otp']));
    
    // Remove any spaces or special characters
    $inputOtp = preg_replace('/[^0-9]/', '', $inputOtp);
    
    // Fetch the hashed OTP for this email within the 2-minute window
    $stmt = $conn->prepare("SELECT otp_code, created_at FROM authentication_code WHERE email = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 120 SECOND) ORDER BY created_at DESC LIMIT 1");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        $stmt->close();
        echo json_encode(['success' => false, 'message' => 'OTP expired or not found.']);
        exit;
    }
    
    $row = $result->fetch_assoc();
    $hashedOtpFromDB = $row['otp_code'];
    $stmt->close();
    
    // Verify the input OTP against the stored hash
    if (!password_verify($inputOtp, $hashedOtpFromDB)) {
        echo json_encode(['success' => false, 'message' => 'Invalid OTP.']);
        exit;
    }
    
    // OTP is valid, fetch security questions
    $userStmt = $conn->prepare("SELECT q1_id, q2_id, q3_id FROM user_reg WHERE emailadd = ?");
    $userStmt->bind_param("s", $email);
    $userStmt->execute();
    $userResult = $userStmt->get_result();
    
    if ($userResult->num_rows === 0) {
        $userStmt->close();
        echo json_encode(['success' => false, 'message' => 'User not found.']);
        exit;
    }
    
    $userData = $userResult->fetch_assoc();
    $userStmt->close();

    // Get security questions
    $questions = [];
    $ids = [$userData['q1_id'], $userData['q2_id'], $userData['q3_id']];
    
    foreach($ids as $index => $id) {
        if($id) {
            $qStmt = $conn->prepare("SELECT question_text FROM security_questions WHERE id = ?");
            $qStmt->bind_param("i", $id);
            $qStmt->execute();
            $qResult = $qStmt->get_result();
            if($qRow = $qResult->fetch_assoc()) {
                $questions[] = [
                    'id' => $id,
                    'text' => $qRow['question_text'],
                    'type' => 'a' . ($index + 1)
                ];
            }
            $qStmt->close();
        }
    }

    echo json_encode(['success' => true, 'questions' => $questions]);
}

// Verify Answer
if ($action == 'verify_answer') {
    $email = $data['email'];
    $ans1 = $data['ans1'];
    $ans2 = $data['ans2'];
    $ans3 = $data['ans3'];

    // Check all three answers
    $stmt = $conn->prepare("SELECT * FROM user_reg WHERE emailadd = ? AND a1 = ? AND a2 = ? AND a3 = ?");
    $stmt->bind_param("ssss", $email, $ans1, $ans2, $ans3);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'message' => 'One or more answers are incorrect. Please try again.']);
    }
    $stmt->close();
}

// Update Password
if ($action == 'update_password') {
    $email = $data['email'];
    $newPass = password_hash($data['password'], PASSWORD_DEFAULT);
    
    $stmt = $conn->prepare("UPDATE user_reg SET password = ? WHERE emailadd = ?");
    $stmt->bind_param("ss", $newPass, $email);
    
    if ($stmt->execute()) {
        $deleteStmt = $conn->prepare("DELETE FROM authentication_code WHERE email = ?");
        $deleteStmt->bind_param("s", $email);
        $deleteStmt->execute();
        $deleteStmt->close();
        
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to update password.']);
    }
    $stmt->close();
}

$conn->close();
?>