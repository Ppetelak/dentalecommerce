$(document).ready(function () {
    // Mostra todas as linhas da tabela quando a página é carregada
    //$("tbody tr").removeClass("d-none");

    // Função para lidar com a busca do corretor
    $("#searchCpf").on("input", function () {
        var searchText = $(this).val().trim().toLowerCase();
        // Exibe somente os corretores que correspondem ao CPF digitado
        $("tbody tr").each(function () {
            var cpf = $(this).find(".cpf").text().trim().toLowerCase();
            if (cpf.includes(searchText)) {
                $(this).removeClass("d-none"); // Exibe o elemento
            } else {
                $(this).addClass("d-none"); // Oculta o elemento
            }
        });
    });
    // Botão "Editar" - Alterna entre campos de texto e inputs editáveis
    $(".btn-edit").on("click", function () {
        var $row = $(this).closest("tr");
        $row.find(".edit-field").addClass("d-none");
        $row.find(".edit-input").removeClass("d-none");
        $row.find(".btn-edit").addClass("d-none");
        $row.find(".btn-save").removeClass("d-none");
        $row.find(".btn-cancel").removeClass("d-none");
        var corretoraId = $row.data("operadora-id");
        $row.find("select.edit-input").val(corretoraId);
    });

    // Botão "Cancelar" - Reverte para os campos de texto originais
    $(".btn-cancel").on("click", function () {
        var $row = $(this).closest("tr");
        $row.find(".edit-input").addClass("d-none");
        $row.find(".edit-field").removeClass("d-none");
        $row.find(".btn-edit").removeClass("d-none");
        $row.find(".btn-save").addClass("d-none");
        $row.find(".btn-cancel").addClass("d-none");
    });

    // Botão "Salvar" - Envia os novos dados para o servidor e atualiza a tabela
    $(".btn-save").on("click", function () {
        var $row = $(this).closest("tr");
        var idCorretor = $row.data("id"); // Defina um atributo 'data-id' no <tr> com o ID do corretor
        var dadosAtualizados = {
            cpf: $row.find(".edit-input:eq(0)").val(),
            nome: $row.find(".edit-input:eq(1)").val(),
            telefone: $row.find(".edit-input:eq(2)").val(),
            email: $row.find(".edit-input:eq(3)").val(),
            corretora: $row.find("select.edit-input").val()
        };

        // Enviar a requisição AJAX para atualizar os dados no servidor
        $.ajax({
            url: "/edit/" + idCorretor,
            type: "POST",
            data: dadosAtualizados,
            success: function () {
                // Atualizar a tabela após a edição bem-sucedida
                location.reload();
            },
            error: function () {
                alert("Erro ao editar o corretor.");
            }
        });
    });

    $(document).on('click', '.btn-save-new', function () {
        const newRow = $(this).closest('tr');
        const newCpf = newRow.find('.new-cpf').val();
        const newNome = newRow.find('.new-nome').val();
        const newTelefone = newRow.find('.new-telefone').val();
        const newEmail = newRow.find('.new-email').val();
        const newCorretora = newRow.find('.new-corretora').val();

        $.ajax({
            type: 'POST',
            url: '/cadastrar-corretor',
            data: {
                cpf: newCpf,
                nome: newNome,
                telefone: newTelefone,
                email: newEmail,
                corretora: newCorretora
            },
            success: function (response) {
                // Aqui você pode lidar com a resposta do servidor, se necessário
                // Por exemplo, você pode atualizar a página para mostrar os dados atualizados após a inserção
                location.reload();
            },
            error: function (error) {
                // Aqui você pode lidar com erros, se ocorrer algum
                console.error('Erro ao cadastrar o corretor:', error);
            }
        });

        newRow.find('.edit-field').removeClass('d-none');
        newRow.find('.edit-input').addClass('d-none');
        newRow.find('.btn-edit').removeClass('d-none');
        newRow.find('.btn-save-new').addClass('d-none');
        newRow.find('.btn-cancel-new').addClass('d-none');
    });

    $('.adicionar-corretor').on('click', function () {
        const newRow = document.querySelector('.new-corretor');
        newRow.classList.remove("d-none")
    });

    // Cancelar novo corretor
    $(document).on('click', '.btn-cancel-new', function () {
        $(this).closest('tr').remove();
    });

    // Excluir corretor
    $(document).on('click', '.btn-delete', function () {
        const row = $(this).closest('tr');
        const corretorId = row.data('id');

        $.ajax({
            type: 'DELETE',
            url: `/corretores/${corretorId}`,
            success: function (response) {
                // Aqui você pode lidar com a resposta do servidor, se necessário
                // Por exemplo, você pode atualizar a página para mostrar os dados atualizados após a exclusão
                location.reload();
            },
            error: function (error) {
                // Aqui você pode lidar com erros, se ocorrer algum
                console.error('Erro ao excluir o corretor:', error);
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
