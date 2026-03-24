<?php
// =================================== 
// GET APPROVED RECIPES FROM DATABASE 
// Located at: Phpfile/get_recipes.php
// ===================================

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

// Database configuration
$servername = "localhost";
$username   = "root";
$password   = "";
$dbname     = "register";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed: ' . $conn->connect_error]);
    exit();
}

$conn->set_charset("utf8mb4");

try {
    $sql = "SELECT
                id,
                recipe_name,
                category,
                difficulty,
                prep_time,
                servings,
                ingredients,
                instructions,
                image_path,
                submitted_by,
                status,
                created_at
            FROM request_recipes
            WHERE status = 'approved'
            ORDER BY created_at DESC";

    $result = $conn->query($sql);

    if ($result === false) {
        throw new Exception('Query failed: ' . $conn->error);
    }

    $recipes = [];

    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {

            // -------------------------------------------------------
            // FIX: Normalize the image_path so it's always a clean
            // web-relative path like: photos/Recipe_pictures/file.jpg
            //
            // Some older rows may have been saved with a wrong prefix
            // such as "Phpfile/photos/..." — strip that if present.
            // -------------------------------------------------------
            $img = $row['image_path'];

            // Remove any leading slash
            $img = ltrim($img, '/');

            // If the path was accidentally saved with "Phpfile/" prefix, remove it
            if (strpos($img, 'Phpfile/') === 0) {
                $img = substr($img, strlen('Phpfile/'));
            }

            $row['image_path'] = $img;

            // Default values for optional fields
            $row['rating']      = '4.0';
            $row['reviews']     = '0';
            $row['description'] = '';
            $row['video_url']   = '';

            $recipes[] = $row;
        }
    }

    echo json_encode($recipes);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error fetching recipes: ' . $e->getMessage()]);
} finally {
    $conn->close();
}
?>