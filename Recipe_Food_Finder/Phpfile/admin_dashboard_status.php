<?php
// admin_dashboard_status.php
// Handles ALL admin operations: get recipes, approve, reject, delete, and get approved recipes
require_once 'email_helper.php';

header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_log("Admin Dashboard Status - Request started");

require_once 'admin_logs_helper.php';

session_start();

// Database connection
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "register";

try {
    $conn = new mysqli($servername, $username, $password, $dbname);
    
    if ($conn->connect_error) {
        throw new Exception('Database connection failed: ' . $conn->connect_error);
    }
    
    $conn->set_charset("utf8mb4");
    error_log("Database connected successfully");
    
} catch (Exception $e) {
    error_log("Database connection error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit;
}

// Determine the action
$action = '';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = $_GET['action'] ?? '';
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
}

error_log("Action requested: " . $action);

// ===================================
// ACTION: GET ALL RECIPES (for admin dashboard)
// ===================================

if ($action === 'get_recipes') {
    try {
        error_log("Getting all recipes");
        
        $sql = "SELECT * FROM request_recipes ORDER BY created_at DESC";
        $result = $conn->query($sql);
        
        if (!$result) {
            throw new Exception('Query failed: ' . $conn->error);
        }
        
        $recipes = [];
        
        if ($result->num_rows > 0) {
            while ($row = $result->fetch_assoc()) {
                $recipes[] = [
                    'id' => (int)$row['id'],
                    'recipe_name' => $row['recipe_name'],
                    'category' => $row['category'],
                    'difficulty' => $row['difficulty'],
                    'prep_time' => $row['prep_time'],
                    'servings' => (int)$row['servings'],
                    'ingredients' => $row['ingredients'],
                    'instructions' => $row['instructions'],
                    'image_path' => $row['image_path'],
                    'submitted_by' => $row['submitted_by'],
                    'status' => $row['status'],
                    'created_at' => $row['created_at']
                ];
            }
        }
        
        error_log("Found " . count($recipes) . " recipes");
        
        echo json_encode([
            'success' => true,
            'recipes' => $recipes,
            'total' => count($recipes)
        ]);
        
    } catch (Exception $e) {
        error_log("Error in get_recipes: " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// ===================================
// ACTION: APPROVE RECIPE
// ===================================

elseif ($action === 'approve') {
    try {
        $recipe_id = isset($_POST['recipe_id']) ? intval($_POST['recipe_id']) : 0;
        
        error_log("Approving recipe ID: " . $recipe_id);
        
        if ($recipe_id <= 0) {
            throw new Exception('Invalid recipe ID: ' . $recipe_id);
        }
        
        // Get the recipe first
        $sql = "SELECT * FROM request_recipes WHERE id = " . $recipe_id;
        $result = $conn->query($sql);
        
        if (!$result) {
            throw new Exception('Query failed: ' . $conn->error);
        }
        
        if ($result->num_rows === 0) {
            throw new Exception('Recipe not found with ID: ' . $recipe_id);
        }
        
        $recipe = $result->fetch_assoc();
        error_log("Recipe found: " . $recipe['recipe_name']);
        
        // Update status to approved
        $update_sql = "UPDATE request_recipes SET status = 'approved' WHERE id = " . $recipe_id;
        
        if (!$conn->query($update_sql)) {
            throw new Exception('Failed to update recipe status: ' . $conn->error);
        }
        
        error_log("Recipe status updated to approved");
        
        // Insert into approved_recipes table for user dashboard
        insertIntoApprovedRecipes($conn, $recipe);
        error_log("Recipe inserted into approved_recipes table");

        // Log the approval
        logAdminActivity($conn, 'recipe_approved', $recipe['submitted_by'], "Approved recipe: " . $recipe['recipe_name']);

        // --- EMAIL NOTIFICATION ---
        $submitter = $conn->real_escape_string($recipe['submitted_by']);
        $saved_email = $recipe['submitted_email'];
        
        error_log("Email Notification - Attempting for submitter: " . $submitter . " (Saved Email: " . $saved_email . ")");
        
        $to_email = '';
        $to_name  = $submitter;

        if (!empty($saved_email)) {
            $to_email = $saved_email;
            error_log("Email Notification - Using direct saved email: " . $to_email);
        } else {
            // Try to find user by username OR first name (for older records)
            $user_sql = "SELECT emailadd, fname FROM user_reg WHERE username = '$submitter' OR fname = '$submitter' LIMIT 1";
            $user_res = $conn->query($user_sql);
            
            if ($user_res && $user_res->num_rows > 0) {
                $user_data = $user_res->fetch_assoc();
                $to_email = $user_data['emailadd'];
                $to_name  = $user_data['fname'];
                error_log("Email Notification - Found user via lookup: $to_name ($to_email)");
            }
        }

        if (!empty($to_email)) {
            $subject = "Recipe Approved: " . $recipe['recipe_name'];
            $body = getApprovalEmailBody($to_name, $recipe['recipe_name']);
            $sent = sendRecipeNotification($to_email, $subject, $body);
            
            if ($sent) {
                error_log("Email Notification - Success");
            } else {
                error_log("Email Notification - FAILED to send");
            }
        } else {
            error_log("Email Notification - NO email found for: " . $submitter);
        }
        
        echo json_encode([
            'success' => true,
            'message' => 'Recipe approved successfully',
            'recipe_id' => $recipe_id
        ]);
        
    } catch (Exception $e) {
        error_log("Error in approve: " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// ===================================
// ACTION: REJECT RECIPE
// ===================================

elseif ($action === 'reject') {
    try {
        $recipe_id = isset($_POST['recipe_id']) ? intval($_POST['recipe_id']) : 0;
        $reason = isset($_POST['reason']) ? $conn->real_escape_string($_POST['reason']) : '';
        
        error_log("Rejecting recipe ID: " . $recipe_id . " with reason: " . $reason);
        
        if ($recipe_id <= 0) {
            throw new Exception('Invalid recipe ID: ' . $recipe_id);
        }
        
        // Update status to rejected
        $update_sql = "UPDATE request_recipes SET status = 'rejected' WHERE id = " . $recipe_id;
        
        if (!$conn->query($update_sql)) {
            throw new Exception('Failed to update recipe status: ' . $conn->error);
        }
        
        error_log("Recipe status updated to rejected");
        
        // Log the rejection
        logAdminActivity($conn, 'recipe_rejected', $recipe['submitted_by'], "Rejected recipe: " . $recipe['recipe_name'] . ". Reason: " . $reason);

        // --- EMAIL NOTIFICATION ---
        // Get recipe details for email
        $recipe_res = $conn->query("SELECT recipe_name, submitted_by, submitted_email FROM request_recipes WHERE id = $recipe_id");
        if ($recipe_res && $recipe_res->num_rows > 0) {
            $recipe = $recipe_res->fetch_assoc();
            $submitter = $conn->real_escape_string($recipe['submitted_by']);
            $saved_email = $recipe['submitted_email'];
            
            error_log("Email Notification (Reject) - Attempting for submitter: " . $submitter . " (Saved Email: " . $saved_email . ")");
            
            $to_email = '';
            $to_name  = $submitter;

            if (!empty($saved_email)) {
                $to_email = $saved_email;
                error_log("Email Notification (Reject) - Using direct saved email: " . $to_email);
            } else {
                // Try to find user by username OR first name (for older records)
                $user_sql = "SELECT emailadd, fname FROM user_reg WHERE username = '$submitter' OR fname = '$submitter' LIMIT 1";
                $user_res = $conn->query($user_sql);
                
                if ($user_res && $user_res->num_rows > 0) {
                    $user_data = $user_res->fetch_assoc();
                    $to_email = $user_data['emailadd'];
                    $to_name  = $user_data['fname'];
                    error_log("Email Notification (Reject) - Found user via lookup: $to_name ($to_email)");
                }
            }

            if (!empty($to_email)) {
                $subject = "Recipe Submission Update: " . $recipe['recipe_name'];
                $body = getRejectionEmailBody($to_name, $recipe['recipe_name'], $reason);
                $sent = sendRecipeNotification($to_email, $subject, $body);
                
                if ($sent) {
                    error_log("Email Notification (Reject) - Success");
                } else {
                    error_log("Email Notification (Reject) - FAILED to send");
                }
            } else {
                error_log("Email Notification (Reject) - NO email found for: " . $submitter);
            }
        }
        
        echo json_encode([
            'success' => true,
            'message' => 'Recipe rejected',
            'recipe_id' => $recipe_id
        ]);
        
    } catch (Exception $e) {
        error_log("Error in reject: " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// ===================================
// ACTION: DELETE RECIPE
// ===================================

elseif ($action === 'delete') {
    try {
        $recipe_id = isset($_POST['recipe_id']) ? intval($_POST['recipe_id']) : 0;
        
        error_log("Deleting recipe ID: " . $recipe_id);
        
        if ($recipe_id <= 0) {
            throw new Exception('Invalid recipe ID: ' . $recipe_id);
        }
        
        // Get the recipe first to get its details
        $sql = "SELECT * FROM request_recipes WHERE id = " . $recipe_id;
        $result = $conn->query($sql);
        
        if (!$result) {
            throw new Exception('Query failed: ' . $conn->error);
        }
        
        if ($result->num_rows === 0) {
            throw new Exception('Recipe not found with ID: ' . $recipe_id);
        }
        
        $recipe = $result->fetch_assoc();
        $recipe_name = $recipe['recipe_name'];
        $submitted_by = $recipe['submitted_by'];
        
        error_log("Recipe found: " . $recipe_name);
        
        // Delete from request_recipes table
        $delete_sql = "DELETE FROM request_recipes WHERE id = " . $recipe_id;
        
        if (!$conn->query($delete_sql)) {
            throw new Exception('Failed to delete recipe from request_recipes: ' . $conn->error);
        }
        
        error_log("Recipe deleted from request_recipes table");
        
        // Also delete from approved_recipes table if it exists there
        $recipe_name_escaped = $conn->real_escape_string($recipe_name);
        $submitted_by_escaped = $conn->real_escape_string($submitted_by);
        
        $delete_approved_sql = "DELETE FROM approved_recipes 
                               WHERE recipe_name = '$recipe_name_escaped' 
                               AND submitted_by = '$submitted_by_escaped'";
        
        if ($conn->query($delete_approved_sql)) {
            error_log("Recipe also deleted from approved_recipes table (if it was there)");
        }
        
        // Log the deletion
        logAdminActivity($conn, 'recipe_deleted', $submitted_by, "Deleted recipe: " . $recipe_name);
        
        echo json_encode([
            'success' => true,
            'message' => 'Recipe deleted successfully from both tables',
            'recipe_id' => $recipe_id
        ]);
        
    } catch (Exception $e) {
        error_log("Error in delete: " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// ===================================
// ACTION: UPDATE RECIPE (SUPER ADMIN)
// ===================================

elseif ($action === 'update_recipe') {
    try {
        $recipe_id = isset($_POST['recipe_id']) ? intval($_POST['recipe_id']) : 0;
        if ($recipe_id <= 0) throw new Exception('Invalid recipe ID');

        $name         = $conn->real_escape_string(trim($_POST['recipe_name']));
        $category     = $conn->real_escape_string(trim($_POST['category']));
        $difficulty   = $conn->real_escape_string(trim($_POST['difficulty']));
        $prep_time    = $conn->real_escape_string(trim($_POST['prep_time']));
        $servings     = intval($_POST['servings']);
        $ingredients  = $conn->real_escape_string(trim($_POST['ingredients']));
        $instructions = $conn->real_escape_string(trim($_POST['instructions']));

        // Check if recipe exists
        $check = $conn->query("SELECT id, submitted_by, recipe_name, image_path FROM request_recipes WHERE id = $recipe_id");
        if ($check->num_rows === 0) throw new Exception('Recipe not found');
        $old_data = $check->fetch_assoc();
        $old_recipe_name = $old_data['recipe_name'];
        $image_path = $old_data['image_path'];

        // Handle Image Upload if provided
        if (isset($_FILES['recipe_image']) && $_FILES['recipe_image']['error'] === 0) {
            $project_root = dirname(__DIR__);
            $upload_dir   = $project_root . '/photos/Recipe_pictures/';

            if (!file_exists($upload_dir)) {
                mkdir($upload_dir, 0755, true);
            }

            $file_extension = strtolower(pathinfo($_FILES['recipe_image']['name'], PATHINFO_EXTENSION));
            $new_filename   = 'recipe_edit_' . time() . '_' . uniqid() . '.' . $file_extension;
            $upload_path    = $upload_dir . $new_filename;

            if (move_uploaded_file($_FILES['recipe_image']['tmp_name'], $upload_path)) {
                // Delete old image if it exists and is not the placeholder
                if (!empty($image_path) && file_exists($project_root . '/' . $image_path) && strpos($image_path, 'placeholder') === false) {
                    @unlink($project_root . '/' . $image_path);
                }
                $image_path = 'photos/Recipe_pictures/' . $new_filename;
            }
        }

        $sql = "UPDATE request_recipes SET 
                    recipe_name = '$name',
                    category = '$category',
                    difficulty = '$difficulty',
                    prep_time = '$prep_time',
                    servings = $servings,
                    ingredients = '$ingredients',
                    instructions = '$instructions',
                    image_path = '$image_path'
                WHERE id = $recipe_id";

        if (!$conn->query($sql)) {
            throw new Exception('Failed to update recipe: ' . $conn->error);
        }

        // Also update approved_recipes if it exists there
        $subBy = $conn->real_escape_string($old_data['submitted_by']);
        $oldName_esc = $conn->real_escape_string($old_recipe_name);
        
        $sql_approved = "UPDATE approved_recipes SET 
                            recipe_name = '$name',
                            category = '$category',
                            difficulty = '$difficulty',
                            prep_time = '$prep_time',
                            servings = $servings,
                            ingredients = '$ingredients',
                            instructions = '$instructions',
                            image_path = '$image_path'
                        WHERE recipe_name = '$oldName_esc' 
                        AND submitted_by = '$subBy'";
        
        $conn->query($sql_approved);

        logAdminActivity($conn, 'recipe_update', $old_data['submitted_by'], "Updated recipe: $name (ID: $recipe_id)");

        echo json_encode(['success' => true, 'message' => 'Recipe updated successfully']);

    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// ===================================
// ACTION: GET APPROVED RECIPES (for user dashboard)
// ===================================

elseif ($action === 'get_approved_recipes') {
    try {
        error_log("Getting approved recipes");
        
        // Get category filter if provided
        $category = isset($_GET['category']) ? $conn->real_escape_string($_GET['category']) : 'all';
        
        // Build query
        $sql = "SELECT * FROM approved_recipes";
        
        if ($category !== 'all') {
            $sql .= " WHERE category = '" . $category . "'";
        }
        
        $sql .= " ORDER BY approved_at DESC";
        
        $result = $conn->query($sql);
        
        if (!$result) {
            throw new Exception('Query failed: ' . $conn->error);
        }
        
        $recipes = [];
        
        if ($result->num_rows > 0) {
            while ($row = $result->fetch_assoc()) {
                $recipes[] = [
                    'id' => (int)$row['id'],
                    'recipe_name' => $row['recipe_name'],
                    'category' => $row['category'],
                    'difficulty' => $row['difficulty'],
                    'prep_time' => $row['prep_time'],
                    'servings' => (int)$row['servings'],
                    'ingredients' => $row['ingredients'],
                    'instructions' => $row['instructions'],
                    'image_path' => $row['image_path'],
                    'submitted_by' => $row['submitted_by'],
                    'rating' => floatval($row['rating']),
                    'reviews_count' => intval($row['reviews_count']),
                    'approved_at' => $row['approved_at']
                ];
            }
        }
        
        error_log("Found " . count($recipes) . " approved recipes");
        
        echo json_encode([
            'success' => true,
            'recipes' => $recipes,
            'total' => count($recipes)
        ]);
        
    } catch (Exception $e) {
        error_log("Error in get_approved_recipes: " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// ===================================
// INVALID ACTION
// ===================================

else {
    error_log("Invalid action received: " . $action);
    echo json_encode(['success' => false, 'message' => 'Invalid action: ' . $action]);
}

$conn->close();

// ===================================
// HELPER FUNCTION: Insert into approved_recipes table
// ===================================

function insertIntoApprovedRecipes($conn, $recipe) {
    error_log("Creating approved_recipes table if not exists");
    
    // Create approved_recipes table if not exists
    $create_table = "CREATE TABLE IF NOT EXISTS `approved_recipes` (
        `id` int(11) NOT NULL AUTO_INCREMENT,
        `recipe_name` varchar(255) NOT NULL,
        `category` varchar(100) NOT NULL,
        `difficulty` varchar(50) NOT NULL,
        `prep_time` varchar(100) NOT NULL,
        `servings` int(11) NOT NULL,
        `ingredients` text NOT NULL,
        `instructions` text NOT NULL,
        `image_path` varchar(500) NOT NULL,
        `submitted_by` varchar(255) DEFAULT 'Anonymous',
        `approved_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `rating` decimal(3,1) DEFAULT 4.5,
        `reviews_count` int(11) DEFAULT 0,
        PRIMARY KEY (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
    
    if (!$conn->query($create_table)) {
        error_log("Failed to create approved_recipes table: " . $conn->error);
        throw new Exception('Failed to create approved_recipes table');
    }
    
    // Prepare data
    $recipe_name = $conn->real_escape_string($recipe['recipe_name']);
    $category = $conn->real_escape_string($recipe['category']);
    $difficulty = $conn->real_escape_string($recipe['difficulty']);
    $prep_time = $conn->real_escape_string($recipe['prep_time']);
    $servings = intval($recipe['servings']);
    $ingredients = $conn->real_escape_string($recipe['ingredients']);
    $instructions = $conn->real_escape_string($recipe['instructions']);
    $image_path = $conn->real_escape_string($recipe['image_path']);
    $submitted_by = $conn->real_escape_string($recipe['submitted_by']);
    
    // Check if recipe already exists in approved_recipes
    $check_sql = "SELECT id FROM approved_recipes WHERE recipe_name = '$recipe_name' AND submitted_by = '$submitted_by'";
    $check_result = $conn->query($check_sql);
    
    if ($check_result && $check_result->num_rows > 0) {
        error_log("Recipe already exists in approved_recipes, skipping insert");
        return;
    }
    
    // Insert recipe
    $insert_sql = "INSERT INTO approved_recipes 
                   (recipe_name, category, difficulty, prep_time, servings, ingredients, instructions, image_path, submitted_by) 
                   VALUES 
                   ('$recipe_name', '$category', '$difficulty', '$prep_time', $servings, '$ingredients', '$instructions', '$image_path', '$submitted_by')";
    
    if (!$conn->query($insert_sql)) {
        error_log("Failed to insert into approved_recipes: " . $conn->error);
        throw new Exception('Failed to insert into approved_recipes table');
    }
    
    error_log("Recipe successfully inserted into approved_recipes");
}
?>