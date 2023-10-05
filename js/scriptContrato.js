function saveAsPDF() {
  var element = document.querySelector('main'); // Pode ser substituído por um seletor mais específico
  var numeroProposta = document.getElementById('numeroProposta').value  
  // Opções para personalizar a conversão PDF
  var opt = {
      margin: 0,
      filename: `Proposta ${numeroProposta}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { 
                unit: 'mm', 
                margin: { top: 200, right: 10, bottom: 200, left: 10 },
                format: 'a4', 
                orientation: 'portrait',
                putOnlyUsedFonts: true,
                pagesplit: true,
                pagebreak: { before: '.page-break' },
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

document.getElementById('btnSave').addEventListener('click', saveAsPDF);

  