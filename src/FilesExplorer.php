<?php

namespace Richard\FilesExplorer;

/**
 * FilesExplorer - Explorador de Archivos Refactorizado (namespaced)
 *
 * Esta versión está pensada para ser usada como librería (PSR-4).
 * La configuración se pasa como array al constructor.
 * Agnóstico de HTTP: procesa datos y devuelve resultados (no maneja $_POST ni headers directamente).
 *
 * @version 3.0
 */
class FilesExplorer {

    // ========================================================================
    // CONSTANTES
    // ========================================================================
    
    const DEFAULT_MAX_FILE_SIZE = 5242880; // 5MB en bytes
    const DEFAULT_PERMISSIONS = 0755;

    // ========================================================================
    // PROPIEDADES
    // ========================================================================
    
    private $errors = [];
    private $baseDir;
    private $baseUrl;
    private $allowedActions;

    // ========================================================================
    // CONSTRUCTOR
    // ========================================================================
    
    /**
     * @param array $config Configuración: ['base_dir' => '/path/', 'base_url' => '/', 'allowed_actions' => [...]]
     */
    public function __construct(array $config = []) {
        $this->baseDir = $config['base_dir'] ?? '';
        $this->baseUrl = $config['base_url'] ?? '/';
        $this->allowedActions = $config['allowed_actions'] ?? [];

        if (empty($this->baseDir)) {
            throw new \RuntimeException('El directorio base no está definido');
        }

        if (!is_dir($this->baseDir)) {
            throw new \RuntimeException("El directorio base no existe: {$this->baseDir}");
        }

        // Normalizar base_dir
        $this->baseDir = rtrim($this->baseDir, '/') . '/';
    }

    // ========================================================================
    // API PÚBLICA
    // ========================================================================
    
    /**
     * Ejecuta una acción del explorador
     * 
     * @param array $requestData Datos de la petición ($_POST)
     * @param array $files Archivos subidos ($_FILES)
     * @return array Resultado de la operación
     */
    public function execute(array $requestData, array $files = []): array {
        $data = $this->sanitizeInput($requestData);
        $action = $data['action'] ?? '';

        if (!$this->isValidAction($action)) {
            return [
                'errors' => ['Acción no válida'],
                'path_relative' => $data['path_relative'] ?? '',
                'allowed_actions' => $this->allowedActions
            ];
        }

        if (!$this->isAllowedAction($action)) {
            return [
                'errors' => ['No tiene permisos para realizar esta operación'],
                'path_relative' => $data['path_relative'] ?? '',
                'allowed_actions' => $this->allowedActions
            ];
        }

        try {
            // Ejecutar la acción y devolver resultado
            return $this->$action($data, $files);
        } catch (\Exception $e) {
            return [
                'errors' => [$e->getMessage()],
                'path_relative' => $data['path_relative'] ?? '',
                'allowed_actions' => $this->allowedActions
            ];
        }
    }

    // ========================================================================
    // VALIDACIÓN Y SEGURIDAD
    // ========================================================================
    
    /**
     * Verifica si una acción es válida (existe como método)
     */
    private function isValidAction(string $action): bool {
        return method_exists($this, $action);
    }

    /**
     * Verifica si una acción está permitida para el usuario
     */
    private function isAllowedAction(string $action): bool {
        // displaylist siempre está permitida
        if ($action === 'displaylist') {
            return true;
        }

        return in_array($action, $this->allowedActions);
    }

    /**
     * Sanitiza datos de entrada para prevenir ataques
     */
    private function sanitizeInput($input) {
        if (is_array($input)) {
            return array_map([$this, 'sanitizeInput'], $input);
        }
        
        $input = trim($input);
        // Elimina intentos de navegación de directorios
        $input = preg_replace(['#\\.\./#', '#\./#', '#\\\\#'], '', $input);
        return $input;
    }

    /**
     * Valida que un nombre de archivo sea seguro
     */
    private function validateFilename(string $filename): bool {
        // Validar que no esté vacío
        if (empty(trim($filename))) {
            return false;
        }

        // Validar longitud máxima (255 caracteres es el límite en la mayoría de sistemas)
        if (strlen($filename) > 255) {
            return false;
        }

        // Caracteres peligrosos que NO se permiten
        $dangerousChars = ['/', '\\', ':', '*', '?', '"', "'", '<', '>', '|'];
        
        foreach ($dangerousChars as $char) {
            if (strpos($filename, $char) !== false) {
                return false;
            }
        }

        // Validar caracteres de control (null byte, newline, etc.)
        if (preg_match('/[\x00-\x1F\x7F]/', $filename)) {
            return false;
        }

        // Nombres reservados del sistema (Windows)
        $reservedNames = [
            'CON', 'PRN', 'AUX', 'NUL',
            'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
            'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
        ];

        $nameWithoutExt = pathinfo($filename, PATHINFO_FILENAME);
        if (in_array(strtoupper($nameWithoutExt), $reservedNames)) {
            return false;
        }

        // No permitir solo puntos
        if (preg_match('/^\.+$/', $filename)) {
            return false;
        }

        return true;
    }

    /**
     * Sanitiza un nombre de archivo reemplazando caracteres peligrosos
     */
    private function sanitizeFilename(string $filename): string {
        // Reemplazar caracteres peligrosos con guión bajo
        $dangerous = ['/', '\\', ':', '*', '?', '"', "'", '<', '>', '|', "\0", "\n", "\r", "\t"];
        $filename = str_replace($dangerous, '_', $filename);
        
        // Limpiar espacios múltiples
        $filename = preg_replace('/\s+/', ' ', $filename);
        
        // Trim
        $filename = trim($filename);
        
        // Limitar longitud
        if (strlen($filename) > 255) {
            $filename = substr($filename, 0, 255);
        }
        
        return $filename;
    }

    /**
     * Construye y valida una ruta completa
     */
    private function buildPath(string $relativePath): string {
        $path = empty($relativePath) ? $this->baseDir : $this->baseDir . ltrim($relativePath, '/') . '/';
        
        // Validar que la ruta resultante esté dentro del directorio base
        $realBase = realpath($this->baseDir);
        $realPath = realpath($path) ?: $path;
        
        if ($realBase && strpos($realPath, $realBase) !== 0) {
            throw new \RuntimeException('Acceso denegado: intento de salir del directorio base');
        }
        
        return $path;
    }

    // ========================================================================
    // ACCIONES DEL EXPLORADOR
    // ========================================================================
    
    /**
     * Lista archivos y directorios
     */
    private function displaylist(array $data, array $files = []): array {
        $relativePath = $data['path_relative'] ?? '';
        
        try {
            $directory = $this->buildPath($relativePath);
            
            if (!is_dir($directory)) {
                throw new \RuntimeException('El directorio no existe');
            }

            $filesList = $this->scanDirectory($directory, $data['extensions'] ?? []);
            
            return [
                'path_relative' => $relativePath,
                'files' => $filesList,
                'allowed_actions' => $this->allowedActions
            ];
            
        } catch (\Exception $e) {
            return [
                'errors' => [$e->getMessage()],
                'path_relative' => $relativePath,
                'allowed_actions' => $this->allowedActions
            ];
        }
    }

    /**
     * Descarga un archivo (retorna datos para que el controller maneje la descarga)
     */
    private function download(array $data, array $files = []): array {
        $relativePath = $data['path_relative'] ?? '';
        $filename = $data['file'] ?? '';
        
        try {
            $directory = $this->buildPath($relativePath);
            $filePath = $directory . $filename;
            
            if (!file_exists($filePath) || !is_file($filePath)) {
                throw new \RuntimeException('El archivo no existe');
            }

            return [
                'action' => 'download',
                'file_path' => $filePath,
                'filename' => $filename,
                'path_relative' => $relativePath
            ];
            
        } catch (\Exception $e) {
            return [
                'errors' => [$e->getMessage()],
                'path_relative' => $relativePath
            ];
        }
    }

    /**
     * Sube uno o varios archivos
     */
    private function upload(array $data, array $uploadedFiles = []): array {
        $relativePath = $data['path_relative'] ?? '';
        
        try {
            $directory = $this->buildPath($relativePath);
            $files = $this->normalizeFilesArray($uploadedFiles['files'] ?? []);
            
            if (empty($files)) {
                throw new \RuntimeException('No se recibieron archivos');
            }
            
            $this->errors = [];
            foreach ($files as $file) {
                $this->processUploadedFile($file, $directory);
            }
            
            return [
                'path_relative' => $relativePath,
                'errors' => $this->errors,
                'allowed_actions' => $this->allowedActions
            ];
            
        } catch (\Exception $e) {
            return [
                'errors' => [$e->getMessage()],
                'path_relative' => $relativePath
            ];
        }
    }

    /**
     * Elimina un archivo o directorio
     */
    private function delete(array $data, array $files = []): array {
        $relativePath = $data['path_relative'] ?? '';
        $filename = $data['file'] ?? '';
        
        try {
            $directory = $this->buildPath($relativePath);
            $path = $directory . $filename;
            
            if (!file_exists($path)) {
                throw new \RuntimeException('El archivo o directorio no existe');
            }

            if (is_dir($path)) {
                $this->recursiveDelete($path);
            } else {
                if (!unlink($path)) {
                    throw new \RuntimeException('No se pudo eliminar el archivo');
                }
            }
            
            return [
                'path_relative' => $relativePath,
                'errors' => [],
                'allowed_actions' => $this->allowedActions
            ];
            
        } catch (\Exception $e) {
            return [
                'errors' => [$e->getMessage()],
                'path_relative' => $relativePath
            ];
        }
    }

    /**
     * Crea un nuevo directorio
     */
    private function addfolder(array $data, array $files = []): array {
        $relativePath = $data['path_relative'] ?? '';
        $folderName = $data['folder'] ?? '';
        
        try {
            // Validar nombre de carpeta
            if (!$this->validateFilename($folderName)) {
                throw new \RuntimeException('Nombre de directorio inválido. No se permiten caracteres especiales como: / \\ : * ? " < > | comillas, ni nombres reservados del sistema');
            }

            $directory = $this->buildPath($relativePath);
            $newFolder = $directory . $folderName;
            
            if (file_exists($newFolder)) {
                throw new \RuntimeException('El directorio ya existe');
            }
            
            if (!mkdir($newFolder, self::DEFAULT_PERMISSIONS, true)) {
                throw new \RuntimeException('No se pudo crear el directorio. Verifique los permisos');
            }
            
            return [
                'path_relative' => $relativePath,
                'errors' => [],
                'allowed_actions' => $this->allowedActions
            ];
            
        } catch (\Exception $e) {
            return [
                'errors' => [$e->getMessage()],
                'path_relative' => $relativePath
            ];
        }
    }

    /**
     * Renombra un archivo o directorio
     */
    private function rename(array $data, array $files = []): array {
        $relativePath = $data['path_relative'] ?? '';
        $oldName = $data['file'] ?? '';
        $newName = $data['newname'] ?? '';
        
        try {
            // Validar nuevo nombre
            if (!$this->validateFilename($newName)) {
                throw new \RuntimeException('Nombre inválido. No se permiten caracteres especiales como: / \\ : * ? " < > | comillas, ni nombres reservados del sistema');
            }

            $directory = $this->buildPath($relativePath);
            $oldPath = $directory . $oldName;
            $newPath = $directory . $newName;
            
            if (!file_exists($oldPath)) {
                throw new \RuntimeException('El archivo o directorio no existe');
            }
            
            if (file_exists($newPath)) {
                throw new \RuntimeException('Ya existe un archivo o directorio con ese nombre');
            }
            if (!rename($oldPath, $newPath)) {
                throw new \RuntimeException('No se pudo renombrar el archivo o directorio');
            }
            
            return [
                'path_relative' => $relativePath,
                'errors' => [],
                'allowed_actions' => $this->allowedActions
            ];
            
        } catch (\Exception $e) {
            return [
                'errors' => [$e->getMessage()],
                'path_relative' => $relativePath
            ];
        }
    }

    /**
     * Mueve un archivo o directorio
     */
    private function move(array $data, array $files = []): array {
        $sourceRelativePath = $data['path_relative'] ?? '';
        $targetRelativePath = $data['path_relative_target'] ?? '';
        $filename = $data['file'] ?? '';
        
        try {
            $sourceDir = $this->buildPath($sourceRelativePath);
            $targetDir = $this->buildPath($targetRelativePath);
            
            $sourcePath = $sourceDir . $filename;
            $targetPath = $targetDir . $filename;
            
            if (!file_exists($sourcePath)) {
                throw new \RuntimeException('El archivo o directorio origen no existe');
            }
            
            if (file_exists($targetPath)) {
                throw new \RuntimeException('Ya existe un archivo con ese nombre en el destino');
            }
            
            if (!is_writable($targetDir)) {
                throw new \RuntimeException('El directorio destino no tiene permisos de escritura');
            }
            
            if (!rename($sourcePath, $targetPath)) {
                throw new \RuntimeException('No se pudo mover el archivo o directorio');
            }
            
            return [
                'path_relative' => $targetRelativePath,
                'errors' => [],
                'allowed_actions' => $this->allowedActions
            ];
            
        } catch (\Exception $e) {
            return [
                'errors' => [$e->getMessage()],
                'path_relative' => $sourceRelativePath
            ];
        }
    }

    /**
     * Comparte un archivo (genera enlace público)
     */
    private function shared(array $data, array $files = []): array {
        $relativePath = $data['path_relative'] ?? '';
        $filename = $data['file'] ?? '';
        
        try {
            $directory = $this->buildPath($relativePath);
            $filePath = $directory . $filename;
            
            if (!file_exists($filePath) || !is_file($filePath)) {
                throw new \RuntimeException('El archivo no existe');
            }

            // Generar URL pública del archivo
            $publicUrl = $this->baseUrl . $relativePath . $filename;
            
            return [
                'path_relative' => $relativePath,
                'shared_url' => $publicUrl,
                'allowed_actions' => $this->allowedActions
            ];
            
        } catch (\Exception $e) {
            return [
                'errors' => [$e->getMessage()],
                'path_relative' => $relativePath
            ];
        }
    }

    // ========================================================================
    // AUXILIARES DE ARCHIVOS
    // ========================================================================
    
    /**
     * Escanea un directorio y devuelve información de archivos
     */
    private function scanDirectory(string $directory, array $extensions = []): array {
        $files = [];
        $items = scandir($directory);
        
        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }
            
            $itemPath = $directory . $item;
            $fileInfo = $this->getFileInfo($itemPath);
            
            // Filtrar por extensiones si se especificaron
            if (!empty($extensions) && $fileInfo['mime'] !== 'directory') {
                $ext = strtolower(pathinfo($item, PATHINFO_EXTENSION));
                if (!in_array($ext, $extensions)) {
                    continue;
                }
            }
            
            $files[] = $fileInfo;
        }
        
        // Ordenar: directorios primero, luego archivos alfabéticamente
        usort($files, function($a, $b) {
            $aIsDir = ($a['mime'] === 'directory');
            $bIsDir = ($b['mime'] === 'directory');
            
            if ($aIsDir === $bIsDir) {
                return strcasecmp($a['basename'], $b['basename']);
            }
            return $aIsDir ? -1 : 1;
        });
        
        return $files;
    }

    /**
     * Obtiene información de un archivo o directorio
     */
    private function getFileInfo(string $filePath): array {
        $name = basename($filePath);
        $isDir = is_dir($filePath);
        
        $info = [
            'basename' => $name,
            'mime' => $isDir ? 'directory' : mime_content_type($filePath),
            'size' => $isDir ? 0 : filesize($filePath),
            'modified' => filemtime($filePath),
            'extension' => $isDir ? '' : strtolower(pathinfo($name, PATHINFO_EXTENSION))
        ];
        
        return $info;
    }

    /**
     * Normaliza el array de archivos subidos de PHP
     */
    private function normalizeFilesArray(array $files): array {
        if (empty($files)) {
            return [];
        }

        // Si es un solo archivo
        if (isset($files['name']) && !is_array($files['name'])) {
            return [$files];
        }

        // Si son múltiples archivos
        $normalized = [];
        $fileCount = count($files['name']);
        
        for ($i = 0; $i < $fileCount; $i++) {
            $normalized[] = [
                'name' => $files['name'][$i],
                'type' => $files['type'][$i],
                'tmp_name' => $files['tmp_name'][$i],
                'error' => $files['error'][$i],
                'size' => $files['size'][$i]
            ];
        }
        
        return $normalized;
    }

    /**
     * Procesa un archivo subido individual
     */
    private function processUploadedFile(array $file, string $destination): void {
        // Validar errores de subida
        if ($file['error'] !== UPLOAD_ERR_OK) {
            $this->errors[] = "Error al subir {$file['name']}: " . 
                              $this->getUploadErrorMessage($file['error']);
            return;
        }
        
        // Validar tamaño
        if ($file['size'] > self::DEFAULT_MAX_FILE_SIZE) {
            $maxSizeMB = self::DEFAULT_MAX_FILE_SIZE / 1024 / 1024;
            $this->errors[] = "El archivo {$file['name']} excede el tamaño máximo permitido de {$maxSizeMB}MB";
            return;
        }
        
        // Validar nombre de archivo
        $originalFilename = $file['name'];
        if (!$this->validateFilename($originalFilename)) {
            $this->errors[] = "El nombre del archivo '{$originalFilename}' contiene caracteres no permitidos. Use solo letras, números, espacios, guiones, guiones bajos y puntos";
            return;
        }

        $safeFilename = $this->sanitizeInput($originalFilename);
        
        // Crear directorio si no existe
        if (!is_dir($destination)) {
            mkdir($destination, self::DEFAULT_PERMISSIONS, true);
        }
        
        // Verificar permisos de escritura
        if (!is_writable($destination)) {
            $this->errors[] = "El directorio no tiene permisos de escritura";
            return;
        }
        
        $destinationPath = $destination . $safeFilename;
        
        // Mover archivo
        if (!move_uploaded_file($file['tmp_name'], $destinationPath)) {
            $this->errors[] = "Error al guardar el archivo {$safeFilename}";
            return;
        }
        
        // Establecer permisos
        chmod($destinationPath, 0644);
    }

    /**
     * Obtiene un mensaje de error legible basado en el código de error de PHP
     */
    private function getUploadErrorMessage(int $errorCode): string {
        $errors = [
            UPLOAD_ERR_INI_SIZE => 'El archivo excede el tamaño máximo permitido por el servidor',
            UPLOAD_ERR_FORM_SIZE => 'El archivo excede el tamaño máximo permitido por el formulario',
            UPLOAD_ERR_PARTIAL => 'El archivo se subió parcialmente',
            UPLOAD_ERR_NO_FILE => 'No se subió ningún archivo',
            UPLOAD_ERR_NO_TMP_DIR => 'Falta el directorio temporal',
            UPLOAD_ERR_CANT_WRITE => 'Error al escribir el archivo en disco',
            UPLOAD_ERR_EXTENSION => 'Una extensión de PHP detuvo la subida del archivo'
        ];
        
        return $errors[$errorCode] ?? 'Error desconocido al subir el archivo';
    }

    /**
     * Elimina recursivamente un directorio y su contenido
     */
    private function recursiveDelete(string $path): void {
        if (!is_dir($path)) {
            throw new \RuntimeException('La ruta especificada no es un directorio');
        }

        $items = scandir($path);
        
        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }
            
            $itemPath = $path . '/' . $item;
            
            if (is_dir($itemPath)) {
                $this->recursiveDelete($itemPath);
            } else {
                if (!unlink($itemPath)) {
                    throw new \RuntimeException("No se pudo eliminar el archivo: {$item}");
                }
            }
        }
        
        if (!rmdir($path)) {
            throw new \RuntimeException("No se pudo eliminar el directorio: " . basename($path));
        }
    }

    // ========================================================================
    // RESPUESTAS
    // ========================================================================
}

// Compatibilidad hacia atrás: exponer la clase en el namespace global con alias
if (!\class_exists('FilesExplorer')) {
    \class_alias(__NAMESPACE__ . '\\FilesExplorer', 'FilesExplorer');
}
