function saveAsPDF() {
    const currentUrl = window.location.href;

            // Obter os valores dos inputs ocultos
    const numeroProposta = document.getElementById("numeroProposta").value;
    const planoLogo = document.getElementById("planoLogo").value;
    const dataVigencia = document.getElementById("dataVigencia").value;

    // Construir a URL com os parâmetros
    const newHref = `/generate-pdf/?url=${encodeURIComponent(currentUrl)}&numeroProposta=${numeroProposta}&planoLogo=${planoLogo}&dataVigencia=${dataVigencia}`;

    // Atualizar o href do link
    const pdfLink = document.getElementById("pdfLink");
    pdfLink.setAttribute("href", newHref);
    // Redireciona para o link
    pdfLink.click();
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
        assinatura_base64: signatureData,
        urlContrato: window.location.href,
        numeroProposta: document.getElementById("numeroProposta").value,
        planoLogo: document.getElementById("planoLogo").value,
        dataVigencia: document.getElementById("dataVigencia").value,
        location: null // Inicializa com null
    };

    // Função para enviar dados
    function sendData() {
        console.log(dataToSend);
        $.ajax({
            url: "/salva-assinatura",
            type: "POST",
            data: dataToSend,
            success: function () {
                signaturePad.clear();
                location.reload();
            },
            error: function (error) {
                console.error('Erro ao salvar assinatura:', error);
                window.reload();
            }
        });
    }

    // Tentar obter a localização do usuário
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function (position) {
                dataToSend.location = `Lat: ${position.coords.latitude}, Long: ${position.coords.longitude}`;
                sendData();
            },
            function (error) {
                console.warn('Erro ao obter localização:', error);
                sendData();
            }
        );
    } else {
        sendData();
    }
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

