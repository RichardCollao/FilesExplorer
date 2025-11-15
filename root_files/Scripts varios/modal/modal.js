function showModal(idModal) {
    document.getElementById(idModal).style.display = 'block';
}

function hideModal(idModal) {
    document.getElementById(idModal).style.display = 'none';
}

window.onload = function () {
    // Asigna el evento click a todos los padres(.modal-container) de elementos cuya clase sea (.modal-close)
    Array.from(document.querySelectorAll('[data-modal-close]')).forEach(link => {
        link.addEventListener('click', function (event) {
            this.closest("[data-modal-container]").style.display = 'none';
        });
    });
};