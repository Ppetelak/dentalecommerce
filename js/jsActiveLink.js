document.addEventListener('DOMContentLoaded', function () {
    // Pega a parte da URL após a última barra "/"
    var currentPath = window.location.pathname;
    var currentPage = currentPath.substring(currentPath.lastIndexOf('/') + 1);

    // Seleciona todos os links na barra de navegação
    var navLinks = document.querySelectorAll(".navbar ul li a");

    // Itera sobre os links e verifica se a URL corresponde à página atual
    for (var i = 0; i < navLinks.length; i++) {
        var link = navLinks[i];
        var linkHref = link.getAttribute("href");

        // Remove a classe "active" de todos os links
        link.classList.remove("active");

        // Verifica se a URL do link corresponde à página atual
        if (linkHref === '/' + currentPage) {
            // Adiciona a classe "active" ao link
            link.classList.add("active");
        }
    }
});