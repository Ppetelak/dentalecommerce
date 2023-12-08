$(document).ready(function() {
    $("#reenviarEmail").click(function(event) {
    
    event.preventDefault();

    const idImplantacao = $(this).data("id");

    console.log(`clicou em renviar email da implantação de id: ${idImplantacao}`)

    // Exibe a mensagem "Enviando email, aguarde..."
    alert("Disparo de email realizado");

    // Faz a requisição Ajax
    $.ajax({
        type: "GET",
        url: `/enviar-email/${idImplantacao}`,
        success: function(data) {
            location.reload();
        },
        error: function(error) {
            location.reload();
        }
        });
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
