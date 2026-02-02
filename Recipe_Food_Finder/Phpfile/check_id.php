<?php
header('Content-Type: application/json');

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Allow cross-origin requests (CORS)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Database connection
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "register";

$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    http_response_code(500); // Internal Server Error
    echo json_encode(['error' => 'Database connection failed: ' . $conn->connect_error]);
    exit();
}

// Get the input data
$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['idnum']) || empty($data['idnum'])) {
    http_response_code(400); // Bad Request
    echo json_encode(['error' => 'ID number is missing or empty.']);
    exit();
}

$idnum = trim($data['idnum']); // Remove any leading/trailing whitespace

// Use prepared statements to prevent SQL injection
$sql = "SELECT idnum FROM user_reg WHERE idnum = ?";
$stmt = $conn->prepare($sql);

if (!$stmt) {
    http_response_code(500); // Internal Server Error
    echo json_encode(['error' => 'Query preparation failed: ' . $conn->error]);
    exit();
}

$stmt->bind_param("s", $idnum);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    echo json_encode(['exists' => true]);
} else {
    echo json_encode(['exists' => false]);
}

// Close resources
$stmt->close();
$conn->close();
?>
