<?php
// Database connection
$servername = "localhost";
$username = "root"; // Update with your DB username
$password = ""; // Update with your DB password
$dbname = "register"; // Update with your DB name

$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// Retrieve form data
$fname = $_POST['firstname'];
$middle = $_POST['middleinitial'];
$lname = $_POST['lastname'];
$exname = $_POST['exname'];
$idnum = $_POST['idno'];
$username = $_POST['username'];
$emailadd = $_POST['email'];
$sex = $_POST['Sex'];
$date = $_POST['birthdate'];
$age = $_POST['age'];
$password = password_hash($_POST['password'], PASSWORD_DEFAULT); // Hash the password
$purok = $_POST['Purok'];
$barangay = $_POST['Barangay'];
$city = $_POST['City'];
$province = $_POST['Province'];
$country = $_POST['Country'];
$zipcode = $_POST['Z_code'];

// Check for existing ID number
$idCheckQuery = "SELECT idnum FROM user_reg WHERE idnum = ?";
$idStmt = $conn->prepare($idCheckQuery);
$idStmt->bind_param("s", $idnum);
$idStmt->execute();
$idResult = $idStmt->get_result();

if ($idResult->num_rows > 0) {
    echo "<script>alert('Error: ID Number already exists! Please use a different ID number.'); window.history.back();</script>";
    $idStmt->close();
    $conn->close();
    exit();
}

// Check for existing username
$usernameCheckQuery = "SELECT username FROM user_reg WHERE username = ?";
$usernameStmt = $conn->prepare($usernameCheckQuery);
$usernameStmt->bind_param("s", $username);
$usernameStmt->execute();
$usernameResult = $usernameStmt->get_result();

if ($usernameResult->num_rows > 0) {
    echo "<script>alert('Error: Username already exists! Please choose a different username.'); window.history.back();</script>";
    $usernameStmt->close();
    $conn->close();
    exit();
}

// Check for existing email
$emailCheckQuery = "SELECT emailadd FROM user_reg WHERE emailadd = ?";
$emailStmt = $conn->prepare($emailCheckQuery);
$emailStmt->bind_param("s", $emailadd);
$emailStmt->execute();
$emailResult = $emailStmt->get_result();

if ($emailResult->num_rows > 0) {
    echo "<script>alert('Error: Email address already exists! Please use a different email address.'); window.history.back();</script>";
    $emailStmt->close();
    $conn->close();
    exit();
}

// If all checks pass, insert the new user data
$insertQuery = "INSERT INTO user_reg (fname, middle, lname, exname, idnum, username, emailadd, sex, date, age, password, purok, barangay, city, province, country, zipcode) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
$stmt = $conn->prepare($insertQuery);
$stmt->bind_param("sssssssssisisssss", $fname, $middle, $lname, $exname, $idnum, $username, $emailadd, $sex, $date, $age, $password, $purok, $barangay, $city, $province, $country, $zipcode);

if ($stmt->execute()) {
    echo "<script>alert('Registration successful!'); window.location.href = 'success_page.php';</script>";
} else {
    echo "<script>alert('Error: Could not register user. Please try again later.'); window.history.back();</script>";
}

// Close all statements and connection
$stmt->close();
$conn->close();
?>
