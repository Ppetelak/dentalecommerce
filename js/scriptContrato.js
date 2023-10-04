function saveAsPDF() {
  var element = document.querySelector('main'); // Pode ser substituído por um seletor mais específico

  // Opções para personalizar a conversão PDF
  var opt = {
      margin: 0,
      filename: 'sua_pagina_a4.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { 
                unit: 'mm', 
                format: 'a4', 
                orientation: 'portrait',
                putOnlyUsedFonts: true,
                pagesplit: true,
                callback: function (pdf) {
                      var numPages = pdf.internal.getNumberOfPages();
                      
                      for (var i = 1; i <= numPages; i++) {
                          pdf.setPage(i);
                          
                          // Adiciona cabeçalho
                          pdf.text('Cabeçalho - Página ' + i, pdf.internal.pageSize.width / 2, 10, 'center');
                          
                          // Adiciona rodapé com número de página
                          pdf.text('Página ' + i + ' de ' + numPages, pdf.internal.pageSize.width / 2, pdf.internal.pageSize.height - 10, 'center');
                      }
                  }
              }
  };

  // Chame a função html2pdf
  html2pdf(element, opt);
}

// Adicione um ouvinte de evento ao botão
document.getElementById('btnSave').addEventListener('click', saveAsPDF);

  