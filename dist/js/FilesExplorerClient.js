/* global fetch, eval, browser, top */

// --- SRP Helpers -----------------------------------------------------------
// Manages modal DOM interactions (open/close/set content/asset paths)
class ModalManager {
    constructor(rootElement, scriptPath) {
        this.root = rootElement;
        this.scriptPath = scriptPath;
        // Bind keyboard handler for ESC close
        this._onKeyDown = this._onKeyDown.bind(this);
    }

    setContent(templateId) {
        const filesModal = this.root.querySelector('[data-id="files-modal"]');
        const template = document.getElementById(templateId);
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
            const modal = new bootstrap.Modal(filesModal);
            modal.show();
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
            const modal = bootstrap.Modal.getInstance(filesModal);
            if (modal) modal.hide();
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
        let iconPath = './public/img/files/info.svg'; // por defecto

        switch (type) {
            case 'danger':
            case 'error':
                iconPath = './public/img/files/danger.svg';
                break;
            case 'warning':
                iconPath = './public/img/files/warning.svg';
                break;
            case 'success':
                iconPath = './public/img/files/success.svg';
                break;
            case 'info':
            default:
                iconPath = './public/img/files/info.svg';
        }

        filesModalBody.querySelector('[data-alert-header]').className = headerClass;
        const iconElement = filesModalBody.querySelector('[data-alert-icon]');
        iconElement.dataset.src = iconPath;
        // Use safe setter so alert icons fallback if missing
        try {
            iconElement.onerror = null;
            iconElement.src = iconPath.replace(/\.\//gi, this.modal.scriptPath);
            iconElement.onerror = () => {
                iconElement.onerror = null;
                iconElement.src = this.modal.scriptPath + './public/img/files/file-alt.svg';
            };
        } catch (e) {
            iconElement.src = iconPath.replace(/\.\//gi, this.modal.scriptPath);
        }
        filesModalBody.querySelector('[data-alert-title]').textContent = title;
        filesModalBody.querySelector('[data-alert-content]').innerHTML = content;
    }
}

class FilesExplorerClient {

    constructor(idElement) {
        // Formulario utilizado en alguna operaciones como cortar y 
        this.tempFormData = new FormData();
        this.idElement = idElement;
        this.element = document.querySelector('#' + this.idElement);

        // Obtiene la url real del script FilesExplorerClient.js
        const url = document.querySelector('script[src$="FilesExplorerClient.js"]').src;
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
        // Pre-computed set of available icon names in public/img/files (lowercase, without .svg)
        // This list is generated from the repository's public/img/files directory so the
        // runtime can prefer `filetype-<ext>` icons when present, then fall back to
        // default-* icons and finally `file-alt`.
        this._availableFileIcons = new Set([
            'default-video', 'default-code', 'default-compress', 'default-image', 'default-music', 'default-terminal',
            'file-alt', 'file-excel', 'file-pdf', 'file-ppt', 'file-word',
            'filetype-aac', 'filetype-ai', 'filetype-bmp', 'filetype-cs', 'filetype-css', 'filetype-csv', 'filetype-doc', 'filetype-docx', 'filetype-exe', 'filetype-gif', 'filetype-heic', 'filetype-html', 'filetype-java', 'filetype-jpg', 'filetype-js', 'filetype-json', 'filetype-jsx', 'filetype-key', 'filetype-m4p', 'filetype-md', 'filetype-mdx', 'filetype-mov', 'filetype-mp3', 'filetype-mp4', 'filetype-otf', 'filetype-php', 'filetype-png', 'filetype-ppt', 'filetype-pptx', 'filetype-psd', 'filetype-py', 'filetype-raw', 'filetype-rb', 'filetype-sass', 'filetype-scss', 'filetype-sh', 'filetype-sql', 'filetype-svg', 'filetype-tiff', 'filetype-tsx', 'filetype-ttf', 'filetype-txt', 'filetype-wav', 'filetype-woff', 'filetype-xls', 'filetype-xlsx', 'filetype-xml', 'filetype-yml'
        ]);
        // Estado cuando se ha iniciado una operación "mover" y queda pendiente el pegado
        this.isMovePending = false;
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
            btnPaste.classList.remove(btnPaste.dataset.classEnabled);
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

    // Safely set image src with a fallback to file-alt.svg on error
    setImgSrcSafe(imgEl, src) {
        try {
            imgEl.onerror = null;
            imgEl.src = src;
            imgEl.onerror = () => {
                imgEl.onerror = null;
                imgEl.src = this.scriptPath + './public/img/files/file-alt.svg';
            };
        } catch (e) {
            // ignore
        }
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

    // Recibe token correspondiente al identificador en la sesssion 
    setToken(token) {
        this.token = token;
    }

    setBaseUrlFiles(baseUrlFiles) {
        this.baseUrlFiles = baseUrlFiles;
    }

    setPathRelative(pathRelative = '') {
    // Purga los modificadores de rutas ../ ./ y las barras invertidas
    // Usar una expresión regular evita problemas de escape y funciona en todos los navegadores
    pathRelative = pathRelative.replace(/(\.\.\/|\.\/|\\\\)/g, '');
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

        formData.append('token', this.token);

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
                    // ignore
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
        const btnList = this.element.querySelector('[data-id="btnViewList"]');
        const btnGrid = this.element.querySelector('[data-id="btnViewGrid"]');

        if (view === 'list') {
            listView.classList.remove('d-none');
            gridView.classList.add('d-none');
            btnList.classList.add('active');
            btnGrid.classList.remove('active');
        } else {
            listView.classList.add('d-none');
            gridView.classList.remove('d-none');
            btnList.classList.remove('active');
            btnGrid.classList.add('active');
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
        formData.append('token', this.token);

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
        btnPaste.classList.add(btnPaste.dataset.classEnabled);
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
    btnPaste.classList.remove(btnPaste.dataset.classEnabled);
    btnPaste.style.display = 'none';

    // Ya no hay una operación mover pendiente
    this.isMovePending = false;

        this.loadController(
            function (response) {
                if (response.errors.length > 0) {
                    var content = '<p>La operación solicitada no se pudo realizar debido a los siguientes errores:</p>';
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

            const img_icon_type = td[0].querySelector('img');
            if (val.mime === 'directory') {
                // Cambia la imagen
                img_icon_type.dataset.src = './public/img/files/folder.svg';
                this.setImgSrcSafe(img_icon_type, this.scriptPath + './public/img/files/folder.svg');
                img_icon_type.style.cursor = 'pointer';

                td[0].ondblclick = this.goDirectory.bind(this, val.basename);
                td[1].ondblclick = this.goDirectory.bind(this, val.basename);
                td[2].ondblclick = this.goDirectory.bind(this, val.basename);
                tr.style.cursor = 'pointer';
            } else {
                // Cambia la imagen
                img_icon_type.dataset.src = './public/img/files/' + this.getClassByExts(ext) + '.svg';
                this.setImgSrcSafe(img_icon_type, this.scriptPath + './public/img/files/' + this.getClassByExts(ext) + '.svg');
                img_icon_type.style.cursor = 'default';
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

            const img_icon = card.querySelector('.icon-file-type-grid');
            const filenameEl = card.querySelector('[data-grid-filename]');
            const sizeEl = card.querySelector('[data-grid-size]');
            const iconContainer = card.querySelector('[data-grid-icon-container]');

            if (val.mime === 'directory') {
                img_icon.dataset.src = './public/img/files/folder.svg';
                this.setImgSrcSafe(img_icon, this.scriptPath + './public/img/files/folder.svg');
                iconContainer.style.cursor = 'pointer';
                card.style.cursor = 'pointer';

                iconContainer.ondblclick = this.goDirectory.bind(this, val.basename);
                filenameEl.ondblclick = this.goDirectory.bind(this, val.basename);
                sizeEl.textContent = '...';
            } else {
                img_icon.dataset.src = './public/img/files/' + this.getClassByExts(ext) + '.svg';
                this.setImgSrcSafe(img_icon, this.scriptPath + './public/img/files/' + this.getClassByExts(ext) + '.svg');
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
            a.className = 'text-decoration-none';
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
        if (!ext || typeof ext !== 'string') return 'file-alt';
        const e = ext.toLowerCase().replace(/^[\.] /, '');

        // 1) Prefer `filetype-<ext>` if an explicit icon exists in the icons folder
        const filetypeKey = 'filetype-' + e;
        if (this._availableFileIcons.has(filetypeKey)) return filetypeKey;

        // 2) Map common extensions to specific icons (these keys are present in the
        //    available icons list and cover frequent office/media types).
        const specific = {
            'pdf': 'file-pdf',
            'doc': 'file-word',
            'docx': 'file-word',
            'xls': 'file-excel',
            'xlsx': 'file-excel',
            'ppt': 'file-ppt',
            'pptx': 'file-ppt',
            'odt': 'file-excel',
            'zip': 'default-compress',
            'rar': 'default-compress',
            '7z': 'default-compress',
            'gz': 'default-compress',
            'tar': 'default-compress'
        };
        if (specific[e]) return specific[e];

        // 3) Image/audio/video fallbacks using default-* icons when present
        const imageExts = ['gif', 'jpg', 'jpeg', 'png', 'bmp', 'tif', 'svg', 'heic', 'raw', 'webp'];
        const audioExts = ['mp3', 'wav', 'aac', 'm4a', 'flac', 'ogg'];
        const videoExts = ['mp4', 'mkv', 'mov', 'avi', 'webm', 'mp4v', 'm4v'];

        if (imageExts.includes(e) && this._availableFileIcons.has('default-image')) return 'default-image';
        if (audioExts.includes(e) && this._availableFileIcons.has('default-music')) return 'default-music';
        if (videoExts.includes(e) && (this._availableFileIcons.has('default-video') || this._availableFileIcons.has('Default-video'))) return this._availableFileIcons.has('default-video') ? 'default-video' : 'Default-video';

        // 4) If there's a generic `file-<type>` icon for some known types, prefer it
        const genericByExt = {
            'css': 'filetype-css', 'js': 'filetype-js', 'json': 'filetype-json', 'html': 'filetype-html', 'php': 'filetype-php', 'py': 'filetype-py', 'md': 'filetype-md', 'txt': 'filetype-txt'
        };
        if (genericByExt[e] && this._availableFileIcons.has(genericByExt[e])) return genericByExt[e];

        // 5) Fallback to 'file-alt' (default generic file icon)
        return this._availableFileIcons.has('file-alt') ? 'file-alt' : 'file-alt';
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
