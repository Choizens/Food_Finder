<?php
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "register";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);
// Check connection
if ($conn->connect_error) {
  die("Connection failed: " . $conn->connect_error);
}

// sql to create table
$sql = "CREATE TABLE IF NOT EXISTS admin_requests (
    id INT(11) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    requester_username VARCHAR(50) NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    target_data TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)";

if ($conn->query($sql) === TRUE) {
  echo "Table admin_requests created successfully";
} else {
  echo "Error creating table: " . $conn->error;
}

$conn->close();
?>
