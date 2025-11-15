<?php
/**
 * Autoload simple PSR-4-like para usar la librería sin Composer.
 *
 * Uso: require_once __DIR__ . '/autoload.php';
 * Esto registra el namespace Richard\FilesExplorer\ apuntando a ./src/
 */

spl_autoload_register(function ($class) {
    // Only handle our namespace
    $prefix = 'Richard\\FilesExplorer\\';
    $baseDir = __DIR__ . '/src/';

    // Does the class use the namespace prefix?
    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) {
        return;
    }

    // Get the relative class name
    $relativeClass = substr($class, $len);

    // Replace namespace separators with directory separators, append .php
    $file = $baseDir . str_replace('\\\\', '/', $relativeClass) . '.php';

    if (file_exists($file)) {
        require_once $file;
    }
});

// Backwards compatibility: alias global FilesExplorer to namespaced class if available
if (class_exists('Richard\\FilesExplorer\\FilesExplorer') && !class_exists('FilesExplorer')) {
    class_alias('Richard\\FilesExplorer\\FilesExplorer', 'FilesExplorer');
}
