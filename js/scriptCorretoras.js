$(document).ready(function () {
    // Mostra todas as linhas da tabela quando a página é carregada
    $("tbody tr").removeClass("d-none");

    // Função para lidar com a busca do corretor
    $("#searchCnpj").on("input", function () {
        var searchText = $(this).val().trim().toLowerCase();
        // Exibe somente os corretores que correspondem ao CPF digitado
        $("tbody tr").each(function () {
            var cnpj = $(this).find(".cnpj").text().trim().toLowerCase();
            if (cnpj.includes(searchText)) {
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
        var idCorretora = $row.data("id"); // Defina um atributo 'data-id' no <tr> com o ID do corretor
        var dadosAtualizados = {
            cnpj: $row.find(".edit-input:eq(0)").val(),
            razaoSocial: $row.find(".edit-input:eq(1)").val(),
            nomeFantasia: $row.find(".edit-input:eq(2)").val(),
        };

        // Enviar a requisição AJAX para atualizar os dados no servidor
        $.ajax({
            url: "/editCorretora/" + idCorretora,
            type: "POST",
            data: dadosAtualizados,
            success: function () {
                // Atualizar a tabela após a edição bem-sucedida
                location.reload();
            },
            error: function () {
                alert("Erro ao editar a corretora.");
            }
        });
    });

    $('.adicionar-corretora').on('click', function () {
        const newRow = `
          <tr>
            <td><input type="text" class="form-control new-cnpj" placeholder="CNPJ"></td>
            <td><input type="text" class="form-control new-razaoSocial" placeholder="Razão Social"></td>
            <td><input type="text" class="form-control new-nomeFantasia" placeholder="Nome Fantasia"></td>
            <td>
              <div class="d-flex justify-content-between">
                <button class="btn btn-success btn-save-new">Salvar</button>
                <button class="btn btn-secondary btn-cancel-new">Cancelar</button>
              </div>
            </td>
          </tr>
        `;
        $('tbody').prepend(newRow);
    });

    $(document).on('click', '.btn-save-new', function () {
        const newRow = $(this).closest('tr');
        const newCnpj = newRow.find('.new-cnpj').val();
        const newRazaoSocial = newRow.find('.new-razaoSocial').val();
        const newNomeFantasia = newRow.find('.new-nomeFantasia').val();

        $.ajax({
            type: 'POST',
            url: '/cadastrar-corretora',
            data: {
                cnpj: newCnpj,
                razaoSocial: newRazaoSocial,
                nomeFantasia: newNomeFantasia,
            },
            success: function (response) {
                // Aqui você pode lidar com a resposta do servidor, se necessário
                // Por exemplo, você pode atualizar a página para mostrar os dados atualizados após a inserção
                location.reload();
            },
            error: function (error) {
                // Aqui você pode lidar com erros, se ocorrer algum
                console.error('Erro ao cadastrar a corretora:', error);
            }
        });

        newRow.find('.edit-field').removeClass('d-none');
        newRow.find('.edit-input').addClass('d-none');
        newRow.find('.btn-edit').removeClass('d-none');
        newRow.find('.btn-save-new').addClass('d-none');
        newRow.find('.btn-cancel-new').addClass('d-none');
    });

    // Cancelar novo corretor
    $(document).on('click', '.btn-cancel-new', function () {
        $(this).closest('tr').remove();
    });

    // Excluir corretor
    $(document).on('click', '.btn-delete', function () {
        const row = $(this).closest('tr');
        const corretoraId = row.data('id');

        $.ajax({
            type: 'DELETE',
            url: `/corretoras/${corretoraId}`,
            success: function (response) {
                // Aqui você pode lidar com a resposta do servidor, se necessário
                // Por exemplo, você pode atualizar a página para mostrar os dados atualizados após a exclusão
                location.reload();
            },
            error: function (error) {
                // Aqui você pode lidar com erros, se ocorrer algum
                console.error('Erro ao excluir a corretora:', error);
            }
        });
    });


});