<?php
header('Content-Type: application/json');

// Database connection
$host = 'localhost';
$user = 'root';
$password = '';
$dbname = 'register'; // Replace with your actual database name

$conn = new mysqli($host, $user, $password, $dbname);

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed']);
    exit();
}

// Get the posted data
$data = json_decode(file_get_contents('php://input'), true);
$inputPassword = $data['password'] ?? '';

if (empty($inputPassword)) {
    http_response_code(400);
    echo json_encode(['error' => 'Password is required']);
    exit();
}

// Check if the password exists in the `user_reg` table
$sql = "SELECT password FROM user_reg";
$result = $conn->query($sql);

$passwordExists = false;

if ($result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        // Use password_verify to compare the plain password with the hashed password
        if (password_verify($inputPassword, $row['password'])) {
            $passwordExists = true;
            break;
        }
    }
}

echo json_encode(['exists' => $passwordExists]);

$conn->close();
?>
