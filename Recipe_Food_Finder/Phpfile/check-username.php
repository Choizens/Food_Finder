<?php
// Database connection settings
$servername = "localhost"; // Your database server
$username = "root"; // Your database username
$password = ""; // Your database password
$dbname = "register"; // Your database name

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// Get the username from the POST request
$data = json_decode(file_get_contents("php://input"));
$username = $data->username;

// Prepare the SQL query to check if the username exists
$sql = "SELECT id FROM user_reg WHERE username = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $username);
$stmt->execute();
$stmt->store_result();

// Check if any row was returned (meaning the username exists)
if ($stmt->num_rows > 0) {
    // Username exists
    echo json_encode(["exists" => true, "message" => "Username already exists."]);
} else {
    // Username does not exist
    echo json_encode(["exists" => false, "message" => "Username is available."]);
}

// Close the statement and connection
$stmt->close();
$conn->close();
?>
