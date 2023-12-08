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

const container = document.getElementById('signature-container');
const canvas = document.getElementById('signature-pad');
const signaturePad = new SignaturePad(canvas, {
    onBegin: function (event) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const offsetX = rect.left - container.getBoundingClientRect().left;
        const offsetY = rect.top - container.getBoundingClientRect().top;

        const adjustedX = (event.clientX - offsetX) * scaleX;
        const adjustedY = (event.clientY - offsetY) * scaleY;

        const point = {
            x: adjustedX,
            y: adjustedY
        };
        signaturePad._strokeBegin(point);
    }
});

document.getElementById('save-btn').addEventListener('click', function () {
    // Obtenha a imagem da assinatura em formato base64
    const signatureData = signaturePad.toDataURL();

    // ID da implantação associada (substitua pelo valor correto)
    const idImplantacao = this.dataset.implantacaoId;

    // Construa o objeto a ser enviado no corpo da requisição
    const dataToSend = {
        idImplantacao: idImplantacao,
        assinatura_base64: signatureData
    };

    console.log(dataToSend);
    $.ajax({
        url: "/salva-assinatura",
        type: "POST",
        data: dataToSend,
        success: function () {
            signaturePad.clear();
            location.reload();
        },
        error: function () {
            console.error('Erro ao salvar assinatura:', error);
            window.reload();
        }
    });
});

document.getElementById('reset-btn').addEventListener('click', function () {
    // Limpe o canvas ao clicar no botão de reset
    signaturePad.clear();
});

function getCookieValue(name) {
    const cookieName = `${name}=`;
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
        let cookie = cookies[i].trim();
        if (cookie.startsWith(cookieName)) {
            return cookie.substring(cookieName.length, cookie.length);
        }
    }
    return '';
}

if (document.cookie.includes('alertSuccess')) {
    const alertSuccess = getCookieValue('alertSuccess');
    showMessage(alertSuccess);
    document.cookie = 'alertSuccess=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
}

if (document.cookie.includes('alertError')) {
    const alertError = getCookieValue('alertError');
    showMessageError(alertError);
    document.cookie = 'alertError=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
}

function showMessage(message) {
    const Mensagem = document.getElementById('Message')
    Mensagem.innerHTML = `${decodeURIComponent(message)} 
<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"><i class="bi bi-x"></i></button>`
    Mensagem.style.display = 'block';
}

function showMessageError(message) {
    const Mensagem = document.getElementById('MessageError')
    Mensagem.innerHTML = `ALERTA: ${decodeURIComponent(message)} 
<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"><i class="bi bi-x"></i></button>`
    Mensagem.style.display = 'block';
}

