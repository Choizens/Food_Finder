<?php
session_start();

// Database connection details
$host = "localhost"; 
$username = "root"; 
$password = ""; 
$dbname = "register"; 

$conn = new mysqli($host, $username, $password, $dbname);

if ($conn->connect_error) {
    die(json_encode(['status' => 'error', 'message' => 'Database connection failed']));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username']);
    $password = trim($_POST['password']);

    $sql = "SELECT * FROM user_reg WHERE username = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $user = $result->fetch_assoc();

        if (password_verify($password, $user['password'])) {
            $_SESSION['id'] = $user['id'];
            $_SESSION['username'] = $user['username'];  
            echo json_encode(['status' => 'success', 'redirect' => 'Dashboard.html']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Invalid Credentials ']);
        }
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Invalid Credentials']);
    }

    $stmt->close();
}
$conn->close();
?>
