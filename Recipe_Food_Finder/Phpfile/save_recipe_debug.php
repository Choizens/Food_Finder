<?php
// save_recipe_debug.php
// This is a debug version with detailed logging - use this for troubleshooting

// Enable error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');

// Log function
function logDebug($message) {
    $log_file = 'recipe_debug.log';
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($log_file, "[$timestamp] $message\n", FILE_APPEND);
}

logDebug("=== New Recipe Submission Started ===");

// Database connection
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "register";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    logDebug("Database connection failed: " . $conn->connect_error);
    die(json_encode(['success' => false, 'message' => 'Database connection failed: ' . $conn->connect_error]));
}

logDebug("Database connected successfully");

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    logDebug("POST request received");
    logDebug("POST data: " . json_encode($_POST));
    logDebug("FILES data: " . json_encode($_FILES));
    
    // Get form data
    $recipe_name = mysqli_real_escape_string($conn, $_POST['recipe_name'] ?? '');
    $category = mysqli_real_escape_string($conn, $_POST['category'] ?? '');
    $difficulty = mysqli_real_escape_string($conn, $_POST['difficulty'] ?? '');
    $prep_time = mysqli_real_escape_string($conn, $_POST['prep_time'] ?? '');
    $servings = intval($_POST['servings'] ?? 0);
    $ingredients = mysqli_real_escape_string($conn, $_POST['ingredients'] ?? '');
    $instructions = mysqli_real_escape_string($conn, $_POST['instructions'] ?? '');
    $submitted_by = mysqli_real_escape_string($conn, $_POST['submitted_by'] ?? 'Anonymous');
    
    logDebug("Form data extracted: recipe_name=$recipe_name, category=$category");
    
    // Validate required fields
    if (empty($recipe_name) || empty($category) || empty($difficulty) || empty($prep_time) || empty($servings) || empty($ingredients) || empty($instructions)) {
        logDebug("Validation failed: Missing required fields");
        echo json_encode(['success' => false, 'message' => 'Please fill in all required fields']);
        exit;
    }
    
    logDebug("Validation passed");
    
    // Handle file upload
    $image_path = '';
    if (isset($_FILES['recipe_image'])) {
        logDebug("File upload detected. Error code: " . $_FILES['recipe_image']['error']);
        
        if ($_FILES['recipe_image']['error'] === 0) {
            $allowed_types = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif'];
            $file_type = $_FILES['recipe_image']['type'];
            
            logDebug("File type: $file_type");
            
            if (!in_array($file_type, $allowed_types)) {
                logDebug("Invalid file type");
                echo json_encode(['success' => false, 'message' => 'Invalid file type. Only JPG, PNG, and GIF are allowed.']);
                exit;
            }
            
            // Check file size (max 5MB)
            $file_size = $_FILES['recipe_image']['size'];
            logDebug("File size: $file_size bytes");
            
            if ($file_size > 5 * 1024 * 1024) {
                logDebug("File too large");
                echo json_encode(['success' => false, 'message' => 'File size too large. Maximum 5MB allowed.']);
                exit;
            }
            
            // Create unique filename
            $file_extension = pathinfo($_FILES['recipe_image']['name'], PATHINFO_EXTENSION);
            $new_filename = 'recipe_' . time() . '_' . uniqid() . '.' . $file_extension;
            
            // Upload directory
            $upload_dir = 'Recipe_pictures/';
            
            logDebug("Upload directory: $upload_dir");
            logDebug("New filename: $new_filename");
            
            // Create directory if it doesn't exist
            if (!file_exists($upload_dir)) {
                logDebug("Creating upload directory");
                if (!mkdir($upload_dir, 0777, true)) {
                    logDebug("Failed to create directory");
                    echo json_encode(['success' => false, 'message' => 'Failed to create upload directory']);
                    exit;
                }
            }
            
            // Check if directory is writable
            if (!is_writable($upload_dir)) {
                logDebug("Upload directory is not writable");
                echo json_encode(['success' => false, 'message' => 'Upload directory is not writable. Please check permissions.']);
                exit;
            }
            
            $upload_path = $upload_dir . $new_filename;
            logDebug("Full upload path: $upload_path");
            
            if (move_uploaded_file($_FILES['recipe_image']['tmp_name'], $upload_path)) {
                $image_path = $upload_path;
                logDebug("File uploaded successfully to: $image_path");
            } else {
                logDebug("Failed to move uploaded file");
                echo json_encode(['success' => false, 'message' => 'Failed to upload image. Error: ' . error_get_last()['message']]);
                exit;
            }
        } else {
            $error_codes = [
                UPLOAD_ERR_INI_SIZE => 'File exceeds upload_max_filesize',
                UPLOAD_ERR_FORM_SIZE => 'File exceeds MAX_FILE_SIZE',
                UPLOAD_ERR_PARTIAL => 'File was only partially uploaded',
                UPLOAD_ERR_NO_FILE => 'No file was uploaded',
                UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder',
                UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
                UPLOAD_ERR_EXTENSION => 'Upload stopped by extension'
            ];
            
            $error_code = $_FILES['recipe_image']['error'];
            $error_message = $error_codes[$error_code] ?? "Unknown error ($error_code)";
            
            logDebug("Upload error: $error_message");
            echo json_encode(['success' => false, 'message' => 'Upload error: ' . $error_message]);
            exit;
        }
    } else {
        logDebug("No file uploaded");
        echo json_encode(['success' => false, 'message' => 'Please upload a recipe image']);
        exit;
    }
    
    // Check if table exists
    $table_check = $conn->query("SHOW TABLES LIKE 'request_recipes'");
    if ($table_check->num_rows == 0) {
        logDebug("Table 'request_recipes' does not exist");
        echo json_encode(['success' => false, 'message' => 'Database table not found. Please run the SQL setup script.']);
        exit;
    }
    
    logDebug("Table exists, preparing SQL statement");
    
    // Prepare SQL statement
    $stmt = $conn->prepare("INSERT INTO request_recipes (recipe_name, category, difficulty, prep_time, servings, ingredients, instructions, image_path, submitted_by, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())");
    
    if ($stmt === false) {
        logDebug("Prepare failed: " . $conn->error);
        echo json_encode(['success' => false, 'message' => 'Database prepare error: ' . $conn->error]);
        exit;
    }
    
    logDebug("Statement prepared successfully");
    
    $stmt->bind_param("ssssissss", $recipe_name, $category, $difficulty, $prep_time, $servings, $ingredients, $instructions, $image_path, $submitted_by);
    
    if ($stmt->execute()) {
        $recipe_id = $stmt->insert_id;
        logDebug("Recipe saved successfully with ID: $recipe_id");
        echo json_encode([
            'success' => true, 
            'message' => 'Recipe submitted successfully! It will be reviewed by our team.',
            'recipe_id' => $recipe_id
        ]);
    } else {
        logDebug("Execute failed: " . $stmt->error);
        // Delete uploaded image if database insert fails
        if (file_exists($image_path)) {
            unlink($image_path);
            logDebug("Deleted uploaded image due to database error");
        }
        echo json_encode(['success' => false, 'message' => 'Error saving recipe: ' . $stmt->error]);
    }
    
    $stmt->close();
    $conn->close();
    logDebug("=== Recipe Submission Completed ===\n");
} else {
    logDebug("Invalid request method: " . $_SERVER['REQUEST_METHOD']);
    echo json_encode(['success' => false, 'message' => 'Invalid request method']);
}
?>