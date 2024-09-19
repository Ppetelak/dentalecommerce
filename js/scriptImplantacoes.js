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
            alert("Disparo de email realizado");
            location.reload();
        },
        error: function(error) {
            alert("Erro ao disparar email consulte o log");
            console.log(error);
            location.reload();
        }
        });
    });
    $("#reenviarProposta").click(function(event) {
    
        event.preventDefault();
    
        const idImplantacao = $(this).data("id");
    
        console.log(`clicou em reenviar proposta para DS de id: ${idImplantacao}`)
    
        // Exibe a mensagem "Enviando email, aguarde..."
        alert("Enviando Proposta");
    
        // Faz a requisição Ajax
        $.ajax({
            type: "GET",
            url: `/reenviarPropostaDS/${idImplantacao}`,
            success: function(data) {
                alert("Proposta enviada com sucesso");
                location.reload();
            },
            error: function(error) {
                alert("Erro ao enviar Proposta");
                console.log(error);
                location.reload();
            }
            });
        });
        let isEditing = false; // Estado de edição
        const editButton = $('#editButton');
        
        // Função para alternar entre visualizar e editar
        editButton.on('click', function() {
          isEditing = !isEditing;
  
          if (isEditing) {
            editButton.text('Salvar');
            $('.editable').each(function() {
              const value = $(this).text();
              const key = $(this).data('key');
              $(this).html(`<input type="text" class="form-control" data-key="${key}" value="${value}">`);
            });
          } else {
            editButton.text('Editar');
            $('.editable').each(function() {
              const inputValue = $(this).find('input').val();
              $(this).html(inputValue);
            });
            
            // Aqui você pode enviar os dados editados para o servidor via AJAX
            const updatedData = {};
            $('.editable input').each(function() {
              const key = $(this).data('key');
              const value = $(this).val();
              updatedData[key] = value;
            });
            
            // Exemplo de envio via AJAX
            $.ajax({
              url: '/salvarDados', // Endpoint para salvar os dados
              method: 'POST',
              data: updatedData,
              success: function(response) {
                alert('Dados salvos com sucesso!');
              },
              error: function(error) {
                alert('Erro ao salvar os dados.');
              }
            });
          }
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
