<?php
// Database connection
$servername = "localhost";
$username = "root"; // Update with your DB username
$password = ""; // Update with your DB password
$dbname = "register";

$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die("Database connection failed.");
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
$password = $_POST['password']; // Plain password for input
$hashedPassword = password_hash($password, PASSWORD_DEFAULT); // Hash the password for storage
$purok = $_POST['Purok'];
$barangay = $_POST['Barangay'];
$city = $_POST['City'];
$province = $_POST['Province'];
$country = $_POST['Country'];
$zipcode = $_POST['Z_code'];

// --- NEW SECURITY QUESTION DATA ---
$q1_id = $_POST['security_q1'];
$a1    = $_POST['answer1'];
$q2_id = $_POST['security_q2'];
$a2    = $_POST['answer2'];
$q3_id = $_POST['security_q3'];
$a3    = $_POST['answer3'];

// Insert data into the database
// Added q1_id, a1, q2_id, a2, q3_id, a3 to the columns and values list
$sql = "INSERT INTO user_reg (fname, middle, lname, exname, idnum, username, emailadd, sex, date, age, password, purok, barangay, city, province, country, zipcode, status, q1_id, a1, q2_id, a2, q3_id, a3) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'inactive', ?, ?, ?, ?, ?, ?)";

$stmt = $conn->prepare($sql);

/**
 * bind_param update:
 * Original had 17 "s". We added 6 new fields.
 * Total is now 23 "s".
 */
$stmt->bind_param("sssssssssssssssssssssss", 
    $fname, $middle, $lname, $exname, $idnum, $username, $emailadd, $sex, $date, $age, $hashedPassword, 
    $purok, $barangay, $city, $province, $country, $zipcode,
    $q1_id, $a1, $q2_id, $a2, $q3_id, $a3
);

if ($stmt->execute()) {
    // Redirect to home page
    header("Location: ../home.html");
    exit(); // Ensure no further code is executed
} else {
    echo "Error: Could not register user. Please try again later.";
}

// Close resources
$stmt->close();
$conn->close();
?>