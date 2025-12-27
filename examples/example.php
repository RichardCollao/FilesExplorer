<!DOCTYPE html>
<html lang="es">

<head>
    <title>..:: Files Explorer - Demo ::..</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <!-- Bootstrap 5 CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.13.1/font/bootstrap-icons.min.css">
    
    <!-- FilesExplorer estilos esenciales -->
    <link type="text/css" rel="stylesheet" href="../public/FilesExplorer/css/FilesExplorer.css" />

    <!-- Bootstrap 5 JS Bundle (incluye Popper) -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>

    <!-- FilesExplorer -->
    <script type="text/javascript" src="../public/FilesExplorer/js/FilesExplorer.js"></script>
</head>

<body class="bg-light">
    <div class="container py-4">
        <div id="files_container_display" style="max-width: 960px; margin: 0 auto;"></div>
    </div>

    <script type="text/javascript">
        window.onload = function() {
            let filesExplorer = new FilesExplorer('files_container_display');
            filesExplorer.setServerController('controller.php');
            filesExplorer.setPathRelative('');
            filesExplorer.setBaseUrlFiles('/uploads/');// Ruta base para clipboard y vista previa
            filesExplorer.maxFileSizeMb(5);
            filesExplorer.start();
        };
    </script>
</body>

</html>