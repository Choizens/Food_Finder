<?php
// Database connection parameters
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "register";

try {
    // Create a new database connection using PDO for better error handling
    $conn = new PDO("mysql:host=$servername;dbname=$dbname", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Check if email is provided via POST
    if (isset($_POST['email'])) {
        $email = trim($_POST['email']); // Trim whitespace

        // Prepare SQL query to check if the email exists
        $query = "SELECT COUNT(*) FROM user_reg WHERE emailadd = :email";
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':email', $email, PDO::PARAM_STR);
        $stmt->execute();

        // Fetch the count result
        $count = $stmt->fetchColumn();

        // Return message based on the existence of the email
        echo $count > 0 ? 'Email already exists.' : 'Email is available.';
    } else {
        echo 'No email provided.';
    }
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}

// Close the connection (optional with PDO)
$conn = null;
?>
