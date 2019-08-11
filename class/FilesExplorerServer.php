<?php

require('fileshandler.php');

class FilesExplorerServer {

    protected $_FILES = array();
    private $_out = ['errors' => [], 'path_relative' => ''];

    function __construct() {
        if (empty($_SESSION['filesexplorer']['base_dir'])) {
            throw new Exception('The base directory is not defined');
        }

        $post = $this->sanitizePost($_POST);

        if ($this->validateToken($post['token'])) {
            $this->resolveAction($post);
        } else {
            $out = $this->_out;
            $out['path_relative'] = (string) $post['path_relative'];
            $out['errors'][] = 'El token no corresponde';
            $this->out($out);
        }
    }

    private function validateToken($token) {
        if (empty($token)) {
            return false;
        }
        return $token == $this->getToken();
    }

    private function resolveAction($post) {
        $action = $post['action'];

        if (is_callable(array($this, $action))) {
            if ($this->isAllowedAction($action)) {
                $this->$action($post);
            } else {
                $out = $this->_out;
                $out['path_relative'] = (string) $post['path_relative'];
                $out['errors'][] = 'No tiene los permisos requeridos para realizar esta operacion';
                $this->out($out);
            }
        } else {
            throw new Exception('Action no callable');
        }
    }

    // Elimina caracteres no permitidos en nombres de archivos y previene nombres 
    // que modifican el nivel de directorio actual como "../"
    private function sanitizePost($post) {
        if (is_array($post)) {
            foreach ($post as $k => $v) {
                $post[$k] = $this->sanitizePost($v);
            }
            return $post;
        } else {

            $post = trim($post);
            $post = preg_replace(['#\.\./#', '#\./#', '#\\\\#'], '', $post);
            return $post;
        }
    }

    /**
     * Genera y devuelven Token
     *
     * El token generado es utilizado para asegurar un concordancia entre el navegador y el servidor
     * Su función es proporcionar una llave que permita a la aplicación hacer uso de los datos de configuración 
     * sin exponerlos en el navegador donde podrían ser modificados. 
     */
    public static function generateToken() {
        $_SESSION['filesexplorer']['token'] = bin2hex(openssl_random_pseudo_bytes(32));
        return $_SESSION['filesexplorer']['token'];
    }

    public static function getToken() {
        return $_SESSION['filesexplorer']['token'];
    }

    private function checkToken($token) {
        if (empty($token) || $_SESSION['filesexplorer']['token'] !== $token) {
            return false;
        }
    }

    public static function setAllowedActions(array $allowed_actions) {
        $_SESSION['filesexplorer']['allowed_actions'] = $allowed_actions;
    }

    private function isAllowedAction(string $action) {
        if ($action !== 'displaylist' && $action !== 'download') {
            if (!in_array($action, $_SESSION['filesexplorer']['allowed_actions'])) {
                return false;
            }
        }
        return true;
    }

    /**
     * Define la ruta base donde le es permitido al explorador listar los archivos
     * guarda la ruta en un arreglo de sesión
     */
    public static function setBaseDirFiles(string $base_dir) {
        $_SESSION['filesexplorer']['base_dir'] = $base_dir;
    }

    private function get_file_info($file) {
        $file_info = array();
        $pathinfo = pathinfo($file);
        $stat = stat($file);

        $file_info['realpath'] = realpath($file);
        $file_info['dirname'] = !empty($pathinfo['dirname']) ? $pathinfo['dirname'] : '';
        $file_info['basename'] = !empty($pathinfo['basename']) ? $pathinfo['basename'] : '';
        $file_info['filename'] = !empty($pathinfo['filename']) ? $pathinfo['filename'] : '';
        $file_info['extension'] = !empty($pathinfo['extension']) ? $pathinfo['extension'] : '';
        $file_info['mime'] = finfo_file(finfo_open(FILEINFO_MIME_TYPE), $file);
        $file_info['encoding'] = finfo_file(finfo_open(FILEINFO_MIME_ENCODING), $file);
        $file_info['size'] = $stat[7];
        $file_info['atime'] = date('Y-m-d H:i:s', $stat[8] / 1000); //$stat[8];
        $file_info['mtime'] = date('Y-m-d H:i:s', $stat[9] / 1000); //$stat[9];
        $file_info['permission'] = substr(sprintf('%o', fileperms($file)), -4);
        $file_info['fileowner'] = getenv('USERNAME');
        return $file_info;
    }

    // Elimina un archivo o directorio de manera recursiva
    private function rrmdir($src) {
        if (file_exists($src)) {
            if (!is_dir($src)) {
                unlink($src);
            } else {
                $dir = opendir($src);
                while (false !== ($file = readdir($dir))) {
                    if (($file != '.') && ($file != '..')) {
                        $full = $src . '/' . $file;
                        if (is_dir($full)) {
                            rrmdir($full);
                        } else {
                            unlink($full);
                        }
                    }
                }
                closedir($dir);
                rmdir($src);
            }
        }
    }

    private function reArrayFiles(&$file_post) {
        $file_ary = array();
        $file_count = count($file_post['name']);
        $file_keys = array_keys($file_post);
        for ($i = 0; $i < $file_count; $i++) {
            foreach ($file_keys as $key) {
                $file_ary[$i][$key] = $file_post[$key][$i];
            }
        }
        return $file_ary;
    }

    /**
     *  Devuelve un arreglo con los nombres de los archivos existentes en el directorio definido por $dir
     *  recibe un segundo parámetro para filtrar los archivos según su extensión ejemplo: jpg, gif, exe, etc.
     */
    private function getFilesExtension($dir, $extensions_search = array()) {
        $files = array();
        if (is_dir($dir)) {
            $handle = opendir($dir);
            while ($file = readdir($handle)) {
                if ($file != "." && $file != "..") {
                    $start = strrpos($file, ".") + 1;
                    $ext = substr($file, $start);

                    if (!empty($extensions_search)) {
                        // Compara la extencion
                        if (in_array($ext, $extensions_search)) {
                            $files[] = $file;
                        }
                    } else {
                        $files[] = $file;
                    }
                }
            }
            closedir($handle);
        }

        sort($files);
        return $files;
    }

    private function displaylist(array $data) {
        $out = $this->_out;
        $path_relative = (string) $data['path_relative'];
        // Genera la ruta completa donde se buscaran los archivos
        $dir = empty($path_relative) ? $_SESSION['filesexplorer']['base_dir'] : $_SESSION['filesexplorer']['base_dir'] . $path_relative . '/';

        // Obtiene el listado de archivos de acuerdo a un arreglo con las extensiones a buscar
        $files = $this->getFilesExtension($dir);
        $files_info = array();
        foreach ($files as $file) {
            $fileInfo = $this->get_file_info($dir . $file);
            $files_info[] = array(
                'basename' => $fileInfo['basename'],
                'encoding' => $fileInfo['encoding'],
                'mime' => $fileInfo['mime'],
                'permission' => $fileInfo['permission'],
                'size' => $fileInfo['size']
            );
        }

        $out['path_relative'] = $path_relative;
        $out['files'] = $files_info;
        $this->out($out);
    }

    private function download(array $data) {
        $path_relative = (string) $data['path_relative'];
        $file = $data['file'];
        // Genera la ruta completa donde se buscaran los archivos
        $dir = empty($path_relative) ? $_SESSION['filesexplorer']['base_dir'] : $_SESSION['filesexplorer']['base_dir'] . $path_relative . '/';

        header("Content-Description: File Transfer");
        header("Content-Type: application/octet-stream");
        header("Content-Disposition: attachment; filename=" . basename($file));

        readfile($dir . $file);
    }

    private function upload(array $data) {
        $out = $this->_out;
        $path_relative = (string) $data['path_relative'];

        // Genera la ruta completa donde se buscaran los archivos
        $dir = empty($path_relative) ? $_SESSION['filesexplorer']['base_dir'] : $_SESSION['filesexplorer']['base_dir'] . $path_relative . '/';

        // Ordena de mejor manera el arreglo de archivos
        $this->_FILES = !empty($_FILES['files']) ? $this->reArrayFiles($_FILES['files']) : array();
        if (empty($this->_FILES)) {
            return;
        }

        foreach ($this->_FILES as $file) {
            $FilesHandler = new FilesHandler();
            // $FilesHandler->setAllowedExtensions(['pdf']);
            $FilesHandler->setMaxSize(5000);
            $FilesHandler->setDestination($dir);
            $FilesHandler->setFileName($file['name']);
            $FilesHandler->upload($file);
        }

        $out['errors'] = $FilesHandler->getErrors();
        $out['path_relative'] = $path_relative;
        $this->out($out);
    }

    private function delete(array $data) {
        $out = $this->_out;
        $path_relative = (string) $data['path_relative'];
        $file = $data['file'];
        $dir = empty($path_relative) ? $_SESSION['filesexplorer']['base_dir'] : $_SESSION['filesexplorer']['base_dir'] . $path_relative . '/';
        $file_delete = $dir . $file;

        // unlink($file_delete);
        // Borra un directorio por completo
        $this->rrmdir($file_delete);

        $out['path_relative'] = $path_relative;
        $this->out($out);
    }

    private function addfolder(array $data) {
        $out = $this->_out;
        $path_relative = (string) $data['path_relative'];
        $name = $data['name'];
        $dir = empty($path_relative) ? $_SESSION['filesexplorer']['base_dir'] : $_SESSION['filesexplorer']['base_dir'] . $path_relative . '/';
        $folder = $dir . $name;


        if (!preg_match('/^[0-9a-z\.\-\_\s]+$/i', $name)) {
            $out['errors'][] = 'Debe especificar un nombre de directorio valido';
        } else if (file_exists($folder)) {
            $out['errors'][] = 'El directorio ya existe';
        } else if (!@mkdir($folder, 0755, true)) {
            $out['errors'][] = 'El directorio destino no tiene permisos de escritura';
        }

        $out['path_relative'] = $path_relative;
        $this->out($out);
    }

    private function rename(array $data) {
        $out = $this->_out;
        $path_relative = $data['path_relative'];
        $oldname = $data['oldname'];
        $newname = $data['newname'];
        $dir = $_SESSION['filesexplorer']['base_dir'] . $path_relative ;

        if (file_exists($dir . $oldname)) {
            try {
                rename($dir . $oldname, $dir . $newname);
            } catch (Exception $ex) {
                $out['errors'][] = 'Es posible que no cuente con los privilegios necesarios para realizar esta operacion';
            }
        } else {
            $out['errors'][] = 'No existe el fichero o directorio';
        }

        $out['path_relative'] = $path_relative;
        $this->out($out);
    }

    private function move(array $data) {
        $out = $this->_out;
        $path_relative = $data['path_relative'];

        $dir = $_SESSION['filesexplorer']['base_dir'];

        $origin = $dir . $data['origin'];
        $destination = $dir . $data['destination'];

        if (file_exists($origin)) {
            try {
                rename($origin, $destination);
            } catch (Exception $ex) {
                $out['errors'][] = 'Es posible que no cuente con los privilegios necesarios para realizar esta operacion';
            }
        } else {
            $out['errors'][] = 'No existe el fichero o directorio';
        }

        $out['path_relative'] = $path_relative;
        $this->out($out);
    }

    private function out($out) {
        header('Content-Type: application/json');
        echo json_encode($out);
    }

}

if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

if (!empty($_POST)) {
    new FilesExplorerServer();
}