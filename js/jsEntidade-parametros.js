console.log('está rodando aqui')
$(document).ready(function () {
  // Função para carregar entidades e planos existentes
  function loadOptions() {
    console.log('Entrou aqui loadOptions')
    $.ajax({
      url: "/get-entidades",
      method: "GET",
      success: function (data) {
        console.log(data)
        $("#id_entidade").html("");
        data.entidades.forEach(function (entidade) {
          $("#id_entidade").append(
            new Option(entidade.nome, entidade.id)
          );
        });
      },
    });

      $('#id_entidade').on('change', function () {
        const selectedOption = $(this).find('option:selected');
        const nomeEntidade = selectedOption.text(); // Obtém o texto do option selecionado
        $('#nome_entidade').val(nomeEntidade); // Define o valor do input hidden
      });

    $.ajax({
      url: "/get-operadoras",
      method: "GET",
      success: function (data) {
        $("#id_operadora").html("");
        data.operadoras.forEach(function (operadora) {
          $("#id_operadora").append(new Option(operadora.nome, operadora.id));
        });
      },
    });
  }

  // Carregar dados na tabela
  function loadTable() {
    console.log('Entrou aqui loadTable')
    $.ajax({
      url: "/get-entidades-parametros",
      method: "GET",
      success: function (data) {
        const tbody = $("#entidades-parametros-table tbody");
        tbody.html("");
        data.forEach(function (parametro) {
          const tr = $("<tr></tr>");
          tr.append(`<td >${parametro.id_entidade}</td>`);
          tr.append(`<td>${parametro.nome_entidade}</td>`);
          tr.append(`<td>${parametro.forma_pagamento}</td>`);
          tr.append(`<td>${parametro.codigo_ds}</td>`);
          tr.append(`<td>${parametro.operadora}</td>`);
          tr.append(`
              <td>
                <button class="edit-btn btn btn-primary" data-id="${parametro.id}">Editar</button>
                <button class="delete-btn btn btn-secondary" data-id="${parametro.id}">Deletar</button>
              </td>
            `);
          tbody.append(tr);
        });
      },
    });
  }

  // Evento de submissão do formulário
  $("#entidade-parametros-form").on("submit", function (event) {
    event.preventDefault();

    const formData = $(this).serialize();

    $.ajax({
      url: "/cadastrar-entidade-parametro",
      method: "POST",
      data: formData,
      success: function (response) {
        alert("Cadastro realizado com sucesso!");
        loadTable();
      },
    });
  });

    // Evento para cancelar a edição
  $("#entidades-parametros-table").on("click", ".cancel-edit-btn", function () {
      $(this).closest(".edit-row").remove(); // Remove a linha de edição
  });

    // Adiciona os eventos ao botão de editar
    $("#entidades-parametros-table").on("click", ".edit-btn", function () {
      const id = $(this).data("id");
      const tr = $(this).closest("tr");
  
      // Verifica se já existe uma linha de edição e a remove
      if (tr.next().hasClass("edit-row")) {
          tr.next().remove();
          return;
      }
  
      // Remove qualquer outra linha de edição existente
      $(".edit-row").remove();
  
      // Faz as requisições para obter as entidades e operadoras
      $.when(
          $.ajax({ url: "/get-entidades", method: "GET" }),
          $.ajax({ url: "/get-operadoras", method: "GET" })
      ).done(function (entidadesData, operadorasData) {
          const entidades = entidadesData[0].entidades;
          const operadoras = operadorasData[0].operadoras;
  
          // Pega o ID da entidade e nome da operadora da linha atual
          const idEntidadeSelecionada = tr.find('td:eq(0)').text().trim();
          const nomeOperadoraSelecionada = tr.find('td:eq(4)').text().trim();
  
          // Cria a linha de edição com os campos preenchidos
          const editRow = $(`
              <tr class="edit-row">
                  <td colspan="6">
                      <div class="container">
                          <form id="edit-form-${id}">
                              <div class="row">
                                  <div class="col-md-2">
                                      <select name="id_entidade_edit" id="id_entidade_edit" class="form-select" required>
                                          ${entidades.map(entidade => `
                                              <option value="${entidade.id}" ${entidade.id == idEntidadeSelecionada ? 'selected' : ''}>
                                                  ${entidade.nome}
                                              </option>
                                          `).join('')}
                                      </select>
                                      <input type="hidden" id="nome_entidade_edit" name="nome_entidade_edit" value="${tr.find('td:eq(1)').text().trim()}">
                                  </div>
                                  <div class="col-md-2">
                                      <select name="id_operadora_edit" id="id_operadora_edit" class="form-select" required>
                                          ${operadoras.map(operadora => `
                                              <option value="${operadora.id}" ${operadora.nome.trim() == nomeOperadoraSelecionada ? 'selected' : ''}>
                                                  ${operadora.nome}
                                              </option>
                                          `).join('')}
                                      </select>
                                      <input type="hidden" id="nome_operadora_edit" name="nome_operadora_edit" value="${nomeOperadoraSelecionada}">
                                  </div>
                                  <div class="col-md-2">
                                    <select name="forma_pagamento_edit" id="forma_pagamento_edit" class="form-select">
                                        <option value="À vista" ${tr.find('td:eq(2)').text().trim() === 'À vista' ? 'selected' : ''}>À vista</option>
                                        <option value="Cartão Parcelado" ${tr.find('td:eq(2)').text().trim() === 'Cartão Parcelado' ? 'selected' : ''}>Cartão Parcelado</option>
                                        <option value="Cartão à vista" ${tr.find('td:eq(2)').text().trim() === 'Cartão à vista' ? 'selected' : ''}>Cartão à vista</option>
                                        <option value="Boleto à vista" ${tr.find('td:eq(2)').text().trim() === 'Boleto à vista' ? 'selected' : ''}>Boleto à vista</option>
                                        <option value="Boleto 2x" ${tr.find('td:eq(2)').text().trim() === 'Boleto 2x' ? 'selected' : ''}>Boleto 2x</option>
                                        <option value="Boleto 3x" ${tr.find('td:eq(2)').text().trim() === 'Boleto 3x' ? 'selected' : ''}>Boleto 3x</option>
                                        <option value="Boleto 4x" ${tr.find('td:eq(2)').text().trim() === 'Boleto 4x' ? 'selected' : ''}>Boleto 4x</option>
                                        <option value="Boleto 12x" ${tr.find('td:eq(2)').text().trim() === 'Boleto 12x' ? 'selected' : ''}>Boleto 12x</option>
                                        <option value="Boleto Parcelado" ${tr.find('td:eq(2)').text().trim() === 'Boleto Parcelado' ? 'selected' : ''}>Boleto Parcelado</option>
                                    </select>
                                  </div>

                                  <div class="col-md-2">
                                      <input type="text" name="codigo_ds_edit" id="codigo_ds_edit" class="form-control" value="${tr.find('td:eq(3)').text().trim()}" required>
                                  </div>
                                  <div class="col-md-2">
                                      <button type="button" class="btn btn-success save-edit-btn" data-id="${id}">Salvar</button>
                                      <button type="button" class="btn btn-danger cancel-edit-btn">Cancelar</button>
                                  </div>
                              </div>
                          </form>
                      </div>
                  </td>
              </tr>
          `);
  
          tr.after(editRow);
  
          // Atualiza os campos ocultos com o nome da entidade e operadora ao mudar a seleção
          $('#id_entidade_edit').on('change', function() {
              const selectedText = $(this).find("option:selected").text().trim();
              $('#nome_entidade_edit').val(selectedText);
          });
  
          $('#id_operadora_edit').on('change', function() {
              const selectedText = $(this).find("option:selected").text().trim();
              $('#nome_operadora_edit').val(selectedText);
          });
      });
  });
  
  // Adiciona o evento ao botão de salvar
  $("#entidades-parametros-table").on("click", ".save-edit-btn", function () {
      const id = $(this).data("id");
      const form = $(`#edit-form-${id}`);
  
      const formData = form.serialize();
      console.log(formData);
  
      $.ajax({
          url: `/editar-entidade-parametro/${id}`,
          method: "PUT",
          data: formData,
          success: function (response) {
              alert("Registro atualizado com sucesso!");
              loadTable();
          },
          error: function (error) {
              alert("Erro ao atualizar o registro.");
          }
      });
  });  
  

    
  // Evento para deletar entidade_parametro
  $("#entidades-parametros-table").on("click", ".delete-btn", function () {
    const id = $(this).data("id");
    console.log(id);

    if (confirm("Tem certeza que deseja deletar?")) {
      $.ajax({
        url: `/deletar-entidade-parametro/${id}`,
        method: "DELETE",
        success: function (response) {
          alert("Deletado com sucesso!");
          loadTable();
        },
      });
    }
  });

  // Inicializa carregando as opções e a tabela
  loadOptions();
  loadTable();
});
