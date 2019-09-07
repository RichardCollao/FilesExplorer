# FilesExplorer
Explorador de archivos web open source
## Descripcion

FilesExplorer es un modulo web open source dedicado a gestionar archivos desde un navegador web con un estilo minimalista y de fácil implementación.

![Image description](https://github.com/RichardCollao/FilesExplorer/blob/master/docs/Captura%20de%20pantalla.png)

## Requerimientos
PHP 7.x >



## Implementación

```php
require_once(dirname(__FILE__) . '/class/FilesExplorerServer.php');
```
Antes de volcar la vista en el navegador es necesario salvar algunos parámetros en el servidor para que este pueda responder adecuadamente a las peticiones asíncronas que se realizaran desde el navegador.


Definir el directorio base, el cual no necesariamente tiene que ser parte del dominio publico, sin embargo si este se establece en un directorio privado se recomienda desactivar el botón clipboard ya que los enlaces generados no apuntaran al archivo por encontrarse fuera del dominio publico.
Es importante dar permisos de escritura al directorio raíz donde se alojaran los archivos que por defecto es  root_files 

```php
FilesExplorerServer::setBaseDirFiles(dirname(__FILE__) . '/root_files/');
```
Obtiene el token con el cual se asegura la sesion
```php
$token = FilesExplorerServer::generateToken();
```


Este método establece las acciones que serán aceptadas en el servidor, por ejemplo si este modulo es implementado en un sistema que maneja cuentas de usuarios, se podrían restringir las acciones en función del perfil de cada usuario.

```php
FilesExplorerServer::setAllowedActions(['upload', 'addfolder', 'rename', 'move', 'delete']);
```

El siguiente paso es incluir los archivos necesarios para que el modulo funcione correctamente.

La vista utiliza las clases del framework w3.css, pero no se limita solamente a esta librería, ya que es bastante fácil crear un nuevo layout con reglas de estilos personalizadas o basadas en otros framewrok CSS.

Incluye la hoja de estilos correspondientes al framework CSS w3.css
```html
<link type="text/css" rel="stylesheet" href="./public/css/w3.css"/>
```

Incluye la hoja de estilos nativa para la vista 
```html
<link type="text/css" rel="stylesheet" href="./public/css/FilesExplorer.css"/>
```

Incluye el escript que contiene la clase responsable de manejar el explorador de archivos.
```html
<script type="text/javascript" src="./public/js/FilesExplorerClient.js"></script>
```

Establece la caja que servira de contenedor, es importante asignar el atributo id el cual debera ser pasado a la clase javascript en su constructor
```html
<div id="files_container_display" style="width: 960px; margin: 15px auto; border:1px solid silver"></div>
```
Finalmente se inicializa la clase cuando el documento se ha cargado totalmente.
```javascript
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
```

## Licencia

 <a rel="license" href="http://creativecommons.org/licenses/by-sa/4.0/">
                <img alt="Licencia de Creative Commons" style="border-width:0" src="https://i.creativecommons.org/l/by-sa/4.0/88x31.png" />
</a>

<a rel="license" href="http://creativecommons.org/licenses/by-sa/4.0/">Creative Commons Reconocimiento-CompartirIgual 4.0 Internacional License</a>.

## Versionado
El proyecto utiliza SemVer para el versionado. Para todas las versiones disponibles, mira los tags en este repositorio.

## Dependencias
[W3.CSS Framework](https://www.w3schools.com/w3css/ "W3.CSS Framework")

[Font Awesome](https://fontawesome.com/icons?d=gallery&m=free "Font Awesome Search Icons:  Search icons...  Search! Search! Start Icons Docs Support Plans Blog")
