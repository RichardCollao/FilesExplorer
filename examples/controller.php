<?php
// Wrapper para la demo: prepara configuración y delega en la clase namespaced
require_once __DIR__ . '/../autoload.php';

// Directorio de demo donde se guardan los archivos
$baseDir = realpath(__DIR__ . '/../root_files');
if ($baseDir === false) {
    $baseDir = __DIR__ . '/../root_files';
    if (!is_dir($baseDir)) {
        mkdir($baseDir, 0755, true);
    }
}

// Configuración del explorador
$config = [
    'base_dir' => rtrim($baseDir, '/') . '/',
    'base_url' => '/',
    'allowed_actions' => ['upload', 'download', 'delete', 'addfolder', 'rename', 'move', 'shared']
];

// Procesar peticiones POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $explorer = new \Richard\FilesExplorer\FilesExplorer($config);
        $result = $explorer->execute($_POST, $_FILES);
        
        // Caso especial: descarga de archivos
        if (isset($result['action']) && $result['action'] === 'download') {
            header('Content-Description: File Transfer');
            header('Content-Type: application/octet-stream');
            header('Content-Disposition: attachment; filename="' . basename($result['filename']) . '"');
            header('Content-Length: ' . filesize($result['file_path']));
            header('Cache-Control: must-revalidate');
            header('Pragma: public');
            
            ob_clean();
            flush();
            readfile($result['file_path']);
            exit;
        }
        
        // Respuesta JSON normal
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        
    } catch (\Throwable $e) {
        header('Content-Type: application/json; charset=utf-8', true, 500);
        echo json_encode([
            'errors' => [$e->getMessage()],
            'path_relative' => $_POST['path_relative'] ?? ''
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
    exit;
}

// Si se accede por GET, devolver ayuda simple
header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'info' => 'FilesExplorer controller. POST to perform actions.'
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
exit;
