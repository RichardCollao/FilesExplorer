# FilesExplorer

Explorador de archivos web para PHP con interfaz moderna.

![Screenshot](https://github.com/RichardCollao/FilesExplorer/blob/master/docs/Captura%20de%20pantalla.png)

## 📋 Descripción

Librería PHP para gestionar archivos desde el navegador. Permite listar, subir, descargar, eliminar, renombrar y mover archivos y carpetas con interfaz Bootstrap 5.

**Características:**
- ✅ Arquitectura HTTP-agnóstica (testeable)
- ✅ PSR-4 autoloading
- ✅ Frontend moderno (Bootstrap 5)
- ✅ Sin dependencia de sesiones

## 🔧 Requerimientos

- PHP >= 7.4
- Extensiones: `json`, `openssl` (para tokens de seguridad, opcional)
- Servidor web (Apache, Nginx, o PHP built-in server)

## 📦 Instalación

```bash
git clone https://github.com/RichardCollao/FilesExplorer.git
cd FilesExplorer
```

## 🚀 Inicio Rápido

### 1. Prueba la demo

```bash
cd examples
php -S localhost:8000
```

Abre http://localhost:8000/example.php en tu navegador.

### 2. Integración básica

Crea un **endpoint controller** (ver sección "Arquitectura" más abajo):

```php
<?php
// controller.php
require_once __DIR__ . '/autoload.php';

$config = [
    'base_dir' => __DIR__ . '/files/',
    'base_url' => '/files/',
    'allowed_actions' => ['upload', 'download', 'delete', 'addfolder', 'rename', 'move', 'shared']
];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $explorer = new \Richard\FilesExplorer\FilesExplorer($config);
    $result = $explorer->execute($_POST, $_FILES);
    
    // Caso especial: descarga de archivos (respuesta binaria)
    if (isset($result['action']) && $result['action'] === 'download') {
        header('Content-Type: application/octet-stream');
        header('Content-Disposition: attachment; filename="' . $result['filename'] . '"');
        readfile($result['file_path']);
        exit;
    }
    
    // Respuesta JSON normal
    header('Content-Type: application/json');
    echo json_encode($result);
    exit;
}
```

Crea la **vista HTML**:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Files Explorer</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="public/css/FilesExplorer.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    <script src="public/js/FilesExplorer.js"></script>
</head>
<body>
    <div id="files_container"></div>
    
    <script>
        window.onload = function() {
            let explorer = new FilesExplorer('files_container');
            explorer.setServerController('controller.php');
            explorer.setPathRelative('');
            explorer.start();
        };
    </script>
</body>
</html>
```

## 🏗️ Arquitectura

```
Frontend (JS) → Controller (PHP) → FilesExplorer Core
```

La librería **no maneja HTTP directamente**, permitiendo:
- Testear sin servidor web
- Agregar autenticación personalizada
- Reutilizar en diferentes contextos

### Respuestas

**JSON** (mayoría): `displaylist`, `upload`, `delete`, etc.
```php
header('Content-Type: application/json');
echo json_encode($result);
```

**Binaria** (descargas):
```php
if (isset($result['action']) && $result['action'] === 'download') {
    header('Content-Disposition: attachment; filename="' . $result['filename'] . '"');
    readfile($result['file_path']);
    exit;
}
```

## 📚 API de la Librería

### Constructor

```php
$explorer = new \Richard\FilesExplorer\FilesExplorer([
    'base_dir' => '/ruta/absoluta/archivos/',  // Requerido
    'base_url' => '/files/',                   // Para enlaces compartidos
    'allowed_actions' => ['upload', 'delete']   // Permisos
]);
```

### Método principal

```php
$result = $explorer->execute(array $requestData, array $files = []): array
```

**Parámetros:**
- `$requestData`: Típicamente `$_POST` (action, path_relative, file, etc.)
- `$files`: Típicamente `$_FILES` (para uploads)

**Retorna:** Array con resultado o errores

### Acciones disponibles

| Acción | Descripción | Respuesta |
|--------|-------------|-----------|
| `displaylist` | Lista archivos/carpetas | JSON con array `files` |
| `upload` | Sube archivo(s) | JSON confirmación |
| `download` | Descarga archivo | Metadata (ver sección binarios) |
| `delete` | Elimina archivo/carpeta | JSON confirmación |
| `addfolder` | Crea carpeta | JSON confirmación |
| `rename` | Renombra archivo/carpeta | JSON confirmación |
| `move` | Mueve archivo/carpeta | JSON confirmación |
| `shared` | Genera enlace público | JSON con `shared_url` |



## 🎨 Frontend API (JavaScript)

```javascript
let explorer = new FilesExplorer('container_id');

// Configuración
explorer.setServerController('controller.php');  // Requerido
explorer.setPathRelative('subcarpeta/');         // Opcional
explorer.setBaseUrlFiles('/files/');             // Opcional

// Iniciar
explorer.start();
```

**Métodos disponibles:**
- `start()`: Inicializa y carga listado
- `setServerController(url)`: Define endpoint
- `setPathRelative(path)`: Navega a subcarpeta
- `setBaseUrlFiles(url)`: URL base para archivos estáticos

## 🔒 Seguridad

### ⚠️ Advertencias importantes

1. **NO usar en producción sin autenticación**: La demo es educativa, agregar auth/CSRF
2. **Validar permisos**: Configurar `allowed_actions` según usuario
3. **Path traversal**: La librería valida rutas, pero revisa `base_dir`
4. **Límites de upload**: Configura `upload_max_filesize` y `post_max_size` en `php.ini`

### Ejemplo con autenticación

```php
session_start();

if (!isset($_SESSION['user_logged_in'])) {
    http_response_code(403);
    echo json_encode(['errors' => ['No autorizado']]);
    exit;
}

// Permisos por rol
$actions = $_SESSION['user_role'] === 'admin' 
    ? ['upload', 'download', 'delete', 'addfolder', 'rename', 'move', 'shared']
    : ['download']; // Solo lectura

$config = [
    'base_dir' => "/users/{$_SESSION['user_id']}/files/",
    'base_url' => "/files/{$_SESSION['user_id']}/",
    'allowed_actions' => $actions
];

$explorer = new \Richard\FilesExplorer\FilesExplorer($config);
$result = $explorer->execute($_POST, $_FILES);
// ... manejar respuesta
```

## 📁 Estructura

```
FilesExplorer/
├── src/FilesExplorer.php         # Librería core
├── public/                       # Assets (CSS/JS/iconos)
├── examples/                     # Demo
├── autoload.php                  # PSR-4 autoloader
└── README.md
```

## 📖 Ejemplos

Ver carpeta `examples/` para implementación completa.



## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:
1. Fork el proyecto
2. Crea un branch (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add: amazing feature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📜 Licencia

<a rel="license" href="http://creativecommons.org/licenses/by-sa/4.0/">
    <img alt="Licencia Creative Commons" style="border-width:0" src="https://i.creativecommons.org/l/by-sa/4.0/88x31.png" />
</a>

Este proyecto está bajo licencia <a rel="license" href="http://creativecommons.org/licenses/by-sa/4.0/">Creative Commons Reconocimiento-CompartirIgual 4.0 Internacional</a>.

## 👥 Autor

Richard Collao - [GitHub](https://github.com/RichardCollao)

## 🔗 Dependencias

- [Bootstrap 5](https://getbootstrap.com/) - Framework CSS
- [Bootstrap Icons](https://icons.getbootstrap.com/) - Iconografía
