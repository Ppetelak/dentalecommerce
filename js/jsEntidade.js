function mascaras() {
    $('[name="taxa"]').mask('0000.00', { reverse: true });
}

$(document).ready(function () {
    mascaras();
    $('#tags').tagsinput();
    
});

$('.tags').on('keydown', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault(); // Impede o envio do formulário
        $('.addTag').click(); // Aciona o clique no botão addTag
    }
});


$('.addTag').click(function () {
    console.log('clicou em adicionar tag');
    var $container = $(this).closest('.profissoesDiv');
    var value = $container.find('.tags').val();
    var inputProfissoes = $container.find('.inputProfissoes') // Use jQuery para obter o valor do input

    // Verifique se o campo está vazio
    if (value.trim() === '') {
        showMessageError('Insira uma Profissão depois aperte enter ou clique no botão "+" ');
        return; // Sai da função se o campo estiver vazio
    }

    // Crie um novo elemento divTag usando jQuery
    var divTag = `
    <div class="divTag">
        ${value}
        <button type="button" class="removerTag"> <i class="bi bi-x"></i> </button>
    </div>
    `;

    // Adicione divTag à div.inputProfissoes usando jQuery
    inputProfissoes.append(divTag);

    // Limpe o valor do campo de entrada
    $container.find('.tags').val('');
})


$('.inputProfissoes').on('click', '.removerTag', function() {
    $(this).parent('.divTag').remove();
});

function renderizarProfissoes(profissoes) {
    const inputProfissoes = $('.inputProfissoes');
    inputProfissoes.empty(); // Limpa o conteúdo atual

    // Itera sobre as profissões e cria as divs
    profissoes.forEach(function(profissao) {
        const divTag = `
            <div class="divTag">
                ${profissao.nome} <!-- Renderiza o nome da profissão -->
                <button type="button" class="removerTag"> <i class="bi bi-x"></i> </button>
            </div>
        `;
        inputProfissoes.append(divTag);
    });
}

function getProfissoes (idEntidade) {
    fetch(`/api/profissoes/${idEntidade}`)
    .then(response => {
        if (!response.ok) {
        throw new Error('Erro ao buscar profissões');
        }
        return response.json();
    })
    .then(data => {
        renderizarProfissoes(data);
    })
    .catch(error => {
        console.error('Erro ao buscar dados das profissões:', error);
    });
}

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
     <button type="button" class="btn btn-close" data-bs-dismiss="alert" aria-label="Fechar"> X </button>`
    Mensagem.style.display = 'block';
    setTimeout(function() {
        Mensagem.style.display = 'none';
    }, 6000);
}

function showMessageError(message) {
    const Mensagem = document.getElementById('MessageError')
    Mensagem.innerHTML = `ALERTA: ${decodeURIComponent(message)} 
     <button type="button" class="btn btn-close" data-bs-dismiss="alert" aria-label="Fechar"> X </button>`
    Mensagem.style.display = 'block';
    setTimeout(function() {
        Mensagem.style.display = 'none';
    }, 6000);
}

let formularioAberto = false;
$('.editar-btn').click(function () {
    const idEntidade = $(this).closest('tr').next('.editar-form-container').data('id');
    getProfissoes(idEntidade);
    const tr = $(this).closest('tr');
    const formContainer = tr.next('.editar-form-container');
    const form = formContainer.find('.editar-form');

    if (!formularioAberto) {
        // Abrir o formulário para edição
        form.find('.form-control').prop('disabled', false);
        formContainer.show();
        mascaras();
        $(this).text("Cancelar");
    } else {
        // Fechar o formulário e desabilitar os campos
        form.find('.form-control').prop('disabled', true);
        formContainer.hide();
        $(this).text("Editar");
    }

    formularioAberto = !formularioAberto;
});

$('.editar-form').submit(function (e) {
    e.preventDefault();
    const form = $(this);
    const idEntidade = form.data('id');
    console.log('clicou em salvar')
    const tags = [];

    const divTags = form.find('.divTag');

    const formData = {
        nome: form.find('#nome').val(),
        descricao: form.find('#descricao').val(),
        publico: form.find('#publico').val(),
        documentos: form.find('#documentos').val(),
        taxa: form.find('#taxa').val(),
    };

    $.ajax({
        type: 'POST',
        url: `/editar-entidade/${idEntidade}`,
        data: formData,
        success: function (response) {
            console.log('Sucesso', response)
            location.reload();
        },
        error: function (err) {
            showMessageError('Erro ao enviar os dados:', err);
            console.error('Erro ao enviar os dados:', err);
        },
    });
});


$('.excluir-btn').click(function () {
    const form = $(this);
    const idEntidade = form.data('id');

    // Envie a ação de excluir para a rota do servidor responsável por realizar a exclusão
    $.ajax({
        type: 'DELETE',
        url: `/excluir-entidade/${idEntidade}`,
        success: function (response) {
            console.log('Sucesso', response)
            location.reload();
        },
        error: function (xhr, status, error) {
            const response = JSON.parse(xhr.responseText);
            showMessageError(response.message);
            console.error('Erro ao excluir a entidade:', error);
        },
    });
});

$('.cadastrar').click(function (e) {
    e.preventDefault();
    if (!validateForm()) {
        showMessageError('Por favor, preencha todos os campos obrigatórios.');
        return;
    }

    const formData = {
        nome: $('#nome').val(),
        descricao: $('#descricao').val(),
        publico: $('#publico').val(),
        documentos: $('#documentos').val(),
        taxa: $('#taxa').val(),
    };

    // Envie os dados do formulário para a rota no servidor
    $.ajax({
        type: 'POST',
        url: '/cadastrar-entidade',
        data: formData,
        success: function (response) {
            console.log('Resposta BackEnd', response);
            location.reload();
        },
        error: function (response) {
            showMessageError(response.message)
            console.error('Erro ao cadastrar entidade:', response);
        },
    });
});

function validateForm() {
    const requiredFields = [
        'nome',
        'descricao',
        'publico',
        'documentos',
        'taxa',
    ];

    let valid = true;

    requiredFields.forEach(function (fieldName) {
        const fieldValue = $('#' + fieldName).val().trim();
        if (fieldValue === '') {
            valid = false;
            // Adiciona uma classe de erro ao campo vazio para destacá-lo
            $('#' + fieldName).addClass('is-invalid');
        } else {
            // Remove a classe de erro, caso tenha sido preenchido corretamente
            $('#' + fieldName).removeClass('is-invalid');
        }
    });
    return valid;
}