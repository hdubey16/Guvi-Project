<?php
/**
 * User Profile Endpoint (GET, POST & DELETE)
 * - GET:    Fetch user profile from MongoDB
 * - POST:   Update user profile in MongoDB  (or logout via action=logout)
 * - DELETE:  Logout — remove session from Redis
 * - All requests require valid session token (Redis)
 *
 * HCL GUVI Internship Project — Himanshu Dubey
 */

// ==================== Dependencies & Config ====================
require_once __DIR__ . '/vendor/autoload.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

define('MONGO_HOST', 'localhost');
define('MONGO_PORT', 27017);
define('MONGO_DB',   'guvi_profiles');
define('REDIS_HOST', '127.0.0.1');
define('REDIS_PORT', 6379);
define('SESSION_EXPIRY', 86400);

function getMongoManager() {
    try {
        $manager = new MongoDB\Driver\Manager("mongodb://" . MONGO_HOST . ":" . MONGO_PORT);
        return $manager;
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'MongoDB Connection Failed: ' . $e->getMessage()]);
        exit();
    }
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

function validateToken($token) {
    if (empty($token)) return false;
    $redis = getRedisConnection();
    $sessionData = $redis->get("session:" . $token);
    if ($sessionData) return json_decode($sessionData, true);
    return false;
}

function getAuthToken() {
    $headers = [];
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
    }
    if (empty($headers)) {
        foreach ($_SERVER as $key => $value) {
            if (substr($key, 0, 5) === 'HTTP_') {
                $header = str_replace(' ', '-', ucwords(str_replace('_', ' ', strtolower(substr($key, 5)))));
                $headers[$header] = $value;
            }
        }
    }
    foreach ($headers as $key => $value) {
        if (strtolower($key) === 'authorization') {
            return str_replace('Bearer ', '', $value);
        }
    }
    return null;
}

function sendResponse($success, $message, $data = []) {
    $response = array_merge(['success' => $success, 'message' => $message], $data);
    echo json_encode($response);
    exit();
}

// ==================== Logout (DELETE or POST with action) ====================

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $token = getAuthToken();
    if ($token) {
        try { $redis = getRedisConnection(); $redis->del("session:" . $token); }
        catch (Exception $e) { error_log('Redis logout error: ' . $e->getMessage()); }
    }
    sendResponse(true, 'Logged out successfully');
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (isset($input['action']) && $input['action'] === 'logout') {
        $token = getAuthToken();
        if ($token) {
            try { $redis = getRedisConnection(); $redis->del("session:" . $token); }
            catch (Exception $e) { error_log('Redis logout error: ' . $e->getMessage()); }
        }
        sendResponse(true, 'Logged out successfully');
    }
}

// ==================== Authentication Check ====================

$token = getAuthToken();
if (!$token) {
    http_response_code(401);
    sendResponse(false, 'No authentication token provided');
}

$session = validateToken($token);
if (!$session) {
    http_response_code(401);
    sendResponse(false, 'Invalid or expired session. Please login again.');
}

$userId = (int)$session['user_id'];
$userEmail = $session['email'];

// ==================== GET: Fetch Profile ====================

if ($_SERVER['REQUEST_METHOD'] === 'GET') {

    $mongo = getMongoManager();

    try {
        $filter = new MongoDB\Driver\Query(['user_id' => $userId]);
        $cursor = $mongo->executeQuery(MONGO_DB . '.profiles', $filter);
        $profiles = $cursor->toArray();

        if (count($profiles) > 0) {
            $profile = (array)$profiles[0];
            $responseData = [
                'email'     => isset($profile['email']) ? $profile['email'] : $userEmail,
                'full_name' => isset($profile['full_name']) ? $profile['full_name'] : '',
                'age'       => isset($profile['age']) ? $profile['age'] : '',
                'dob'       => isset($profile['dob']) ? $profile['dob'] : '',
                'contact'   => isset($profile['contact']) ? $profile['contact'] : '',
                'address'   => isset($profile['address']) ? $profile['address'] : ''
            ];
        } else {
            $responseData = [
                'email'     => $userEmail,
                'full_name' => '',
                'age'       => '',
                'dob'       => '',
                'contact'   => '',
                'address'   => ''
            ];
        }

        sendResponse(true, 'Profile loaded successfully', ['profile' => $responseData]);

    } catch (Exception $e) {
        http_response_code(500);
        sendResponse(false, 'Failed to load profile: ' . $e->getMessage());
    }

// ==================== POST: Update Profile ====================

} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {

    $input = json_decode(file_get_contents('php://input'), true);

    $fullName = isset($input['full_name']) ? htmlspecialchars(trim($input['full_name']), ENT_QUOTES, 'UTF-8') : '';
    $age      = isset($input['age']) && $input['age'] !== '' ? intval($input['age']) : null;
    $dob      = isset($input['dob']) ? htmlspecialchars(trim($input['dob']), ENT_QUOTES, 'UTF-8') : '';
    $contact  = isset($input['contact']) ? htmlspecialchars(trim($input['contact']), ENT_QUOTES, 'UTF-8') : '';
    $address  = isset($input['address']) ? htmlspecialchars(trim($input['address']), ENT_QUOTES, 'UTF-8') : '';

    if (empty($fullName)) {
        sendResponse(false, 'Full name is required');
    }
    if (strlen($fullName) > 100) {
        sendResponse(false, 'Full name must be less than 100 characters');
    }
    if ($age !== null && ($age < 1 || $age > 150)) {
        sendResponse(false, 'Please enter a valid age (1-150)');
    }
    if (!empty($dob)) {
        $dobDate = DateTime::createFromFormat('Y-m-d', $dob);
        if (!$dobDate || $dobDate->format('Y-m-d') !== $dob) {
            sendResponse(false, 'Invalid date of birth format');
        }
        if ($dobDate > new DateTime()) {
            sendResponse(false, 'Date of birth cannot be in the future');
        }
    }
    if (!empty($contact) && !preg_match('/^[0-9]{10}$/', $contact)) {
        sendResponse(false, 'Contact number must be exactly 10 digits');
    }
    if (strlen($address) > 500) {
        sendResponse(false, 'Address must be less than 500 characters');
    }

    // ==================== MongoDB: Update Profile ====================

    $mongo = getMongoManager();

    try {
        $bulk = new MongoDB\Driver\BulkWrite;
        $bulk->update(
            ['user_id' => $userId],
            ['$set' => [
                'user_id'    => $userId,
                'email'      => $userEmail,
                'full_name'  => $fullName,
                'age'        => $age,
                'dob'        => $dob,
                'contact'    => $contact,
                'address'    => $address,
                'updated_at' => new MongoDB\BSON\UTCDateTime()
            ]],
            ['upsert' => true]
        );

        $result = $mongo->executeBulkWrite(MONGO_DB . '.profiles', $bulk);
        sendResponse(true, 'Profile updated successfully!');

    } catch (Exception $e) {
        http_response_code(500);
        sendResponse(false, 'Failed to update profile: ' . $e->getMessage());
    }

} else {
    sendResponse(false, 'Invalid request method');
}
?>
