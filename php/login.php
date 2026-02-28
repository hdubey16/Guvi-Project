<?php
/**
 * User Login Endpoint
 * - Validates credentials against MySQL (Prepared Statement)
 * - Verifies password hash with password_verify()
 * - Generates secure session token
 * - Stores session in Redis with 24hr TTL
 * - Returns token for localStorage storage
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
define('MYSQL_USER', 'guvi_app');
define('MYSQL_PASS', 'guvi_secure_2024');
define('MYSQL_DB',   'guvi_users');
define('REDIS_HOST', '127.0.0.1');
define('REDIS_PORT', 6379);
define('SESSION_EXPIRY', 86400);

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

function getRedisConnection() {
    try {
        $redis = new Predis\Client(['scheme' => 'tcp', 'host' => REDIS_HOST, 'port' => REDIS_PORT]);
        $redis->ping();
        return $redis;
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Redis Connection Failed: ' . $e->getMessage()]);
        exit();
    }
}

function generateToken() {
    return bin2hex(random_bytes(32));
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

$email    = isset($input['email']) ? trim($input['email']) : '';
$password = isset($input['password']) ? $input['password'] : '';

// ==================== Validation ====================

if (empty($email) || empty($password)) {
    sendResponse(false, 'Email and password are required');
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    sendResponse(false, 'Invalid email format');
}
$email = filter_var($email, FILTER_SANITIZE_EMAIL);

// ==================== MySQL: Verify Credentials ====================

$conn = getMySQLConnection();

$stmt = $conn->prepare("SELECT id, email, password FROM users WHERE email = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    $stmt->close();
    $conn->close();
    sendResponse(false, 'Invalid email or password');
}

$user = $result->fetch_assoc();
$stmt->close();
$conn->close();

if (!password_verify($password, $user['password'])) {
    sendResponse(false, 'Invalid email or password');
}

// ==================== Redis: Create Session ====================

$token = generateToken();
$redis = getRedisConnection();

$sessionData = json_encode([
    'user_id'    => (int)$user['id'],
    'email'      => $user['email'],
    'login_time' => time()
]);

$redis->setex("session:" . $token, SESSION_EXPIRY, $sessionData);

// ==================== Return Success Response ====================

sendResponse(true, 'Login successful!', [
    'token'   => $token,
    'email'   => $user['email'],
    'user_id' => (int)$user['id']
]);
?>
