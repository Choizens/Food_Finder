<?php
$conn = new mysqli('localhost', 'root', '', 'register');
if ($conn->connect_error) { die('DB Error'); }

$res = $conn->query("SELECT id, username, status, role FROM user_reg ORDER BY id DESC LIMIT 5");
$users = [];
while($row = $res->fetch_assoc()) {
    $users[] = $row;
}

echo json_encode($users, JSON_PRETTY_PRINT);
?>
