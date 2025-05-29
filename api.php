<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type");

require_once 'db.php';

$db = new Database();
$pdo = $db->getConnection();

$request_method = $_SERVER['REQUEST_METHOD'];
$request_uri = $_SERVER['REQUEST_URI'];

// Функция для получения входных данных
function getInputData() {
    return json_decode(file_get_contents('php://input'), true);
}

// Получить все задачи (с подзадачами)
if ($request_method == 'GET' && $request_uri == '/api.php/tasks') {
    try {
        $stmt = $pdo->query("SELECT * FROM tasks ORDER BY created_at ASC");
        $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Организация задач с подзадачами
        $organizedTasks = [];
        foreach ($tasks as $task) {
            if ($task['parent_id'] === null) {
                $task['subtasks'] = [];
                $organizedTasks[$task['id']] = $task;
            }
        }
        
        foreach ($tasks as $task) {
            if ($task['parent_id'] !== null && isset($organizedTasks[$task['parent_id']])) {
                $organizedTasks[$task['parent_id']]['subtasks'][] = $task;
            }
        }
        
        echo json_encode(array_values($organizedTasks));
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

// Добавить новую задачу
elseif ($request_method == 'POST' && $request_uri == '/api.php/tasks') {
    $data = getInputData();
    
    if (empty($data['title'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Название задачи обязательно']);
        exit;
    }
    
    $parent_id = isset($data['parent_id']) ? $data['parent_id'] : null;
    
    try {
        $stmt = $pdo->prepare("INSERT INTO tasks (title, parent_id) VALUES (:title, :parent_id)");
        $stmt->execute([':title' => $data['title'], ':parent_id' => $parent_id]);
        
        $task_id = $pdo->lastInsertId();
        $stmt = $pdo->prepare("SELECT * FROM tasks WHERE id = ?");
        $stmt->execute([$task_id]);
        $task = $stmt->fetch(PDO::FETCH_ASSOC);
        
        echo json_encode($task);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

// Обновление статуса задачи (выполнено/не выполнено)
elseif ($request_method == 'PUT' && preg_match('/^\/api.php\/tasks\/(\d+)$/', $request_uri, $matches)) {
    $task_id = $matches[1];
    $data = getInputData();
    
    // Проверка и нормализация параметра is_completed
    if (!isset($data['is_completed'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Не указан статус выполнения задачи']);
        exit;
    }

    // Преобразуем значение в boolean (1/0)
    $is_completed = filter_var($data['is_completed'], FILTER_VALIDATE_BOOLEAN) ? 1 : 0;

    try {
        // Получаем текущий статус задачи
        $stmt = $pdo->prepare("SELECT is_completed FROM tasks WHERE id = ?");
        $stmt->execute([$task_id]);
        $current_task = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$current_task) {
            http_response_code(404);
            echo json_encode(['error' => 'Задача не найдена']);
            exit;
        }

        // Если статус не изменился, просто возвращаем текущую задачу
        if ($current_task['is_completed'] == $is_completed) {
            $stmt = $pdo->prepare("SELECT * FROM tasks WHERE id = ?");
            $stmt->execute([$task_id]);
            $task = $stmt->fetch(PDO::FETCH_ASSOC);
            echo json_encode($task);
            exit;
        }

        // Обновляем статус задачи
        $stmt = $pdo->prepare("UPDATE tasks SET is_completed = :is_completed WHERE id = :id");
        $stmt->execute([
            ':is_completed' => $is_completed,
            ':id' => $task_id
        ]);

        // Обновляем статус всех подзадач, если они есть (только при отметке как выполненной)
        if ($is_completed) {
            $stmt = $pdo->prepare("UPDATE tasks SET is_completed = 1 WHERE parent_id = :id");
            $stmt->execute([':id' => $task_id]);
        }

        // Возвращаем обновленную задачу
        $stmt = $pdo->prepare("SELECT * FROM tasks WHERE id = ?");
        $stmt->execute([$task_id]);
        $task = $stmt->fetch(PDO::FETCH_ASSOC);
        
        echo json_encode($task);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Ошибка сервера: ' . $e->getMessage()]);
    }
}

// Удалить задачу
elseif ($request_method == 'DELETE' && preg_match('/^\/api.php\/tasks\/(\d+)$/', $request_uri, $matches)) {
    $task_id = $matches[1];
    
    try {
        $stmt = $pdo->prepare("DELETE FROM tasks WHERE id = ?");
        $stmt->execute([$task_id]);
        
        if ($stmt->rowCount() > 0) {
            echo json_encode(['message' => 'Задача успешно удалена']);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Задача не найдена']);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

else {
    http_response_code(404);
    echo json_encode(['error' => 'Страницы не существует']);
}