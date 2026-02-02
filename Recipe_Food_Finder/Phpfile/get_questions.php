<?php
// Phpfile/get_questions.php
header('Content-Type: application/json');

$conn = new mysqli("localhost", "root", "", "register");

if ($conn->connect_error) {
    die(json_encode(["error" => "Connection failed"]));
}

$result = $conn->query("SELECT id, question_text FROM security_questions");
$questions = [];

while($row = $result->fetch_assoc()) {
    $questions[] = $row;
}

echo json_encode($questions);
$conn->close();
?>