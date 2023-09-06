window.onload = function () {
    const content = document.querySelector('.content');
    const header = document.querySelector('.header');
    const footer = document.querySelector('.footer');
  
    // Função para dividir o conteúdo em páginas A4
    function paginateContent() {
      const pageHeight = 297; // Altura de uma página A4 em mm
      let currentPageHeight = 0;
      let currentPage = null;
  
      content.childNodes.forEach((childNode) => {
        if (!currentPage || currentPageHeight + childNode.clientHeight > pageHeight) {
          // Criar uma nova página A4
          currentPage = document.createElement('div');
          currentPage.classList.add('a4');
          content.appendChild(currentPage);
          currentPageHeight = 0;
  
          // Clonar cabeçalho e rodapé para a nova página
          currentPage.appendChild(header.cloneNode(true));
          currentPage.appendChild(footer.cloneNode(true));
        }
  
        currentPage.appendChild(childNode);
        currentPageHeight += childNode.clientHeight;
      });
    }
    paginateContent();
};
  