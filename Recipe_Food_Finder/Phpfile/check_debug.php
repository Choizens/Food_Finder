<?php
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "register";

$conn = new mysqli($servername, $username, $password, $dbname);
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

echo "=== USER ROLES ===\n";
$sql = "SELECT id, username, role, status FROM user_reg";
$result = $conn->query($sql);
if ($result->num_rows > 0) {
    while($row = $result->fetch_assoc()) {
        echo "ID: " . $row["id"]. " - Username: " . $row["username"]. " - Role: " . $row["role"]. " - Status: " . $row["status"]. "\n";
    }
} else {
    echo "0 results\n";
}

echo "\n=== ADMIN REQUESTS TABLE ===\n";
$sql = "SELECT * FROM admin_requests";
$result = $conn->query($sql);
if ($result) {
    if ($result->num_rows > 0) {
        while($row = $result->fetch_assoc()) {
            echo "ID: " . $row["id"]. " - Type: " . $row["action_type"]. " - Requester: " . $row["requester_username"]. " - Status: " . $row["status"]. "\n";
        }
    } else {
        echo "No requests found.\n";
    }
} else {
    echo "Error selecting from admin_requests: " . $conn->error . "\n";
}

echo "\n=== TABLE STRUCTURE: admin_requests ===\n";
$sql = "DESCRIBE admin_requests";
$result = $conn->query($sql);
if ($result) {
    while($row = $result->fetch_assoc()) {
        echo $row['Field'] . " - " . $row['Type'] . "\n";
    }
} else {
    echo "Table admin_requests might not exist.\n";
}

$conn->close();
?>
