<?php
require_once(dirname(__FILE__) . '/class/FilesExplorerServer.php');

// Establece los parametros que no necesariamente deben ser conocidos por el navegador por cuestiones de seguridad.
FilesExplorerServer::setBaseDirFiles(dirname(__FILE__) . '/root_files/');
FilesExplorerServer::setAllowedActions(['upload', 'addfolder', 'download', 'shared', 'rename', 'move', 'delete']);
// Define el token con el cual se asegura la sesion
$token = FilesExplorerServer::generateToken();
?>

<!DOCTYPE html>
<html lang="es">
    <head>
        <Title>..:: Example Files Explorer ::..</Title>
        <link type="text/css" rel="stylesheet" href="./public/css/w3.css"/>
        <link type="text/css" rel="stylesheet" href="./public/css/FilesExplorer.css"/>
        <script type="text/javascript" src="./public/js/FilesExplorerClient.js"></script>
    </head>
    <body>
        <div style="width: 960px; margin: 15px auto;">
            <h3>Explorador de archivos</h3>
        </div>

        <div id="files_container_display" style="width: 960px; margin: 15px auto; border:1px solid silver"></div>

        <div style="width: 500px; margin: 50px auto; text-align: center">
            <a rel="license" href="http://creativecommons.org/licenses/by-sa/4.0/">
                <img alt="Licencia de Creative Commons" style="border-width:0" src="https://i.creativecommons.org/l/by-sa/4.0/88x31.png" />
            </a>
            <br />
            <span xmlns:dct="http://purl.org/dc/terms/" href="http://purl.org/dc/dcmitype/Dataset" property="dct:title" rel="dct:type">FilesExplorerPhpJs</span> by <a xmlns:cc="http://creativecommons.org/ns#" href="http://www.richardcollao.cl/aboutme" property="cc:attributionName" rel="cc:attributionURL">Richard Collao</a> is licensed under a <br /><a rel="license" href="http://creativecommons.org/licenses/by-sa/4.0/">Creative Commons Reconocimiento-CompartirIgual 4.0 Internacional License</a>.
        </div>

        <script type="text/javascript">
            window.onload = function () {
                let filesExplorerClient = new FilesExplorerClient('files_container_display');
                // Envia el token creado en el servidor 
                filesExplorerClient.setToken('<?php echo $token; ?>');
                // Establece la url que apunta al controlador
                filesExplorerClient.setServerController('./class/FilesExplorerServer.php');
                // Establece la url que apunta a la base url que contiene los archivos
                // filesExplorerClient.setBaseUrlFiles('');
                // Permite posicionar el explorador sobre un nivel relativo a la ruta establecida como base
                filesExplorerClient.setPathRelative('');
                // Inicializa la clase
                filesExplorerClient.start();
            };
        </script>
    </body>
</html>