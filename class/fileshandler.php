<?php

class FilesHandler {

    private $_destination = '';
    private $_fileName = '';
    private $_maxSize = 1048576;
    private $_allowedExts = array();
    private $_errors = array();
    private $_mode = 0755;

    /**
     * http://php.net/manual/en/function.fileperms.php
     * Example #1 Display permissions as an octal value
     */
    private function _getFilePermissions($file, $long = 4) {
        return substr(sprintf('%o', fileperms($file)), -$long);
        // return substr(decoct(fileperms($file)), - $long);
    }

    public function setDestination($destination) {
        if (!file_exists($destination)) {
            if (!mkdir($destination, $this->_mode, true)) {
                $this->_errors[] = 'Se produjo un error al crear las carpetas';
            }
        }

        if ($this->_getFilePermissions($destination) < decoct($this->_mode)) {
            try {
                chmod($destination, $this->_mode);
            } catch (Exception $e) {
                $this->_errors[] = 'El directorio de destino no cuenta con los permisos requeridos.';
            }
        }
        $this->_destination = $destination;
    }

    public function setFileName($filename) {
        $this->_fileName = $filename;
    }

    public function setMaxSize($kb) {
        $this->_maxSize = $kb * 8 * 1024;
    }

    public function setAllowedExtensions(array $newExtensions) {
        $this->_allowedExts = $newExtensions;
    }

    public function getErrors() {
        return $this->_errors;
    }

    public function upload($file) {
        $ext = explode(".", $file['name']);
        $file['ext'] = end($ext);

        $this->validate($file);
        if (empty($this->_errors)) {
            if (!@move_uploaded_file($file['tmp_name'], $this->_destination . $this->_fileName)) {
                $this->_errors[] = 'Se produjo un error al subir el archivo "' . $file['name'] . '"';
            }
        }
    }

    private function validate($file) {
        // check file exist
        if (empty($file['name'])) {
            $this->_errors[] = 'Archivo no encontrado';
        } else {
            // check allowed extensions
            if (!empty($this->_allowedExts) && !in_array($file['ext'], $this->_allowedExts)) {
                $this->_errors[] = 'El archivo "' . $file['name'] . '", pertenece a un tipo de archivo no permitido';
            }
            // check file size
            if ($file['size'] > $this->_maxSize) {
                $this->_errors[] = 'El tamaño del archivo "' . $file['name'] . '", excede el limite de ' . $this->_maxSize . ' bytes';
            }
        }
    }

}

/**
// example
$FileManager = new FileManager;
$FileManager->setDestination($_SERVER['DOCUMENT_ROOT'] . '/images/profiles/');
$FileManager->setAllowedExtensions(array('jpeg'));
$FileManager->setFileName('user_profile.jpg');
$FileManager->upload($_FILES['profileimage']);
*/