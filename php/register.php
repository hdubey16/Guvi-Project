<?php
/**
 * User Registration Endpoint
 * - Validates input (email, password, confirm password)
 * - Checks for duplicate email in MySQL (Prepared Statement)
 * - Hashes password with bcrypt
 * - Inserts user into MySQL (Prepared Statement)
 * - Creates initial profile document in MongoDB
 *
 * HCL GUVI Internship Project — Himanshu Dubey
 */

// ==================== Dependencies & Config ====================
require_once __DIR__ . '/vendor/autoload.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

define('MYSQL_HOST', '127.0.0.1');
define('MYSQL_PORT', 3306);
define('MYSQL_USER', 'root');
define('MYSQL_PASS', '');
define('MYSQL_DB',   'guvi_users');
define('MONGO_HOST', 'localhost');
define('MONGO_PORT', 27017);
define('MONGO_DB',   'guvi_profiles');

function getMySQLConnection() {
    $conn = new mysqli(MYSQL_HOST, MYSQL_USER, MYSQL_PASS, MYSQL_DB, MYSQL_PORT);
    if ($conn->connect_error) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'MySQL Connection Failed: ' . $conn->connect_error]);
        exit();
    }
    $conn->set_charset("utf8mb4");
    return $conn;
}

function getMongoManager() {
    try {
        return new MongoDB\Driver\Manager("mongodb://" . MONGO_HOST . ":" . MONGO_PORT);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'MongoDB Connection Failed: ' . $e->getMessage()]);
        exit();
    }
}

function sendResponse($success, $message, $data = []) {
    $response = array_merge(['success' => $success, 'message' => $message], $data);
    echo json_encode($response);
    exit();
}

// ==================== Request Handling ====================

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(false, 'Invalid request method');
}

$input = json_decode(file_get_contents('php://input'), true);

$email           = isset($input['email']) ? trim($input['email']) : '';
$password        = isset($input['password']) ? $input['password'] : '';
$confirmPassword = isset($input['confirm_password']) ? $input['confirm_password'] : '';

// ==================== Server-Side Validation ====================

if (empty($email) || empty($password) || empty($confirmPassword)) {
    sendResponse(false, 'All fields are required');
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    sendResponse(false, 'Invalid email format');
}
$email = filter_var($email, FILTER_SANITIZE_EMAIL);

if (strlen($password) < 8) {
    sendResponse(false, 'Password must be at least 8 characters long');
}
if (!preg_match('/[A-Z]/', $password)) {
    sendResponse(false, 'Password must contain at least one uppercase letter');
}
if (!preg_match('/[a-z]/', $password)) {
    sendResponse(false, 'Password must contain at least one lowercase letter');
}
if (!preg_match('/[0-9]/', $password)) {
    sendResponse(false, 'Password must contain at least one number');
}
if ($password !== $confirmPassword) {
    sendResponse(false, 'Passwords do not match');
}

// ==================== MySQL Operations ====================

$conn = getMySQLConnection();

$stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    $stmt->close();
    $conn->close();
    sendResponse(false, 'This email is already registered. Please login instead.');
}
$stmt->close();

$hashedPassword = password_hash($password, PASSWORD_BCRYPT);

$stmt = $conn->prepare("INSERT INTO users (email, password, created_at) VALUES (?, ?, NOW())");
$stmt->bind_param("ss", $email, $hashedPassword);

if ($stmt->execute()) {
    $userId = $stmt->insert_id;
    $stmt->close();
    $conn->close();

    // ==================== MongoDB: Create Initial Profile ====================
    try {
        $mongo = getMongoManager();
        $bulk = new MongoDB\Driver\BulkWrite;
        $bulk->insert([
            'user_id'    => $userId,
            'email'      => $email,
            'full_name'  => '',
            'age'        => null,
            'dob'        => '',
            'contact'    => '',
            'address'    => '',
            'created_at' => new MongoDB\BSON\UTCDateTime(),
            'updated_at' => new MongoDB\BSON\UTCDateTime()
        ]);
        $mongo->executeBulkWrite(MONGO_DB . '.profiles', $bulk);
    } catch (Exception $e) {
        error_log('MongoDB profile creation error: ' . $e->getMessage());
    }

    sendResponse(true, 'Registration successful! Please login with your credentials.');
} else {
    $stmt->close();
    $conn->close();
    sendResponse(false, 'Registration failed. Please try again.');
}
?>
