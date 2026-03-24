<?php
$conn = new mysqli('localhost', 'root', '', 'register');
if ($conn->connect_error) { die('DB Error'); }

// 1. Alter the column to include 'inactive'
$conn->query("ALTER TABLE user_reg MODIFY COLUMN status ENUM('active', 'blocked', 'inactive') NOT NULL DEFAULT 'active'");

// 2. Fix the currently borked users (who have empty string status)
$conn->query("UPDATE user_reg SET status = 'inactive' WHERE status = ''");

echo "Schema updated successfully!";
?>
