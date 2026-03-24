<?php
// save_recipe.php
// Located at: Phpfile/save_recipe.php
header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Database connection
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "register";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit;
}

$conn->set_charset("utf8mb4");

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        // Get and sanitize form data
        $recipe_name = $conn->real_escape_string(trim($_POST['recipe_name'] ?? ''));
        $category    = $conn->real_escape_string(trim($_POST['category'] ?? ''));
        $difficulty  = $conn->real_escape_string(trim($_POST['difficulty'] ?? ''));
        $prep_time   = $conn->real_escape_string(trim($_POST['prep_time'] ?? ''));
        $servings    = intval($_POST['servings'] ?? 0);
        $ingredients = $conn->real_escape_string(trim($_POST['ingredients'] ?? ''));
        $instructions= $conn->real_escape_string(trim($_POST['instructions'] ?? ''));
        $submitted_by= $conn->real_escape_string(trim($_POST['submitted_by'] ?? 'Anonymous'));
        $submitted_email = $conn->real_escape_string(trim($_POST['submitted_email'] ?? ''));

        // Validate required fields
        if (empty($recipe_name) || empty($category) || empty($difficulty) ||
            empty($prep_time) || $servings <= 0 || empty($ingredients) || empty($instructions)) {
            throw new Exception('All required fields must be filled');
        }

        // Handle file upload
        if (!isset($_FILES['recipe_image']) || $_FILES['recipe_image']['error'] !== 0) {
            throw new Exception('Please upload a recipe image');
        }

        // Validate file type
        $allowed_types = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif'];
        if (!in_array($_FILES['recipe_image']['type'], $allowed_types)) {
            throw new Exception('Invalid file type. Only JPG, PNG, and GIF allowed');
        }

        // Validate file size (5MB max)
        if ($_FILES['recipe_image']['size'] > 5 * 1024 * 1024) {
            throw new Exception('File too large. Maximum 5MB');
        }

        // -------------------------------------------------------
        // FIX: Build the correct absolute path to the upload folder
        // save_recipe.php lives in:  /your-project/Phpfile/
        // photos folder lives in:    /your-project/photos/
        // So we go one level UP from __DIR__ to reach the project root
        // -------------------------------------------------------
        $project_root = dirname(__DIR__); // Goes up from Phpfile/ to project root
        $upload_dir   = $project_root . '/photos/Recipe_pictures/';

        // Create directory if it doesn't exist
        if (!file_exists($upload_dir)) {
            if (!mkdir($upload_dir, 0755, true)) {
                throw new Exception('Failed to create upload directory');
            }
        }

        // Generate unique filename
        $file_extension = strtolower(pathinfo($_FILES['recipe_image']['name'], PATHINFO_EXTENSION));
        $new_filename   = 'recipe_' . time() . '_' . uniqid() . '.' . $file_extension;
        $upload_path    = $upload_dir . $new_filename;

        // Move uploaded file to the correct absolute location
        if (!move_uploaded_file($_FILES['recipe_image']['tmp_name'], $upload_path)) {
            throw new Exception('Failed to upload image. Check folder permissions.');
        }

        // -------------------------------------------------------
        // FIX: Store only the web-relative path in the database
        // This is what the browser will use as the <img src="...">
        // -------------------------------------------------------
        $image_path = 'photos/Recipe_pictures/' . $new_filename;

        // Create table if not exists
        $create_table = "CREATE TABLE IF NOT EXISTS `request_recipes` (
            `id`           int(11)      NOT NULL AUTO_INCREMENT,
            `recipe_name`  varchar(255) NOT NULL,
            `category`     varchar(100) NOT NULL,
            `difficulty`   varchar(50)  NOT NULL,
            `prep_time`    varchar(100) NOT NULL,
            `servings`     int(11)      NOT NULL,
            `ingredients`  text         NOT NULL,
            `instructions` text         NOT NULL,
            `image_path`   varchar(500) NOT NULL,
            `submitted_by` varchar(255) DEFAULT 'Anonymous',
            `submitted_email` varchar(255) DEFAULT NULL,
            `status`       varchar(50)  DEFAULT 'pending',
            `created_at`   timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
        $conn->query($create_table);

        // Determine initial status based on user role
        $initial_status = 'pending';
        if (isset($_SESSION['AUTH_SUPER_ADMIN'])) {
            $initial_status = 'approved';
        }

        // Insert recipe
        $sql = "INSERT INTO request_recipes
                    (recipe_name, category, difficulty, prep_time, servings,
                     ingredients, instructions, image_path, submitted_by, submitted_email, status)
                VALUES
                    ('$recipe_name', '$category', '$difficulty', '$prep_time', $servings,
                     '$ingredients', '$instructions', '$image_path', '$submitted_by', '$submitted_email', '$initial_status')";

        if ($conn->query($sql)) {
            $message = ($initial_status === 'approved') 
                ? 'Recipe posted successfully!' 
                : 'Recipe submitted successfully! It will be reviewed by our team.';
            
            echo json_encode([
                'success'   => true,
                'message'   => $message,
                'recipe_id' => $conn->insert_id,
                'status'    => $initial_status
            ]);
        } else {
            // Delete the uploaded file if DB insert fails
            if (file_exists($upload_path)) {
                unlink($upload_path);
            }
            throw new Exception('Error saving recipe to database');
        }

    } catch (Exception $e) {
        // Clean up uploaded file on any error
        if (isset($upload_path) && file_exists($upload_path)) {
            unlink($upload_path);
        }
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }

    $conn->close();

} else {
    echo json_encode(['success' => false, 'message' => 'Invalid request method']);
}
?>