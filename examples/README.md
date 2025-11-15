Files Explorer — demo (examples)

Este directorio contiene una demo mínima para probar la librería sin usar Composer.

Archivos importantes
- controller.php  -> wrapper que inicializa sesión, fija `base_dir` a `examples/files/`, devuelve token (`?get_token=1`) y delega POST a la clase namespaced `\Richard\FilesExplorer\FilesExplorer`.
- example.php     -> interfaz HTML + cliente JS que solicita token y usa `controller.php` como endpoint.
- files/          -> almacenamiento de demo (puedes crear archivos aquí para probar la UI).

Cómo ejecutar la demo localmente
1. Desde la raíz del proyecto, arranca el servidor PHP integrado:

```bash
php -S 127.0.0.1:8000 -t examples
```

2. Abre en el navegador:

http://127.0.0.1:8000/example.php

3. Opcional: obtener token manualmente (útil para pruebas con curl):

```bash
# guarda cookies para mantener la sesión
curl -c .cookiejar "http://127.0.0.1:8000/controller.php?get_token=1"
# el JSON devuelto contiene {"token":"..."}
```

4. Ejemplo de llamada POST (manteniendo cookies para que la sesión coincida):

```bash
TOKEN=<token_obtenido>
curl -b .cookiejar -X POST \
  -F "action=displaylist" \
  -F "token=$TOKEN" \
  -F "path_relative=" \
  http://127.0.0.1:8000/controller.php
```

Notas de configuración
- Por defecto el wrapper establece `$_SESSION['filesexplorer']['base_dir']` a `examples/files/`. Cambia esto en `examples/controller.php` si quieres apuntar a otra carpeta (por ejemplo `root_files/`).
- La demo usa el autoloader local `autoload.php` (sin Composer). Si quieres volver a la versión con Composer, restaura `composer.json` y usa `composer install`.

Advertencias de seguridad
- `examples/controller.php` es un wrapper de demostración: no está endurecido para producción.
- No expongas esta demo a Internet sin revisar controles de autenticación, límites, validación adicional, CSRF, permisos por usuario y rate-limiting.

Siguientes pasos recomendados
- Añadir un README más amplio en la raíz explicando la estrategia de empaquetado (PSR-4 vs Composer-less) y cómo publicar en GitHub.
- Añadir pruebas automáticas y un workflow de CI que ejecute linter y tests sobre `src/`.

