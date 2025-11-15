# Guía del Endpoint Controller

Esta guía explica en detalle por qué y cómo implementar un endpoint controller para FilesExplorer.

## 📖 Índice

1. [¿Por qué necesitas un endpoint?](#por-qué-necesitas-un-endpoint)
2. [Arquitectura de 3 capas](#arquitectura-de-3-capas)
3. [Dos tipos de respuestas](#dos-tipos-de-respuestas)
4. [Implementación paso a paso](#implementación-paso-a-paso)
5. [Casos de uso avanzados](#casos-de-uso-avanzados)
6. [Troubleshooting](#troubleshooting)

---

## ¿Por qué necesitas un endpoint?

### ❌ Diseño antiguo (v1.x - Legacy)

```php
// BAD: La librería manejaba HTTP directamente
require 'class/FilesExplorer.php';

FilesExplorer::setBaseDirectory('/files/');
new FilesExplorer(); // ← Lee $_POST, hace echo, ejecuta exit

// Problemas:
// 1. No puedes testear sin servidor web
// 2. No puedes reutilizar en CLI/workers
// 3. Efectos secundarios ocultos (echo, exit, headers)
// 4. Acoplado a HTTP (no funciona con GraphQL, gRPC, etc.)
```

### ✅ Diseño moderno (v3.x - Actual)

```php
// GOOD: Separación de responsabilidades
require 'autoload.php';

// Controller maneja HTTP (TU código)
$config = ['base_dir' => '/files/', ...];
$explorer = new FilesExplorer($config);
$result = $explorer->execute($_POST, $_FILES);

// TÚ decides cómo responder
header('Content-Type: application/json');
echo json_encode($result);

// Beneficios:
// 1. Testeable: $result = $explorer->execute(['action' => 'displaylist'], [])
// 2. Reutilizable: CLI, workers, APIs, microservicios
// 3. Predecible: No hay efectos secundarios ocultos
// 4. Flexible: Puedes modificar/interceptar respuestas
```

---

## Arquitectura de 3 capas

FilesExplorer sigue el patrón MVC/Clean Architecture:

```
┌──────────────────────────────────────────────────────────────┐
│                    NAVEGADOR (Cliente)                        │
│  - Renderiza UI                                               │
│  - Maneja eventos de usuario                                  │
│  - Envía peticiones AJAX                                      │
└───────────────────┬──────────────────────────────────────────┘
                    │
                    │ HTTP POST
                    │ Content-Type: multipart/form-data (upload)
                    │               application/x-www-form-urlencoded
                    ▼
┌──────────────────────────────────────────────────────────────┐
│              CONTROLLER (PHP - TU CÓDIGO)                     │
│                                                                │
│  Responsabilidades:                                            │
│  ✓ Autenticación/Autorización                                 │
│  ✓ Validación de entrada HTTP                                 │
│  ✓ Configurar la librería (base_dir, permisos)                │
│  ✓ Llamar a la librería                                       │
│  ✓ Decidir tipo de respuesta (JSON vs binario)                │
│  ✓ Establecer headers HTTP                                    │
│  ✓ Enviar respuesta al cliente                                │
│  ✓ Logging/Auditoría                                          │
│                                                                │
│  Ejemplo:                                                      │
│  if (!authenticated()) { return 403; }                         │
│  $explorer = new FilesExplorer($config);                       │
│  $result = $explorer->execute($_POST, $_FILES);               │
│  if ($result['action'] === 'download') {                      │
│      sendBinaryResponse($result);                              │
│  } else {                                                      │
│      sendJsonResponse($result);                                │
│  }                                                             │
└───────────────────┬──────────────────────────────────────────┘
                    │
                    │ execute(array $data, array $files): array
                    ▼
┌──────────────────────────────────────────────────────────────┐
│            FILESEXPLORER (Librería Core)                      │
│                                                                │
│  Responsabilidades:                                            │
│  ✓ Lógica de negocio pura                                     │
│  ✓ Operaciones sobre archivos/carpetas                        │
│  ✓ Validación de paths (path traversal)                       │
│  ✓ Validación de nombres de archivo                           │
│  ✓ Gestión de errores                                         │
│  ✓ Retornar resultados estructurados                          │
│                                                                │
│  NO hace:                                                      │
│  ✗ Leer $_POST, $_FILES, $_SESSION                            │
│  ✗ Establecer headers HTTP                                    │
│  ✗ echo/print/exit                                            │
│  ✗ Autenticación                                              │
│                                                                │
│  Entrada: Arrays planos (testeables)                          │
│  Salida: Arrays estructurados (testeables)                    │
└──────────────────────────────────────────────────────────────┘
```

### Ventajas de esta arquitectura

| Capa | Responsabilidad | Ventaja |
|------|----------------|---------|
| **Frontend** | UI/UX | Cambiar diseño sin tocar backend |
| **Controller** | HTTP/Auth | Cambiar autenticación sin tocar lógica |
| **Librería** | Lógica | Reutilizar en CLI, tests, otros proyectos |

---

## Dos tipos de respuestas

El controller debe manejar **dos flujos de respuesta diferentes**:

### 🔹 Respuesta JSON (mayoría de acciones)

**Acciones:** `displaylist`, `upload`, `delete`, `addfolder`, `rename`, `move`, `shared`

**Flujo:**
1. Cliente envía POST con `action=displaylist`
2. Librería procesa y retorna array
3. Controller convierte a JSON y envía

```php
// controller.php
$result = $explorer->execute($_POST, $_FILES);

// Resultado típico:
// [
//     'files' => [
//         ['name' => 'doc.pdf', 'size' => 1024, 'type' => 'file'],
//         ['name' => 'carpeta', 'type' => 'dir']
//     ],
//     'path_relative' => 'proyectos/',
//     'allowed_actions' => ['upload', 'delete']
// ]

header('Content-Type: application/json; charset=utf-8');
echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
exit;
```

**Headers requeridos:**
```
Content-Type: application/json; charset=utf-8
```

**Cliente JavaScript:**
```javascript
fetch('controller.php', {
    method: 'POST',
    body: formData
})
.then(res => res.json())
.then(data => {
    console.log(data.files); // Array de archivos
});
```

---

### 🔸 Respuesta Binaria (descargas)

**Acción:** `download`

**Flujo:**
1. Cliente envía POST con `action=download&file=documento.pdf`
2. Librería retorna **metadata** (no el archivo)
3. Controller lee el archivo y lo envía como stream

```php
// controller.php
$result = $explorer->execute($_POST, $_FILES);

// Para downloads, la librería retorna:
// [
//     'action' => 'download',
//     'file_path' => '/ruta/absoluta/documento.pdf',
//     'filename' => 'documento.pdf',
//     'path_relative' => 'proyectos/'
// ]

if (isset($result['action']) && $result['action'] === 'download') {
    // IMPORTANTE: Diferentes headers para descarga
    header('Content-Description: File Transfer');
    header('Content-Type: application/octet-stream');
    header('Content-Disposition: attachment; filename="' . basename($result['filename']) . '"');
    header('Content-Length: ' . filesize($result['file_path']));
    header('Cache-Control: must-revalidate');
    header('Pragma: public');
    
    // Limpiar buffer antes de enviar archivo
    ob_clean();
    flush();
    
    // Streaming eficiente (no carga todo en RAM)
    readfile($result['file_path']);
    exit;
}

// Si no es download, respuesta JSON normal
header('Content-Type: application/json; charset=utf-8');
echo json_encode($result);
```

**Headers requeridos:**
```
Content-Type: application/octet-stream
Content-Disposition: attachment; filename="documento.pdf"
Content-Length: 102400
Cache-Control: must-revalidate
Pragma: public
```

**Cliente JavaScript:**
```javascript
fetch('controller.php', {
    method: 'POST',
    body: formData
})
.then(res => res.blob()) // ← Blob, no JSON
.then(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'documento.pdf';
    a.click();
});
```

### ⚠️ ¿Por qué no base64?

Alternativa **MALA** (no implementes esto):

```php
// ❌ NO HAGAS ESTO
$result = $explorer->execute($_POST, $_FILES);

if ($result['action'] === 'download') {
    $binary = file_get_contents($result['file_path']);
    $base64 = base64_encode($binary); // ← +33% tamaño
    
    header('Content-Type: application/json');
    echo json_encode(['data' => $base64, 'filename' => 'doc.pdf']);
}
```

**Problemas:**
- ❌ Archivo 10MB → 13.3MB base64
- ❌ PHP memory_limit se alcanza más rápido
- ❌ JavaScript debe decodificar (lento y usa mucha RAM)
- ❌ Archivos grandes (>50MB) son inviables
- ❌ Sin ventajas reales, solo complicaciones

**Solución correcta:** Streaming binario con `readfile()` ✅

---

## Implementación paso a paso

### Paso 1: Crear estructura de archivos

```
tu-proyecto/
├── controller.php       ← Endpoint (creas tú)
├── index.html           ← Vista (creas tú)
├── files/               ← Almacenamiento (crear con permisos 755)
└── vendor/              ← Si usas Composer
    └── richard/
        └── files-explorer/
```

### Paso 2: Implementar controller básico

```php
<?php
// controller.php
require_once __DIR__ . '/vendor/autoload.php'; // o '/path/to/autoload.php'

use Richard\FilesExplorer\FilesExplorer;

// Configuración
$config = [
    'base_dir' => __DIR__ . '/files/',
    'base_url' => '/files/',
    'allowed_actions' => ['upload', 'download', 'delete', 'addfolder', 'rename', 'move', 'shared']
];

// Solo procesar POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Content-Type: application/json');
    echo json_encode(['errors' => ['Método no permitido']]);
    exit;
}

try {
    // Instanciar librería
    $explorer = new FilesExplorer($config);
    
    // Ejecutar acción
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
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'errors' => [$e->getMessage()],
        'path_relative' => $_POST['path_relative'] ?? ''
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
exit;
```

### Paso 3: Crear vista HTML

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Files Explorer</title>
    
    <!-- Bootstrap 5 -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    
    <!-- FilesExplorer CSS -->
    <link href="vendor/richard/files-explorer/public/css/FilesExplorer.css" rel="stylesheet">
    
    <!-- Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    
    <!-- FilesExplorer JS -->
    <script src="vendor/richard/files-explorer/public/js/FilesExplorer.js"></script>
</head>
<body class="bg-light">
    <div class="container py-4">
        <h1>Gestor de Archivos</h1>
        
        <!-- Contenedor del explorador -->
        <div id="files_explorer"></div>
    </div>
    
    <script>
        window.onload = function() {
            let explorer = new FilesExplorer('files_explorer');
            
            // Configuración
            explorer.setServerController('controller.php');
            explorer.setPathRelative('');
            
            // Inicializar
            explorer.start();
        };
    </script>
</body>
</html>
```

### Paso 4: Configurar permisos

```bash
# Crear directorio de almacenamiento
mkdir files
chmod 755 files

# Dar permisos de escritura al usuario del servidor web
# Ubuntu/Debian:
sudo chown www-data:www-data files

# macOS (MAMP/XAMPP):
sudo chown _www:_www files

# O dar permisos más abiertos (solo desarrollo):
chmod 777 files
```

### Paso 5: Probar

```bash
# Opción 1: Servidor PHP integrado
php -S localhost:8000

# Opción 2: Apache/Nginx
# Configura virtual host apuntando a tu proyecto
```

Abre http://localhost:8000/index.html

---

## Casos de uso avanzados

### 1. Autenticación de usuarios

```php
// controller.php
session_start();

// Verificar login
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    header('Content-Type: application/json');
    echo json_encode(['errors' => ['No autenticado']]);
    exit;
}

// Directorio por usuario
$userDir = __DIR__ . "/files/user_{$_SESSION['user_id']}/";
if (!is_dir($userDir)) {
    mkdir($userDir, 0755, true);
}

$config = [
    'base_dir' => $userDir,
    'base_url' => "/files/user_{$_SESSION['user_id']}/",
    'allowed_actions' => ['upload', 'download', 'delete', 'addfolder', 'rename', 'move']
];

$explorer = new FilesExplorer($config);
// ... resto del código
```

### 2. Permisos por rol

```php
// controller.php
$user = getUserFromSession();

// Permisos según rol
$permissions = [
    'admin' => ['upload', 'download', 'delete', 'addfolder', 'rename', 'move', 'shared'],
    'editor' => ['upload', 'download', 'addfolder', 'rename'],
    'viewer' => ['download']
];

$config = [
    'base_dir' => __DIR__ . '/files/',
    'base_url' => '/files/',
    'allowed_actions' => $permissions[$user['role']] ?? []
];

$explorer = new FilesExplorer($config);
// ... resto del código
```

### 3. Logging y auditoría

```php
// controller.php
$explorer = new FilesExplorer($config);
$result = $explorer->execute($_POST, $_FILES);

// Log de acciones
if (!isset($result['errors'])) {
    $logEntry = sprintf(
        "[%s] Usuario %d ejecutó %s en %s\n",
        date('Y-m-d H:i:s'),
        $_SESSION['user_id'],
        $_POST['action'] ?? 'unknown',
        $_POST['path_relative'] ?? '/'
    );
    file_put_contents('audit.log', $logEntry, FILE_APPEND);
}

// Enviar respuesta...
```

### 4. Límites de cuota por usuario

```php
// controller.php
function getUserQuota($userId) {
    $userDir = __DIR__ . "/files/user_{$userId}/";
    $size = 0;
    
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($userDir)
    );
    
    foreach ($iterator as $file) {
        $size += $file->getSize();
    }
    
    return $size;
}

// Antes de upload
if ($_POST['action'] === 'upload') {
    $currentSize = getUserQuota($_SESSION['user_id']);
    $maxSize = 100 * 1024 * 1024; // 100 MB
    
    if ($currentSize >= $maxSize) {
        http_response_code(413);
        header('Content-Type: application/json');
        echo json_encode(['errors' => ['Cuota excedida']]);
        exit;
    }
}

$explorer = new FilesExplorer($config);
// ... resto del código
```

### 5. Validación de tipos de archivo

```php
// controller.php
$allowedExtensions = ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'];

// Validar antes de procesar upload
if ($_POST['action'] === 'upload' && !empty($_FILES['files'])) {
    foreach ($_FILES['files']['name'] as $filename) {
        $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        
        if (!in_array($ext, $allowedExtensions)) {
            http_response_code(400);
            header('Content-Type: application/json');
            echo json_encode(['errors' => ["Tipo de archivo no permitido: {$ext}"]]);
            exit;
        }
    }
}

$explorer = new FilesExplorer($config);
// ... resto del código
```

### 6. Protección CSRF

```php
// controller.php
session_start();

// Generar token CSRF (una vez, al cargar la vista)
if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// Validar token en cada POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $token = $_POST['csrf_token'] ?? '';
    
    if (!hash_equals($_SESSION['csrf_token'], $token)) {
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode(['errors' => ['Token CSRF inválido']]);
        exit;
    }
}

$explorer = new FilesExplorer($config);
// ... resto del código
```

```javascript
// En el frontend, añadir token a cada petición
let formData = new FormData();
formData.append('action', 'displaylist');
formData.append('csrf_token', '<?php echo $_SESSION["csrf_token"]; ?>');

fetch('controller.php', {
    method: 'POST',
    body: formData
});
```

---

## Troubleshooting

### Problema: "Content-Type: application/json" pero recibo binario

**Síntoma:** El navegador intenta parsear archivo binario como JSON

**Causa:** Olvidaste detectar `action=download`

**Solución:**
```php
if (isset($result['action']) && $result['action'] === 'download') {
    header('Content-Type: application/octet-stream'); // ← Binario
    // ...
    readfile($result['file_path']);
    exit;
}

// Solo si NO es download
header('Content-Type: application/json');
echo json_encode($result);
```

---

### Problema: "Cannot modify header information - headers already sent"

**Causa:** Hay output antes de `header()`

**Solución:**
```php
<?php // ← Sin espacios/saltos de línea antes de <?php
// Sin echo/print antes de headers

header('Content-Type: application/json');
echo json_encode($result);
exit; // ← Importante para descargas
```

---

### Problema: Archivos subidos no aparecen

**Causa:** Permisos incorrectos en `base_dir`

**Solución:**
```bash
chmod 755 files/
chown www-data:www-data files/  # Ubuntu
chown _www:_www files/          # macOS
```

---

### Problema: Error 413 "Request Entity Too Large"

**Causa:** Límites PHP de upload

**Solución:** Edita `php.ini`:
```ini
upload_max_filesize = 50M
post_max_size = 50M
max_execution_time = 300
memory_limit = 256M
```

---

### Problema: Descargas corruptas o incompletas

**Causa:** Output buffer no limpiado

**Solución:**
```php
if ($result['action'] === 'download') {
    header('Content-Type: application/octet-stream');
    // ...
    
    ob_clean(); // ← Limpiar buffer
    flush();    // ← Vaciar
    
    readfile($result['file_path']);
    exit;
}
```

---

### Problema: CORS errors en desarrollo

**Causa:** Frontend y backend en puertos diferentes

**Solución:**
```php
// controller.php (solo desarrollo)
header('Access-Control-Allow-Origin: http://localhost:3000');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}
```

---

## Resumen

✅ **Controller es necesario** porque:
- Separa HTTP de lógica de negocio
- Permite testear la librería
- Reutilizable en diferentes contextos

✅ **Dos tipos de respuestas**:
- JSON para mayoría de acciones
- Binario streaming para downloads

✅ **Implementación mínima**:
```php
$explorer = new FilesExplorer($config);
$result = $explorer->execute($_POST, $_FILES);

if ($result['action'] === 'download') {
    // Headers binarios + readfile()
} else {
    // Headers JSON + json_encode()
}
```

✅ **Personalizable** para:
- Autenticación
- Autorización
- Logging
- Validaciones custom
- Integración con frameworks

---

**¿Preguntas?** Abre un issue en GitHub: https://github.com/RichardCollao/FilesExplorer/issues
