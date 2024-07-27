function saveAsPDF() {
    const currentUrl = window.location.href;

            // Obter os valores dos inputs ocultos
    const numeroProposta = document.getElementById("numeroProposta").value;
    const planoLogo = document.getElementById("planoLogo").value;
    const dataVigencia = document.getElementById("dataVigencia").value;
    const ansOperadora = document.getElementById("ansOperadora").value;


    // Construir a URL com os parâmetros
    const newHref = `/generate-pdf/?url=${encodeURIComponent(currentUrl)}&numeroProposta=${numeroProposta}&planoLogo=${planoLogo}&dataVigencia=${dataVigencia}&ansOperadora=${ansOperadora}`;

    // Atualizar o href do link
    const pdfLink = document.getElementById("pdfLink");
    pdfLink.setAttribute("href", newHref);
    // Redireciona para o link
    pdfLink.click();
}

document.getElementById('btnSave').addEventListener('click', saveAsPDF);

/* const container = document.getElementById('signature-container');
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
    // Desabilitar o botão de salvar e mostrar o loader
    this.disabled = true;
    document.getElementById('loading-div').style.display = 'block';

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
                // Reabilitar o botão e esconder o loader em caso de erro
                document.getElementById('save-btn').disabled = false;
                document.getElementById('loading-div').style.display = 'none';
                alert('Erro ao salvar assinatura. Tente novamente.');
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
}); */

function loadFonts(fonts) {
    const fontUrls = {
        'Dancing Script': '/fonts/dancing_script.woff2',
        'Satisfy': '/fonts/satisfy.woff2',
        'Shadows Into Light': '/fonts/shadows_into_light.woff2',
        'Great Vibes': '/fonts/great_vibes.woff2',
        'Roboto': '/fonts/roboto.woff2'
    };

    const fontPromises = fonts.map(font => {
        const fontFace = new FontFace(font.css, `url(${fontUrls[font.css]})`);
        return fontFace.load().then(loadedFont => {
            document.fonts.add(loadedFont);
        });
    });

    return Promise.all(fontPromises);
}




document.addEventListener('DOMContentLoaded', (event) => {
    const generateSignatureButton = document.getElementById('generate-signature');
    const saveButton = document.getElementById('save-btn');
    const resetButton = document.getElementById('reset-btn');
    const signatureOptions = document.getElementById('signature-options');
    let selectedSignature = null;

    const fonts = [
        { name: 'Dancing Script', css: 'Dancing Script' },
        { name: 'Satisfy', css: 'Satisfy' },
        { name: 'Shadows Into Light', css: 'Shadows Into Light' },
        { name: 'Great Vibes', css: 'Great Vibes' },
        { name: 'Roboto', css: 'Roboto' }
    ];

    function generateSignatures(name) {
        signatureOptions.innerHTML = ''; // Limpar opções anteriores
        selectedSignature = null; // Limpar assinatura selecionada

        fonts.forEach(font => {
            const canvas = document.createElement('canvas');
            canvas.width = 400;
            canvas.height = 100;
            const context = canvas.getContext('2d');
            context.font = `30px ${font.css}`;
            context.fillText(name, 10, 50);
            const signatureDataURL = canvas.toDataURL();

            // Criar um elemento de imagem para exibir a assinatura
            const img = document.createElement('img');
            img.src = signatureDataURL;
            img.alt = 'Assinatura';
            img.classList.add('signature-option');
            img.style.cursor = 'pointer';
            img.addEventListener('click', function() {
                // Remover a seleção anterior
                document.querySelectorAll('.signature-option').forEach(el => el.classList.remove('selected'));
                img.classList.add('selected');
                selectedSignature = signatureDataURL;
            });

            // Adicionar a imagem ao contêiner de opções
            signatureOptions.appendChild(img);
        });

        document.querySelector('.signature-preview').style.display = 'block';
    }

    generateSignatureButton.addEventListener('click', function() {
        const nameInput = document.getElementById('signature-name').value;
        if (nameInput) {
            loadFonts(fonts).then(() => {
                generateSignatures(nameInput);
            }).catch(err => {
                console.error('Erro ao carregar fontes:', err);
                alert('Erro ao carregar fontes. Tente novamente.');
            });
        } else {
            alert('Por favor, insira seu nome.');
        }
    });

    saveButton.addEventListener('click', function() {
        if (selectedSignature) {
            // Desabilitar o botão de salvar e mostrar o loader
            this.disabled = true;
            document.getElementById('loading-div').style.display = 'block';

            // ID da implantação associada
            const idImplantacao = this.dataset.implantacaoId;

            // Construa o objeto a ser enviado no corpo da requisição
            const dataToSend = {
                idImplantacao: idImplantacao,
                assinatura_base64: selectedSignature,
                urlContrato: window.location.href,
                numeroProposta: document.getElementById("numeroProposta").value,
                planoLogo: document.getElementById("planoLogo").value,
                dataVigencia: document.getElementById("dataVigencia").value,
                ansOperadora: document.getElementById("ansOperadora").value,
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
                        location.reload();
                    },
                    error: function (error) {
                        console.error('Erro ao salvar assinatura:', error);
                        // Reabilitar o botão e esconder o loader em caso de erro
                        document.getElementById('save-btn').disabled = false;
                        document.getElementById('loading-div').style.display = 'none';
                        alert('Erro ao salvar assinatura. Tente novamente.');
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
        } else {
            alert('Por favor, selecione uma assinatura.');
        }
    });

    resetButton.addEventListener('click', function () {
        // Limpe a entrada de nome e a visualização da assinatura ao clicar no botão de reset
        document.getElementById('signature-name').value = '';
        document.querySelector('.signature-preview').style.display = 'none';
        signatureOptions.innerHTML = '';
        selectedSignature = null;
    });
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

