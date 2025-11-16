/* global fetch, eval, browser, top */

// Template HTML embebido (antes estaba en public/views/default.layout.html)
const FILES_EXPLORER_TEMPLATE = `<!-- files_explorer_container -->
<div data-id="files_explorer_container" class="unselect-text">
    <div class="card border-0 shadow-sm" style="max-height: 600px; overflow-y: auto;">
        <!-- Modal Bootstrap 5 -->
        <div class="modal fade" data-id="files-modal" data-modal-container tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-body p-0" data-id="files-modal-content">
                        <!-- dynamic content -->
                    </div>
                </div>
            </div>
        </div>
        <!-- /modal -->

        <!-- Toolbar -->
        <nav data-id="files_bar_buttons" class="p-2 bg-light border-bottom d-flex justify-content-between"
            aria-label="Files toolbar">
            <div class="d-flex">
                <div class="circle-loader d-none" data-id="destination"></div>

                <button type="button" class="btn btn-sm btn-light" data-id="btnUpLevelDirectory"
                    data-bs-toggle="tooltip" data-bs-placement="bottom" data-bs-title="Escalar directorio">
                    <i class="bi bi-arrow-return-left"></i>
                </button>
                <button type="button" class="btn btn-sm btn-light" data-id="btnAddFolder" data-bs-toggle="tooltip"
                    data-bs-placement="bottom" data-bs-title="Nueva carpeta">
                    <i class="bi bi-folder-plus"></i>
                </button>
                <button type="button" class="btn btn-sm btn-light" data-id="btnUploadFile" data-bs-toggle="tooltip"
                    data-bs-placement="bottom" data-bs-title="Subir archivo">
                    <i class="bi bi-upload"></i>
                </button>
                <button type="button" class="btn btn-sm btn-light" data-id="btnPaste"
                    data-bs-toggle="tooltip" data-bs-placement="bottom" data-bs-title="Pegar">
                    <i class="bi bi-copy"></i>
                </button>
            </div>

            <div class="d-flex">
                <button type="button" class="btn btn-sm btn-light" data-id="btnViewList"
                    data-bs-toggle="tooltip" data-bs-placement="bottom" data-bs-title="Vista de lista">
                    <i class="bi bi-list-task"></i>
                </button>
                <button type="button" class="btn btn-sm btn-light" data-id="btnViewGrid" data-bs-toggle="tooltip"
                    data-bs-placement="bottom" data-bs-title="Vista de cuadrícula">
                    <i class="bi bi-grid-3x3-gap"></i>
                </button>
            </div>
        </nav>
        <!-- /toolbar -->

        <!-- Breadcrumb -->
        <nav data-id="files_breadcrumb_content" aria-label="breadcrumb" class="px-3 pt-3">
            <ol class="breadcrumb mb-0">
                <li class="breadcrumb-item">
                    <a href="#" class="text-decoration-none">
                        <i class="bi bi-house-door" title="home" style="font-size: 20px;"></i>
                    </a>
                </li>
            </ol>
        </nav>
        <!-- /breadcrumb -->

        <!-- Files table (List view) -->
        <div data-id="files_display_content" data-view="list" class="p-3">
            <table class="table table-hover table-sm table-bordered">
                <thead class="table-light">
                    <tr>
                        <th scope="col" style="min-width: 80px; max-width: 80px; text-align: center;">&nbsp;</th>
                        <th scope="col" style="width: 80%;">Filename</th>
                        <th scope="col" style="min-width: 100px; max-width: 100px; text-align: right;">Size</th>
                        <th scope="col" style="min-width: 180px; max-width: 180px; text-align: center;">Operations</th>
                    </tr>
                    <tr style="display: none;">
                        <th scope="col" colspan="4" class="text-center text-muted">No se encontraron archivos</th>
                    </tr>
                </thead>
                <tbody>
                    <!-- dynamic content -->
                </tbody>
            </table>
        </div>
        <!-- /files_display_content -->

        <!-- Files grid (Grid view) -->
        <div data-id="files_display_grid" data-view="grid" class="p-3 d-none">
            <div class="row g-3" data-grid-container>
                <!-- dynamic content -->
            </div>
            <div class="text-center text-muted py-5 d-none" data-grid-empty>
                No se encontraron archivos
            </div>
        </div>
        <!-- /files_display_grid -->
    </div>
</div>
<!-- /files_explorer_container -->

<template id="template_row">
    <tr>
        <td class="text-center">
            <i class="icon-file-type"></i>
        </td>
        <td class="align-middle"></td>
        <td class="text-end align-middle"></td>

        <td class="text-center">
            <button type="button" class="btn btn-light py-0 px-1 border-0" data-action="download" data-bs-toggle="tooltip"
                data-bs-placement="bottom" data-bs-title="Descargar">
                <i class="bi bi-download"></i>
            </button>
            <button type="button" class="btn btn-light py-0 px-1 border-0" data-action="move" data-bs-toggle="tooltip"
                data-bs-placement="bottom" data-bs-title="Mover">
                <i class="bi bi-scissors"></i>
            </button>
            <button type="button" class="btn btn-light py-0 px-1 border-0" data-action="shared" data-bs-toggle="tooltip"
                data-bs-placement="bottom" data-bs-title="Copiar enlace">
                <i class="bi bi-link-45deg"></i>
            </button>
            <button type="button" class="btn btn-light py-0 px-1 border-0" data-action="edit" data-bs-toggle="tooltip"
                data-bs-placement="bottom" data-bs-title="Renombrar">
                <i class="bi bi-pencil-square"></i>
            </button>
            <button type="button" class="btn btn-light py-0 px-1 border-0" data-action="delete" data-bs-toggle="tooltip"
                data-bs-placement="bottom" data-bs-title="Borrar">
                <i class="bi bi-trash"></i>
            </button>
        </td>
    </tr>
</template>

<template id="template_grid_item">
    <div class="col-6 col-sm-4 col-md-3 col-lg-2">
        <div class="card h-100 border">
            <div class="card-body p-2 text-center">
                <div class="mb-2" data-grid-icon-container>
                    <i class="icon-file-type-grid"></i>
                </div>
                <div class="small text-truncate mb-2" data-grid-filename style="max-width: 100%;" title="">
                    <!-- filename -->
                </div>
                <div class="d-flex justify-content-between align-items-center px-0">
                    <div class="text-muted" style="font-size: 0.75rem;" data-grid-size>
                        <!-- size -->
                    </div>
                    <div class="dropdown">
                        <button class="btn btn-sm btn-light p-0" type="button" data-bs-toggle="dropdown"
                            data-bs-boundary="viewport" aria-expanded="false">
                            <i class="bi bi-three-dots-vertical"></i>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end">
                            <li>
                                <button class="dropdown-item" type="button" data-action="download">
                                    <i class="bi bi-download me-2""></i>Descargar
                                </button>
                            </li>
                            <li>
                                <button class="dropdown-item" type="button" data-action="move">
                                    <i class="bi bi-scissors me-2"></i>Mover
                                </button>
                            </li>
                            <li>
                                <button class="dropdown-item" type="button" data-action="shared">
                                    <i class="bi bi-link-45deg me-2""></i>Copiar enlace
                                </button>
                            </li>
                            <li>
                                <button class="dropdown-item" type="button" data-action="edit">
                                    <i class="bi bi-pencil-square me-2""></i>Renombrar
                                </button>
                            </li>
                            <li>
                                <button class="dropdown-item" type="button" data-action="delete">
                                    <i class="bi bi-trash me-2""></i>Eliminar
                                </button>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<template id="template_alert">
    <div class="modal-header" data-alert-header>
        <div class="d-flex align-items-center">
            <i data-alert-icon class="me-3" style="font-size: 28px;"></i>
            <h5 class="modal-title mb-0" data-alert-title>&nbsp;</h5>
        </div>
        <button type="button" class="btn-close" data-modal-close aria-label="Cerrar"></button>
    </div>
    <div class="modal-body" data-alert-content>
        <!-- dynamic content -->
    </div>
</template>

<template id="template_form_add_folder">
    <div class="modal-header">
        <h5 class="modal-title">Crear carpeta</h5>
        <button type="button" class="btn-close" data-modal-close aria-label="Cerrar"></button>
    </div>
    <div class="modal-body">
        <form data-id="form_add_folder">
            <div class="mb-3">
                <label for="fe_folder_name" class="form-label">Nombre</label>
                <input id="fe_folder_name" type="text" name="folder" class="form-control"
                    placeholder="Nombre de la carpeta" autocomplete="off" required>
            </div>
            <div class="d-flex justify-content-end gap-2">
                <button type="button" class="btn btn-secondary" data-modal-close>Cancelar</button>
                <button type="submit" class="btn btn-primary">Crear</button>
            </div>
        </form>
    </div>
</template>

<template id="template_form_upload">
    <div class="modal-header">
        <h5 class="modal-title">Subir archivo</h5>
        <button type="button" class="btn-close" data-modal-close aria-label="Cerrar"></button>
    </div>
    <div class="modal-body">
        <form data-id="form_upload_files" enctype="multipart/form-data" accept-charset="UTF-8">
            <div class="mb-3">
                <label for="fe_upload_files" class="form-label">Archivos</label>
                <input id="fe_upload_files" name="files[]" class="form-control" multiple type="file" />
                <div class="form-text" data-out>Ningún archivo seleccionado</div>
            </div>
            <div class="d-flex justify-content-end gap-2">
                <button type="button" class="btn btn-secondary" data-modal-close>Cancelar</button>
                <button type="submit" class="btn btn-primary">Subir</button>
            </div>
        </form>
    </div>
</template>

<template id="template_form_rename_file">
    <div class="modal-header">
        <h5 class="modal-title">Renombrar</h5>
        <button type="button" class="btn-close" data-modal-close aria-label="Cerrar"></button>
    </div>
    <div class="modal-body">
        <form data-id="form_rename_file">
            <div class="mb-3">
                <label for="fe_newname" class="form-label">Nuevo nombre</label>
                <input id="fe_newname" type="text" name="newname" class="form-control"
                    placeholder="Ingrese el nuevo nombre" autocomplete="off" required>
            </div>
            <div class="d-flex justify-content-end gap-2">
                <button type="button" class="btn btn-secondary" data-modal-close>Cancelar</button>
                <button type="button" class="btn btn-primary" data-action="send">Aceptar</button>
            </div>
        </form>
    </div>
</template>

<template id="template_confirm_delete">
    <div class="modal-header">
        <h5 class="modal-title">Confirmar Eliminación</h5>
        <button type="button" class="btn-close" data-modal-close aria-label="Cerrar"></button>
    </div>
    <div class="modal-body">
        <p class="mb-3">
            ¿Está seguro que desea eliminar <strong data-confirm-filename></strong>?
        </p>
        <p class="text-muted small mb-0">
            Esta acción no se puede deshacer.
        </p>
    </div>
    <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-confirm-cancel>Cancelar</button>
        <button type="button" class="btn btn-primary" data-confirm-delete>Eliminar</button>
    </div>
</template>

<template id="template_clipboard">
    <div class="modal-header">
        <h5 class="modal-title" data-clipboard-title>Enlace Copiado</h5>
        <button type="button" class="btn-close" data-modal-close aria-label="Cerrar"></button>
    </div>
    <div class="modal-body">
        <p class="mb-3" data-clipboard-message></p>
        <div class="alert alert-secondary mb-0">
            <div data-clipboard-uri class="text-break select-text"></div>
        </div>
    </div>
</template></template>`;

// --- SRP Helpers -----------------------------------------------------------
// Manages modal DOM interactions (open/close/set content/asset paths)
class ModalManager {
    constructor(rootElement, scriptPath) {
        this.root = rootElement;
        this.scriptPath = scriptPath;
        // Bind keyboard handler for ESC close
        this._onKeyDown = this._onKeyDown.bind(this);
        // Store modal instance to avoid creating multiple instances
        this._bootstrapModal = null;
    }

    setContent(templateId) {
        const filesModal = this.root.querySelector('[data-id="files-modal"]');
        const template = this.root.querySelector('#' + templateId);
        if (!template) {
            console.error('ModalManager: template no encontrado:', templateId);
            return;
        }
        const filesModalBody = this.root.querySelector('[data-id="files-modal-content"]');
        filesModalBody.innerHTML = '';
        const clone = document.importNode(template.content, true);
        filesModalBody.appendChild(clone);
        // Fix relative asset paths inside the modal
        this.convertRelativePaths(filesModal);

        // Re-bind close handlers for dynamically injected controls
        const closeLinks = filesModal.querySelectorAll('[data-modal-close]');
        for (const link of closeLinks) {
            link.onclick = () => {
                this.hide();
            };
        }
    }

    show() {
        const filesModal = this.root.querySelector('[data-id="files-modal"]');
        // Bootstrap 5 Modal
        if (typeof bootstrap === 'undefined') {
            // Fallback sin Bootstrap
            filesModal.style.display = 'block';
            filesModal.classList.add('show');
            document.addEventListener('keydown', this._onKeyDown);
        } else {
            // Reutilizar la instancia existente o crear una nueva
            if (!this._bootstrapModal) {
                this._bootstrapModal = new bootstrap.Modal(filesModal);
            }
            this._bootstrapModal.show();
        }
    }

    hide() {
        const filesModal = this.root.querySelector('[data-id="files-modal"]');
        // Bootstrap 5 Modal
        if (typeof bootstrap === 'undefined') {
            // Fallback sin Bootstrap
            filesModal.style.display = 'none';
            filesModal.classList.remove('show');
            document.removeEventListener('keydown', this._onKeyDown);
        } else {
            // Usar la instancia almacenada
            if (this._bootstrapModal) {
                this._bootstrapModal.hide();
            } else {
                // Fallback: intentar obtener instancia existente
                const modal = bootstrap.Modal.getInstance(filesModal);
                if (modal) modal.hide();
            }
        }
    }

    convertRelativePaths(element) {
        Array.from(element.querySelectorAll('img')).forEach(img => {
            const src = img.dataset.src;
            if (src) {
                img.src = src.replace(/\.\//gi, this.scriptPath);
            }
        });
    }

    _onKeyDown(e) {
        if (e.key === 'Escape' || e.key === 'Esc') {
            this.hide();
        }
    }
}

// Provides a neutral, colorless alert with appropriate dark icons
class AlertService {
    constructor(modalManager) {
        this.modal = modalManager;
    }

    show(type, title, content) {
        this.modal.setContent('template_alert');
        const filesModalBody = this.modal.root.querySelector('[data-id="files-modal-content"]');

        // Header sin color de fondo
        let headerClass = 'modal-header';
        let iconClass;

        switch (type) {
            case 'danger':
            case 'error':
                iconClass = 'bi bi-exclamation-triangle text-danger';
                break;
            case 'warning':
                iconClass = 'bi bi-exclamation-triangle text-warning';
                break;
            case 'success':
                iconClass = 'bi bi-check-circle text-success';
                break;
            case 'info':
            default:
                iconClass = 'bi bi-info-circle text-info';
        }

        filesModalBody.querySelector('[data-alert-header]').className = headerClass;
        const iconElement = filesModalBody.querySelector('[data-alert-icon]');
        iconElement.className = iconClass + ' me-3';
        iconElement.style.fontSize = '28px';
        filesModalBody.querySelector('[data-alert-title]').textContent = title;
        filesModalBody.querySelector('[data-alert-content]').innerHTML = content;
    }
}

class FilesExplorer {

    constructor(idElement) {
        // Formulario utilizado en alguna operaciones como cortar y 
        this.tempFormData = new FormData();
        this.idElement = idElement;
        this.element = document.querySelector('#' + this.idElement);

        // Inject the template HTML into the container
        if (this.element) {
            this.element.innerHTML = FILES_EXPLORER_TEMPLATE;
        }

        // Obtiene la url real del script FilesExplorer.js
        const url = document.querySelector('script[src$="FilesExplorer.js"]').src;
        const name = url.split('/').pop();
        const dir = url.replace(name, '');
        const parser = new URL(dir + '../../');

        // Establece la ruta base correspondiente al modulo
        this.scriptPath = parser.origin + parser.pathname;
        // Establece la url por defecto del directorio publico de archivos
        this.baseUrlFiles = this.scriptPath + 'root_files/';
        // Establece la ruta por defecto del layout
        this.layout = 'public/views/default.layout.html';

        // SRP helpers
        this.modal = new ModalManager(this.element, this.scriptPath);
        this.alerts = new AlertService(this.modal);

        // Vista actual (list o grid)
        this.currentView = 'list';
        // Map to store popper instances and original parents for moved dropdown menus
        this._fePopperMap = new WeakMap();
        // Estado cuando se ha iniciado una operación "mover" y queda pendiente el pegado
        this.isMovePending = false;
        // Tamaño máximo de archivo en MB (por defecto 5MB)
        this.maxFileSize = 5;
    }

    // Cancela cualquier operación de mover pendiente y oculta el botón Pegar
    cancelMove() {
        this.isMovePending = false;
        this.moveSourceFile = null;
        this.moveSourcePath = null;

        const btnPaste = this.element.querySelector('[data-id="btnPaste"]');
        if (btnPaste) {
            btnPaste.onclick = null;
            btnPaste.disabled = true;
            btnPaste.style.display = 'none';
        }
    }

    // Envuelve una acción para cancelar la operación de mover (si existe) antes de ejecutar
    _wrapAction(actionFn) {
        return (...args) => {
            if (this.isMovePending) {
                this.cancelMove();
            }
            return actionFn(...args);
        };
    }

    start() {
        // Convierte rutas relativas en absolutas
        this.convertRelativeImagePathToAbsolute(this.element);

        // Inicializa tooltips de Bootstrap 5
        this.initTooltips();

        // Asigna el evento click a todos los botones closet de los elementos .modal-container
        Array.from(this.element.querySelectorAll('[data-modal-close]')).forEach(link => {
            link.addEventListener('click', function (event) {
                this.closest('[data-modal-container]').style.display = 'none';
            });
        });

        // Botones de vista
        this.element.querySelector('[data-id="btnViewList"]').onclick = () => this.switchView('list');
        this.element.querySelector('[data-id="btnViewGrid"]').onclick = () => this.switchView('grid');

        this.element.querySelector('[data-id="btnUpLevelDirectory"]').onclick = this.upLevelDirectory.bind(this);

        this.element.querySelector('[data-id="btnUploadFile"]').onclick = function () {
            this.setModalContent('template_form_upload');
            this.showModal();

            // Actualizar el mensaje de tamaño máximo
            const sizeHint = this.element.querySelector('[data-id="files-modal-content"] [data-max-size-hint]');
            if (sizeHint) {
                sizeHint.textContent = `Tamaño máximo por archivo: ${this.maxFileSize}MB`;
            }

            this.element.querySelector('[data-id="form_upload_files"]').onsubmit = this.uploadFiles.bind(this);

            this.element.querySelector('[data-id="form_upload_files"] input[name="files[]"]').onchange = function (event) {
                const input = event.target;

                const numFiles = input.files.length ? input.files.length : 1;
                const nameFile = input.value.replace(/\\/g, '/').replace(/.*\//, '');
                const textLabel = numFiles > 1 ? numFiles + ' files selected' : nameFile;
                this.element.querySelector('[data-id="form_upload_files"] [data-out]').innerHTML = textLabel;
            }.bind(this);
        }.bind(this);

        this.element.querySelector('[data-id="btnAddFolder"]').onclick = function () {
            this.setModalContent('template_form_add_folder');
            this.showModal();
            this.element.querySelector('[data-id="form_add_folder"]').onsubmit = this.addFolder.bind(this);
        }.bind(this);

        let btnPaste = this.element.querySelector('[data-id="btnPaste"]');
        // Por defecto el botón Pegar debe estar inactivo y oculto.
        // btnPaste.disabled = true;
        btnPaste.style.display = 'none';

        // Actualiza por primera vez para mostrar listar los archivos.
        this.refresh();
    }

    // Carga script y ejecuta el callback
    loadScript(url, callback) {
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.async = true;
        script.src = url;
        document.head.appendChild(script);
        script.onreadystatechange = callback;
        script.onload = callback;
    }

    setServerController(pathController) {
        this.serverController = pathController;
    }

    setLayout(layout) {
        this.layout = layout;
    }

    setBaseUrlFiles(baseUrlFiles) {
        this.baseUrlFiles = baseUrlFiles;
    }

    maxFileSizeMb(sizeMb) {
        if (typeof sizeMb !== 'number' || sizeMb <= 0) {
            console.error('FilesExplorer.maxFileSizeMb: el tamaño debe ser un número positivo');
            return;
        }
        this.maxFileSize = sizeMb;
    }

    setPathRelative(pathRelative = '') {
        // Purga los modificadores de rutas ../ ./ \ 
        pathRelative = pathRelative.replaceAll('../', '').replaceAll('./', '').replaceAll('\\', '');
        // Guarda la ruta relativa como un arreglo, purgando elementos vacios
        this.pathRelativeArray = pathRelative.split('/').filter(Boolean);
    }

    getPathRelative() {
        if (this.pathRelativeArray.length > 0) {
            return this.pathRelativeArray.join('/') + '/';
        } else {
            return '';
        }
    }

    loadController(callback, formData = {}) {
        this.showLoading();

        const headers = new Headers();
        const request = new Request(this.serverController, {
            method: 'POST',
            headers: headers,
            mode: 'same-origin', // https://developer.mozilla.org/en-US/docs/Web/API/Request/mode
            credentials: 'include',
            body: formData,
            cache: 'default'
        });
        fetch(request).then(function (response) {
            if (response.ok) {
                // Llama a la funcion callback y pasa el resultado como argumento
                response.text().then(
                    function (response) {
                        try {
                            // Parsea los datos recibidos en un objeto json y llama la funcion callback
                            const json = JSON.parse(response);
                            callback(json);
                        } catch (e) {
                            console.log('error: ' + e);
                        }
                        this.hideLoading();
                    }.bind(this));
            } else {
                console.log('error' + response.status);
                this.hideLoading();
            }
        }.bind(this)).catch(function (err) {
            console.log('error', err);
            this.hideLoading();
        });
    }

    showLoading() {
        this.element.querySelector('.circle-loader').setAttribute('style', 'visibility: visible');
    }

    hideLoading() {
        this.element.querySelector('.circle-loader').setAttribute('style', 'visibility: hidden');
    }

    initTooltips() {
        // Inicializa todos los tooltips de Bootstrap 5 con delay
        if (typeof bootstrap !== 'undefined') {
            const tooltipTriggerList = Array.from(this.element.querySelectorAll('[data-bs-toggle="tooltip"]'));
            tooltipTriggerList.forEach(tooltipTriggerEl => {
                // Prevent duplicate tooltip instances which can cause popper elements
                // to remain visible after DOM updates or repeated init calls.
                try {
                    const existing = bootstrap.Tooltip.getInstance(tooltipTriggerEl);
                    if (existing) {
                        existing.dispose();
                    }
                } catch (err) {
                    console.debug('FilesExplorer: Failed to dispose existing tooltip', err);
                }

                const tooltip = new bootstrap.Tooltip(tooltipTriggerEl, {
                    delay: { show: 1000, hide: 100 },
                    trigger: 'hover',
                    placement: 'bottom'
                });

                // Ocultar tooltip al hacer click (asegura que un click no deje el tooltip pegado)
                tooltipTriggerEl.addEventListener('click', () => {
                    try { tooltip.hide(); } catch (e) { /* ignore */ }
                });
            });
        }
    }

    isEmptyArray(array) {
        return !(array != null && array.length > 0);
    }

    switchView(view) {
        this.currentView = view;

        const listView = this.element.querySelector('[data-id="files_display_content"]');
        const gridView = this.element.querySelector('[data-id="files_display_grid"]');

        if (view === 'list') {
            listView.classList.remove('d-none');
            gridView.classList.add('d-none');
        } else {
            listView.classList.add('d-none');
            gridView.classList.remove('d-none');
        }

        // Refrescar la vista actual
        this.refresh();
    }

    refresh() {
        const path_relative = this.getPathRelative();

        const formData = new FormData();
        formData.append('action', 'displaylist');
        formData.append('path_relative', path_relative);

        this.loadController(
            function (json) {
                // Actualiza la lista de archivos según la vista actual
                if (this.currentView === 'list') {
                    this.refreshDisplayList(json);
                } else {
                    this.refreshDisplayGrid(json);
                }
                // Actualiza la barra de navegación
                this.refreshBreadcurmb();

            }.bind(this)
            , formData);
    }

    // reemplaza la url relativa por absoluta
    convertRelativeImagePathToAbsolute(element) {
        // Delegado al administrador de modales (mantiene compatibilidad de API)
        this.modal.convertRelativePaths(element);
    }

    uploadFiles(e) {
        e.preventDefault();

        // Validar tamaño de archivos antes de enviar
        const fileInput = this.element.querySelector('[data-id="form_upload_files"] input[name="files[]"]');
        const maxSizeBytes = this.maxFileSize * 1024 * 1024; // Convertir MB a bytes
        const errors = [];

        if (fileInput.files.length > 0) {
            for (const file of fileInput.files) {
                if (file.size > maxSizeBytes) {
                    const sizeMB = (file.size / 1024 / 1024).toFixed(2);
                    errors.push(`El archivo "${file.name}" (${sizeMB}MB) excede el tamaño máximo permitido de ${this.maxFileSize}MB`);
                }
            }
        }

        // Si hay errores de validación, mostrarlos y no enviar
        if (errors.length > 0) {
            let content = '<p>No se pueden subir los siguientes archivos:</p>';
            content += this.helperUl(errors);
            this.setAlert('warning', 'Archivos Demasiado Grandes', content);
            this.showModal();
            return;
        }

        // obtiene los datos desde el formulario
        const path_relative = this.getPathRelative();
        const formData = new FormData(this.element.querySelector('[data-id="form_upload_files"]'));
        formData.append('action', 'upload');
        formData.append('path_relative', path_relative);

        // Oculta el modal
        this.hideModal();

        this.loadController(
            function (response) {
                if (response.errors.length > 0) {
                    let content = '<p>La operación solicitada no se pudo realizar debido a los siguientes errores:</p>';
                    content += this.helperUl(response.errors);
                    this.setAlert('warning', 'Error al Subir Archivos', content);
                    this.showModal();
                } else {
                    this.refresh();
                    this.hideModal();
                }
            }.bind(this)
            , formData);
    }

    upLevelDirectory() {
        this.pathRelativeArray.pop();
        this.refresh();
    }

    addFolder(e) {
        e.preventDefault();

        // Oculta el modal
        this.hideModal();
        const path_relative = this.getPathRelative();
        const formData = new FormData(this.element.querySelector('[data-id="form_add_folder"]'));
        formData.append('action', 'addfolder');
        formData.append('path_relative', path_relative);

        this.loadController(
            function (response) {
                if (response.errors.length > 0) {
                    let content = '<p>La operación solicitada no se pudo realizar debido a los siguientes errores:</p>';
                    content += this.helperUl(response.errors);
                    this.setAlert('warning', 'Error al Crear Carpeta', content);
                    this.showModal();
                } else {
                    this.refresh();
                    this.hideModal();
                }
            }.bind(this)
            , formData);
    }

    goDirectory(folder = '') {
        this.pathRelativeArray.push(folder);
        this.refresh();
    }

    goHome(file) {
        this.pathRelativeArray = [];
        this.refresh();
    }

    btnBreadCrumb(level) {
        this.pathRelativeArray = this.pathRelativeArray.slice(0, level + 1);
        this.refresh();
    }

    downloadFileOld(file) {
        let path_relative = this.getPathRelative();
        if (path_relative.length > 0) {
            path_relative += '/';
        }
        const downloadUrl = path_relative + file;
        const a = document.createElement('a');

        // Corrige enlace con espacios en blanco
        a.href = downloadUrl.replace(' ', '%20');

        // Nombre para la descarga
        a.download = file;
        a.click();
    }

    downloadFile(file) {
        // Oculta el modal
        this.hideModal();
        const path_relative = this.getPathRelative();
        const formData = new FormData();
        formData.append('action', 'download');
        formData.append('file', file);
        formData.append('path_relative', path_relative);

        const headers = new Headers();
        const request = new Request(this.serverController, {
            method: 'POST',
            headers: headers,
            mode: 'same-origin', // https://developer.mozilla.org/en-US/docs/Web/API/Request/mode
            credentials: 'include',
            body: formData,
            cache: 'default'
        });

        fetch(request).then(function (t) {
            return t.blob().then((b) => {
                const a = document.createElement('a');
                a.href = URL.createObjectURL(b);
                a.setAttribute('download', file);
                a.click();
            });
        });
    }

    prepareMoveFiles(file) {
        // Guarda el archivo y la ruta origen para usar después
        this.moveSourceFile = file;
        this.moveSourcePath = this.getPathRelative();

        let btnPaste = this.element.querySelector('[data-id="btnPaste"]');

        // Marcar que hay una operación mover pendiente
        this.isMovePending = true;

        // Mostrar el botón Pegar cuando el usuario inicia una operación "Mover"
        btnPaste.onclick = this.doMoveFiles.bind(this);
        btnPaste.disabled = false;
        btnPaste.classList.add('btn-primary');
        // Mostrar visualmente el control (estaba oculto por defecto)
        btnPaste.style.display = '';
    }

    doMoveFiles() {
        const formData = new FormData();
        formData.append('action', 'move');
        formData.append('file', this.moveSourceFile);
        formData.append('path_relative', this.moveSourcePath);
        formData.append('path_relative_target', this.getPathRelative());

        let btnPaste = this.element.querySelector('[data-id="btnPaste"]');
        // Ocultar y desactivar el botón Pegar después de completar el pegado
        btnPaste.onclick = null;
        btnPaste.disabled = true;
        btnPaste.style.display = 'none';

        // Ya no hay una operación mover pendiente
        this.isMovePending = false;

        this.loadController(
            function (response) {
                if (response.errors.length > 0) {
                    let content = '<p>La operación solicitada no se pudo realizar debido a los siguientes errores:</p>';
                    content += this.helperUl(response.errors);
                    this.setAlert('warning', 'Error al Mover', content);
                    this.showModal();
                } else {
                    this.refresh();
                    this.hideModal();
                }
            }.bind(this)
            , formData);

    }

    clipboardFile(file) {
        const path_relative = this.getPathRelative();
        const uri = this.baseUrlFiles + path_relative + file;

        // Usar API moderna de Clipboard si está disponible
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(uri)
                .then(() => {
                    this.showClipboardModal(uri, 'Enlace Copiado', 'El enlace ha sido copiado al portapapeles:');
                })
                .catch(err => {
                    console.error('Error al copiar:', err);
                    this.fallbackCopyToClipboard(uri);
                });
        } else {
            // Fallback para navegadores antiguos o contextos no seguros
            this.fallbackCopyToClipboard(uri);
        }
    }

    fallbackCopyToClipboard(text) {
        const input = document.createElement('input');
        input.setAttribute('value', text);
        document.body.appendChild(input);
        input.select();

        try {
            const result = document.execCommand('copy');
            input.remove();

            if (result) {
                this.showClipboardModal(text, 'Enlace Copiado', 'El enlace ha sido copiado al portapapeles:');
            } else {
                this.showClipboardModal(text, 'Información', 'No se pudo copiar automáticamente. Por favor, copie el enlace manualmente:');
            }
        } catch (err) {
            console.error('Error en fallback:', err);
            input.remove();
            this.showClipboardModal(text, 'Información', 'No se pudo copiar automáticamente. Por favor, copie el enlace manualmente:');
        }
    }

    showClipboardModal(uri, title, message) {
        this.setModalContent('template_clipboard');
        const filesModalBody = this.element.querySelector('[data-id="files-modal-content"]');
        filesModalBody.querySelector('[data-clipboard-title]').textContent = title;
        filesModalBody.querySelector('[data-clipboard-message]').textContent = message;
        filesModalBody.querySelector('[data-clipboard-uri]').textContent = uri;
        this.showModal();
    }

    showFormRenameFile(file) {
        this.setModalContent('template_form_rename_file');
        this.showModal();
        const newname = this.element.querySelector('[data-id="form_rename_file"] [name="newname"]');
        newname.value = file;
        this.element.querySelector('[data-id="form_rename_file"] button[data-action="send"]').onclick = () => {
            this.sendRenameFile(file);
        };
    }

    sendRenameFile(file) {
        // Oculta el modal
        this.hideModal();
        const path_relative = this.getPathRelative();
        const formData = new FormData(this.element.querySelector('[data-id="form_rename_file"]'));
        formData.append('action', 'rename');
        formData.append('file', file);
        formData.append('path_relative', path_relative);

        this.loadController(
            function (response) {
                if (response.errors.length > 0) {
                    let content = '<p>La operación solicitada no se pudo realizar debido a los siguientes errores:</p>';
                    content += this.helperUl(response.errors);
                    this.setAlert('warning', 'Error al Renombrar', content);
                    this.showModal();
                } else {
                    this.refresh();
                    this.hideModal();
                }
            }.bind(this)
            , formData);
    }

    confirmDeleteFile(file) {
        this.setModalContent('template_confirm_delete');

        const filenameElement = this.element.querySelector('[data-confirm-filename]');
        filenameElement.textContent = file;

        const btnCancel = this.element.querySelector('[data-confirm-cancel]');
        btnCancel.onclick = () => this.hideModal();

        const btnDelete = this.element.querySelector('[data-confirm-delete]');
        btnDelete.onclick = () => {
            this.hideModal();
            this.deleteFile(file);
        };

        this.showModal();
    }

    deleteFile(file) {
        const path_relative = this.getPathRelative();
        const formData = new FormData();
        formData.append('action', 'delete');
        formData.append('file', file);
        formData.append('path_relative', path_relative);

        this.loadController(
            function (response) {
                if (response.errors.length > 0) {
                    let content = '<p>La operación solicitada no se pudo realizar debido a los siguientes errores:</p>';
                    content += this.helperUl(response.errors);
                    this.setAlert('warning', 'Error al Eliminar', content);
                    this.showModal();
                } else {
                    this.refresh();
                    this.hideModal();
                }
            }.bind(this)
            , formData);
    }

    refreshDisplayList(data) {
        const tbody = this.element.querySelector('[data-id="files_display_content"] table>tbody');
        tbody.innerHTML = '';

        if (data.files.length < 1) {
            this.element.querySelector('[data-id="files_display_content"] table thead tr:last-child').style.display = 'table-row';
        } else {
            this.element.querySelector('[data-id="files_display_content"] table thead tr:last-child').style.display = 'none';
        }

        for (const val of data.files) {
            // Obtiene la extension del archivo a fin de vincular con una imagen representativa del mismo.
            const pos = val.basename.indexOf('.', 0);
            const ext = val.basename.substr(pos + 1);

            // Copia e inserta el template para que sea renderizado y asi poder asignar eventos
            const tpl = this.element.querySelector('#template_row');
            const copy = document.importNode(tpl.content, true);
            const tr = copy.querySelector("tr");
            // Convierte rutas relativas en absolutas
            this.convertRelativeImagePathToAbsolute(tr);

            const td = tr.querySelectorAll('td');

            const iconElement = td[0].querySelector('i');
            if (val.mime === 'directory') {
                // Set folder icon using Bootstrap Icons
                iconElement.className = 'bi bi-folder-fill text-warning';
                iconElement.style.cursor = 'pointer';
                iconElement.style.fontSize = '24px';

                td[0].ondblclick = this.goDirectory.bind(this, val.basename);
                td[1].ondblclick = this.goDirectory.bind(this, val.basename);
                td[2].ondblclick = this.goDirectory.bind(this, val.basename);
                tr.style.cursor = 'pointer';
            } else {
                // Set file icon using Bootstrap Icons
                iconElement.className = this.getClassByExts(ext);
                iconElement.style.cursor = 'default';
                iconElement.style.fontSize = '24px';
                tr.style.cursor = 'default';
            }

            td[1].innerHTML = val.basename;
            td[2].innerHTML = val.mime === 'directory' ? '...' : this.humanFileSize(val.size);

            // Asigna el método correspondiente al evento click en los botones (ahora son buttons con data-action)
            const btnDownload = td[3].querySelector('button[data-action="download"]');
            const btnMove = td[3].querySelector('button[data-action="move"]');
            const btnShared = td[3].querySelector('button[data-action="shared"]');
            const btnEdit = td[3].querySelector('button[data-action="edit"]');
            const btnDelete = td[3].querySelector('button[data-action="delete"]');

            if (data.allowed_actions.includes('download')) {
                if (val.mime === 'directory') {
                    btnDownload.disabled = true;
                    btnDownload.title = '';
                } else {
                    btnDownload.onclick = this._wrapAction(this.downloadFile.bind(this, val.basename));
                }
            } else {
                btnDownload.disabled = true;
            }

            if (data.allowed_actions.includes('move')) {
                btnMove.onclick = this.prepareMoveFiles.bind(this, val.basename);
            } else {
                btnMove.disabled = true;
            }
            if (data.allowed_actions.includes('shared')) {
                btnShared.onclick = this._wrapAction(this.clipboardFile.bind(this, val.basename));
            } else {
                btnShared.disabled = true;
            }
            if (data.allowed_actions.includes('rename')) {
                btnEdit.onclick = this._wrapAction(this.showFormRenameFile.bind(this, val.basename));
            } else {
                btnEdit.disabled = true;
            }
            if (data.allowed_actions.includes('delete')) {
                btnDelete.onclick = this._wrapAction(this.confirmDeleteFile.bind(this, val.basename));
            } else {
                btnDelete.disabled = true;
            }

            tbody.appendChild(tr);
        }

        // Reinicializa tooltips para los nuevos elementos
        this.initTooltips();
    }

    refreshDisplayGrid(data) {
        const gridContainer = this.element.querySelector('[data-id="files_display_grid"] [data-grid-container]');
        const emptyMessage = this.element.querySelector('[data-id="files_display_grid"] [data-grid-empty]');

        gridContainer.innerHTML = '';

        if (data.files.length < 1) {
            emptyMessage.classList.remove('d-none');
        } else {
            emptyMessage.classList.add('d-none');
        }

        for (const val of data.files) {
            const pos = val.basename.indexOf('.', 0);
            const ext = val.basename.substr(pos + 1);

            const tpl = this.element.querySelector('#template_grid_item');
            const copy = document.importNode(tpl.content, true);
            const colDiv = copy.querySelector('.col-6');
            const card = colDiv.querySelector('.card');

            this.convertRelativeImagePathToAbsolute(colDiv);

            const iconElement = card.querySelector('.icon-file-type-grid');
            const filenameEl = card.querySelector('[data-grid-filename]');
            const sizeEl = card.querySelector('[data-grid-size]');
            const iconContainer = card.querySelector('[data-grid-icon-container]');

            if (val.mime === 'directory') {
                // Set folder icon using Bootstrap Icons
                iconElement.className = 'bi bi-folder-fill text-warning';
                iconElement.style.fontSize = '48px';
                iconContainer.style.cursor = 'pointer';
                card.style.cursor = 'pointer';

                iconContainer.ondblclick = this.goDirectory.bind(this, val.basename);
                filenameEl.ondblclick = this.goDirectory.bind(this, val.basename);
                sizeEl.textContent = '...';
            } else {
                // Set file icon using Bootstrap Icons
                iconElement.className = this.getClassByExts(ext);
                iconElement.style.fontSize = '48px';
                iconContainer.style.cursor = 'default';
                card.style.cursor = 'default';
                sizeEl.textContent = this.humanFileSize(val.size);
            }

            filenameEl.textContent = val.basename;
            filenameEl.title = val.basename;
            // Add Bootstrap tooltip to filename in grid view so long names show on hover
            filenameEl.setAttribute('data-bs-toggle', 'tooltip');
            filenameEl.setAttribute('data-bs-placement', 'bottom');
            // Ensure the tooltip text is read from title (Bootstrap prefers title)
            filenameEl.setAttribute('title', val.basename);

            // Botones de acción del dropdown
            const btnDownload = card.querySelector('.dropdown-item[data-action="download"]');
            const btnMove = card.querySelector('.dropdown-item[data-action="move"]');
            const btnShared = card.querySelector('.dropdown-item[data-action="shared"]');
            const btnEdit = card.querySelector('.dropdown-item[data-action="edit"]');
            const btnDelete = card.querySelector('.dropdown-item[data-action="delete"]');

            if (data.allowed_actions.includes('download')) {
                if (val.mime === 'directory') {
                    btnDownload.disabled = true;
                    btnDownload.classList.add('disabled');
                } else {
                    btnDownload.onclick = this._wrapAction(this.downloadFile.bind(this, val.basename));
                }
            } else {
                btnDownload.disabled = true;
                btnDownload.classList.add('disabled');
            }

            if (data.allowed_actions.includes('move')) {
                btnMove.onclick = this.prepareMoveFiles.bind(this, val.basename);
            } else {
                btnMove.disabled = true;
                btnMove.classList.add('disabled');
            }

            if (data.allowed_actions.includes('shared')) {
                btnShared.onclick = this._wrapAction(this.clipboardFile.bind(this, val.basename));
            } else {
                btnShared.disabled = true;
                btnShared.classList.add('disabled');
            }

            if (data.allowed_actions.includes('rename')) {
                btnEdit.onclick = this._wrapAction(this.showFormRenameFile.bind(this, val.basename));
            } else {
                btnEdit.disabled = true;
                btnEdit.classList.add('disabled');
            }

            if (data.allowed_actions.includes('delete')) {
                btnDelete.onclick = this._wrapAction(this.confirmDeleteFile.bind(this, val.basename));
            } else {
                btnDelete.disabled = true;
                btnDelete.classList.add('disabled');
            }

            gridContainer.appendChild(colDiv);
        }

        // Reinicializa tooltips para los nuevos elementos
        this.initTooltips();

        // Initialize grid dropdown handlers (move-to-body + Popper) to avoid stacking/clip issues
        // and prevent the race where the first click only moves the menu but doesn't show it.
        this.initGridDropdowns();
    }

    // Prepare dropdown menus inside the grid so they are moved to document.body before Bootstrap
    // processes the click. We bind to pointerdown to ensure the menu is already in the body when
    // Bootstrap toggles it, avoiding a race that requires multiple clicks.
    initGridDropdowns() {
        const grid = this.element.querySelector('[data-id="files_display_grid"]');
        if (!grid) return;

        const toggles = Array.from(grid.querySelectorAll('[data-bs-toggle="dropdown"]'));
        for (const toggle of toggles) {
            // guard against double-binding
            if (toggle.dataset.feDropdownInit) continue;
            toggle.dataset.feDropdownInit = '1';

            // Ensure Bootstrap's Dropdown instance exists so its internal _menu is resolved
            // before we ever move the menu node. If we move the node before Bootstrap
            // resolves the menu, Bootstrap may set _menu to null and later throw.
            try {
                if (typeof bootstrap !== 'undefined' && bootstrap.Dropdown && typeof bootstrap.Dropdown.getOrCreateInstance === 'function') {
                    bootstrap.Dropdown.getOrCreateInstance(toggle);
                }
            } catch (err) {
                // non-fatal, continue and rely on our prepare logic
                console.debug('FE initGridDropdowns: bootstrap instance creation failed', err);
            }

            // The dropdown menu is normally the next sibling with class .dropdown-menu
            const menu = toggle.parentElement ? toggle.parentElement.querySelector('.dropdown-menu') : null;
            if (!menu) continue;

            // remember original parent for restore
            const originalParent = menu.parentNode;

            // On pointerdown, move the menu to body and create a Popper instance (if available)
            const prepare = (e) => {
                try {
                    if (menu.parentNode === document.body) return; // already moved

                    document.body.appendChild(menu);
                    menu.classList.add('fe-dropdown-moved');

                    let popperInstance = null;
                    if (typeof Popper !== 'undefined' && Popper.createPopper) {
                        popperInstance = Popper.createPopper(toggle, menu, {
                            placement: 'bottom',
                            strategy: 'fixed',
                            modifiers: [
                                { name: 'flip', options: { fallbackPlacements: [] } },
                                { name: 'offset', options: { offset: [0, 6] } }
                            ]
                        });
                    }

                    this._fePopperMap.set(menu, { popper: popperInstance, originalParent: originalParent });
                } catch (err) {
                    // don't block the UI if popper/create fails; menu will still be in body
                    console.error('FE initGridDropdowns prepare error', err);
                    this._fePopperMap.set(menu, { popper: null, originalParent: originalParent });
                }
            };

            toggle.addEventListener('pointerdown', prepare);

            // On hide, destroy popper and restore menu to its original parent
            toggle.addEventListener('hidden.bs.dropdown', (ev) => {
                try {
                    const entry = this._fePopperMap.get(menu) || {};
                    if (entry.popper && typeof entry.popper.destroy === 'function') {
                        entry.popper.destroy();
                    }

                    if (menu.parentNode === document.body && entry.originalParent) {
                        entry.originalParent.appendChild(menu);
                        menu.classList.remove('fe-dropdown-moved');
                    }
                } catch (err) {
                    console.error('FE initGridDropdowns restore error', err);
                }
            });
        }
    }

    refreshBreadcurmb() {
        const list_breadcrumb = this.element.querySelector('[data-id="files_breadcrumb_content"] ul,ol');

        // Obtiene un arreglo con los elementos de la lista excluyento el primero que corresponde al home
        const items = list_breadcrumb.querySelectorAll('li:not(:first-child)');

        // Elimina los nodos seleccionados
        for (const item of Array.from(items)) {
            item.parentNode.removeChild(item);
        }

        // Asigna evento al boton home
        let li = list_breadcrumb.querySelector('li');
        li.style.cursor = 'pointer';
        li.onclick = (e) => {
            e.preventDefault();
            this.goHome();
        };

        // Crea las migas de pan con clases Bootstrap
        for (let k = 0; k < this.pathRelativeArray.length; k++) {
            li = document.createElement('li');
            li.className = 'breadcrumb-item';
            const a = document.createElement('a');
            a.href = '#';
            a.className = 'text-decoration-none link-dark';
            a.textContent = this.pathRelativeArray[k];
            a.onclick = (e) => {
                e.preventDefault();
                this.btnBreadCrumb(k);
            };
            li.appendChild(a);
            list_breadcrumb.appendChild(li);
        }
    }

    getClassByExts(ext) {
        if (!ext || typeof ext !== 'string') return 'bi bi-file-earmark';
        const e = ext.toLowerCase().replace(/^\./, '');

        // Map file extensions to Bootstrap Icons
        const iconMap = {
            // Documents
            'pdf': 'bi bi-file-earmark-pdf',
            'doc': 'bi bi-file-earmark-word',
            'docx': 'bi bi-file-earmark-word',
            'odt': 'bi bi-file-earmark-word',
            'xls': 'bi bi-file-earmark-excel',
            'xlsx': 'bi bi-file-earmark-excel',
            'ods': 'bi bi-file-earmark-excel',
            'csv': 'bi bi-file-earmark-spreadsheet',
            'ppt': 'bi bi-file-earmark-ppt',
            'pptx': 'bi bi-file-earmark-ppt',
            'odp': 'bi bi-file-earmark-ppt',
            'txt': 'bi bi-file-earmark-text',
            'rtf': 'bi bi-file-earmark-text',
            'md': 'bi bi-file-earmark-text',
            'markdown': 'bi bi-file-earmark-text',

            // Code files
            'html': 'bi bi-file-earmark-code',
            'htm': 'bi bi-file-earmark-code',
            'css': 'bi bi-file-earmark-code',
            'scss': 'bi bi-file-earmark-code',
            'sass': 'bi bi-file-earmark-code',
            'less': 'bi bi-file-earmark-code',
            'js': 'bi bi-file-earmark-code',
            'jsx': 'bi bi-file-earmark-code',
            'ts': 'bi bi-file-earmark-code',
            'tsx': 'bi bi-file-earmark-code',
            'json': 'bi bi-file-earmark-code',
            'xml': 'bi bi-file-earmark-code',
            'yml': 'bi bi-file-earmark-code',
            'yaml': 'bi bi-file-earmark-code',
            'php': 'bi bi-file-earmark-code',
            'py': 'bi bi-file-earmark-code',
            'rb': 'bi bi-file-earmark-code',
            'java': 'bi bi-file-earmark-code',
            'c': 'bi bi-file-earmark-code',
            'cpp': 'bi bi-file-earmark-code',
            'cs': 'bi bi-file-earmark-code',
            'go': 'bi bi-file-earmark-code',
            'sh': 'bi bi-file-earmark-code',
            'bash': 'bi bi-file-earmark-code',
            'sql': 'bi bi-file-earmark-code',

            // Images
            'jpg': 'bi bi-file-earmark-image',
            'jpeg': 'bi bi-file-earmark-image',
            'png': 'bi bi-file-earmark-image',
            'gif': 'bi bi-file-earmark-image',
            'bmp': 'bi bi-file-earmark-image',
            'svg': 'bi bi-file-earmark-image',
            'webp': 'bi bi-file-earmark-image',
            'ico': 'bi bi-file-earmark-image',
            'tif': 'bi bi-file-earmark-image',
            'tiff': 'bi bi-file-earmark-image',
            'heic': 'bi bi-file-earmark-image',
            'raw': 'bi bi-file-earmark-image',
            'psd': 'bi bi-file-earmark-image',
            'ai': 'bi bi-file-earmark-image',

            // Audio
            'mp3': 'bi bi-file-earmark-music',
            'wav': 'bi bi-file-earmark-music',
            'aac': 'bi bi-file-earmark-music',
            'ogg': 'bi bi-file-earmark-music',
            'flac': 'bi bi-file-earmark-music',
            'm4a': 'bi bi-file-earmark-music',
            'wma': 'bi bi-file-earmark-music',
            'm4p': 'bi bi-file-earmark-music',

            // Video
            'mp4': 'bi bi-file-earmark-play',
            'avi': 'bi bi-file-earmark-play',
            'mov': 'bi bi-file-earmark-play',
            'mkv': 'bi bi-file-earmark-play',
            'webm': 'bi bi-file-earmark-play',
            'flv': 'bi bi-file-earmark-play',
            'wmv': 'bi bi-file-earmark-play',
            'm4v': 'bi bi-file-earmark-play',
            'mp4v': 'bi bi-file-earmark-play',

            // Archives
            'zip': 'bi bi-file-earmark-zip',
            'rar': 'bi bi-file-earmark-zip',
            '7z': 'bi bi-file-earmark-zip',
            'tar': 'bi bi-file-earmark-zip',
            'gz': 'bi bi-file-earmark-zip',
            'bz2': 'bi bi-file-earmark-zip',
            'xz': 'bi bi-file-earmark-zip',

            // Fonts
            'ttf': 'bi bi-file-earmark-font',
            'otf': 'bi bi-file-earmark-font',
            'woff': 'bi bi-file-earmark-font',
            'woff2': 'bi bi-file-earmark-font',

            // Executables
            'exe': 'bi bi-file-earmark-binary',
            'dll': 'bi bi-file-earmark-binary',
            'so': 'bi bi-file-earmark-binary',
            'app': 'bi bi-file-earmark-binary',

            // Others
            'key': 'bi bi-key',
            'mdx': 'bi bi-file-earmark-richtext'
        };

        // Return mapped icon or default
        return iconMap[e] || 'bi bi-file-earmark';
    }

    setAlert(type, title, content) {
        // Delegar en el servicio de alertas para SRP/KISS
        this.alerts.show(type, title, content);
    }

    setModalContent(id_template) {
        // Delegado al administrador de modales (mantiene compatibilidad de API)
        this.modal.setContent(id_template);
    }

    showModal() { this.modal.show(); }

    hideModal() { this.modal.hide(); }

    // Devuelve una lista desordenada de acuerdo al arreglo que recibe
    helperUl(arr) {
        let out = '<ul>';
        for (const valor of arr) {
            out += '<li>' + valor + '</li>';
        }
        out += '</ul>';
        return out;
    }

    humanFileSize(size) {
        const i = Math.floor(Math.log(size) / Math.log(1024));
        const decimal = i > 1 ? 2 : 0;
        return (size / Math.pow(1024, i)).toFixed(decimal) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
    }
}