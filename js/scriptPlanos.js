$(document).ready(function () {
  console.log('Apareceu algo')
  // Selecionar todos os botões de editar
  const btnEditar = document.querySelectorAll('.btn-editar');

  // Adicionar o evento de clique em cada botão de editar
  btnEditar.forEach(btn => {
    btn.addEventListener('click', () => {
      // Encontrar a linha da tabela associada ao botão de editar clicado
      const row = btn.closest('.plan-row');
      // Alternar a visibilidade entre os campos não editáveis e os inputs editáveis
      const fieldEdits = row.querySelectorAll('.field-edit');
      fieldEdits.forEach(edit => edit.classList.toggle('d-none'));

      // Exibir os campos adicionais editáveis abaixo da linha atual
      const fieldRow = row.nextElementSibling;
      fieldRow.classList.toggle('d-none');

      // Alterar o texto do botão de editar para "Cancelar" quando estiver no modo de edição
      if (btn.textContent === 'Editar') {
        btn.textContent = 'Cancelar';
      } else {
        btn.textContent = 'Editar';
      }
    });
  });

  $(".edit-image-btn").click(function () {

    const dataName = $(this).data('type');

    // Definir o id do plano no modal (para identificar qual imagem está sendo selecionada)
    $("#imagemModal").data("dataName", dataName).modal('show');
  });

  $(".image-selection").click(function () {
    const imageSrc = $(this).data("src");

    const dataName = $("#imagemModal").data("dataName")

    $(`.${dataName}-preview`).attr("src", `/arquivos/${imageSrc}`);

    $("#imagemModal").modal("hide");
  });
});

$('#addPlano').click(function () {
  console.log('clicou em adicionar plano');
  const trPlanoExistente = document.querySelectorAll('tr.trPlanoInput');
  const ultimoTr = trPlanoExistente[trPlanoExistente.length - 1];
  const dataIdValue = parseInt(ultimoTr.getAttribute('data-id'));
  const novoId = dataIdValue + 1;

  const novoTrHTML = 
  `
    <tr class="field-row trPlanoInput" data-id="${novoId}">
      <td colspan="4">
        <div class="form-group">
          <strong>Nome do Plano</strong>
          <input type="text" class="form-control field-edit" value="" name="nome_do_plano">
          <strong>ANS</strong>
          <input type="text" class="form-control field-edit" value="" name="ans">
          <strong>Logo</strong>
          <img class="logo-preview form-control" src="" style="width: 10%;" data-name="logo" name="logo">
          <button class="edit-image-btn btn btn-info" title="Editar Imagem" data-toggle="modal"
            data-target="#imagemModal" data-type="logo"><i class="bi bi-images"></i> EDITAR IMAGEM </button>
          </br>
          <strong>Banner</strong>
          <img class="banner-preview form-control" src="" style="width: 10%;"
            data-name="banner" name="banner">
          <button class="edit-image-btn btn btn-info" title="Editar Imagem" data-toggle="modal"
            data-target="#imagemModal" data-type="banner"><i class="bi bi-images"></i> EDITAR IMAGEM </button>
        </div>
        <div class="form-group row">
          <div class="col-md-4">
            <strong>Pagamento 1:</strong>
            <input type="text" class="form-control" name="forma_pagamento1" value="">
          </div>
          <div class="col-md-4">
            <strong>Pagamento 2:</strong>
            <input type="text" class="form-control" name="forma_pagamento2" value="">
          </div>
          <div class="col-md-4">
            <strong>Pagamento 3:</strong>
            <input type="text" class="form-control" name="forma_pagamento3" value="">
          </div>
        </div>
        <div class="form-group row">
          <div class="col-md-4">
            <strong>Valor Pagamento 1:</strong>
            <input type="text" class="form-control" name="valor_pagamento1" value="">
          </div>
          <div class="col-md-4">
            <strong>Valor Pagamento 2:</strong>
            <input type="text" class="form-control" name="valor_pagamento2" value="">
          </div>
          <div class="col-md-4">
            <strong>Valor Pagamento 3:</strong>
            <input type="text" class="form-control" name="valor_pagamento3" value="">
          </div>
        </div>
        <div class="form-group">
          <strong>Descrição:</strong>
          <textarea class="form-control" name="descricao" rows="6"></textarea>
        </div>
        <div class="form-group">
          <strong>Observações:</strong>
          <textarea class="form-control" name="observacoes" rows="3"></textarea>
        </div>
        <div class="form-group">
          <button class="btn btn-primary btn-salvar" data-id="${novoId}">Salvar</button>
          <button class="btn btn-secondary btn-cancelar" data-id="${novoId}">Cancelar</button>
        </div>
      </td>
    </tr>
  `;

  const tbody = document.querySelector('tbody');
  // Adiciona o novoTrHTML ao <tbody> da tabela existente
  tbody.innerHTML += novoTrHTML;
  $(".btn-salvar").click(function () {
    const trElement = $(this).closest("tr");
    salvarPlano(trElement);
  }); 
  $(".edit-image-btn").click(function () {

    const dataName = $(this).data('type');

    // Definir o id do plano no modal (para identificar qual imagem está sendo selecionada)
    $("#imagemModal").data("dataName", dataName).modal('show');
  });

  $(".image-selection").click(function () {
    const imageSrc = $(this).data("src");

    const dataName = $("#imagemModal").data("dataName")

    $(`.${dataName}-preview`).attr("src", `/arquivos/${imageSrc}`);

    $("#imagemModal").modal("hide");
  });
  $(".btn-cancelar").click(function () {
    const trElement = $(this).closest("tr");
    trElement.remove(); // Remove a linha quando o botão "Cancelar" é clicado
  });
});

$(".btn-excluir").click(function () {
  const idPlano = $(this).data('id')
  const confirmacao = confirm("Tem certeza que deseja excluir o Plano?")
  if(confirmacao){
    $.ajax ({
      url: '/deleta-plano',
      type:'POST',
      data: {id: idPlano},
      success: function(response) {
        console.log(response.message)
        location.reload()
      },
      error: function(response){
        console.log(response.message)
      }
    })
  } else {
    console.log('Operação de exclusão cancelada')
  }
})


$(".btn-salvar").click(function () {
  const trElement = $(this).closest("tr");
  salvarPlano(trElement);
});


function salvarPlano(trElement) {
  const planoId = trElement.data("id");

  const nome_do_plano = trElement.find("input[name=nome_do_plano]").val();
  const ans = trElement.find("input[name=ans]").val();
  const forma_pagamento1 = trElement.find("input[name=forma_pagamento1]").val();
  const forma_pagamento2 = trElement.find("input[name=forma_pagamento2]").val();
  const forma_pagamento3 = trElement.find("input[name=forma_pagamento3]").val();
  const valor_pagamento1 = trElement.find("input[name=valor_pagamento1]").val();
  const valor_pagamento2 = trElement.find("input[name=valor_pagamento2]").val();
  const valor_pagamento3 = trElement.find("input[name=valor_pagamento3]").val();
  const descricao = trElement.find("textarea[name=descricao]").val();
  const observacoes = trElement.find("textarea[name=observacoes]").val();
  const logoSrc = trElement.find(".logo-preview").attr("src");
  const bannerSrc = trElement.find(".banner-preview").attr("src");


  $.ajax({
    url: '/atualiza-planos',
    type: 'POST',
    data: {
      id: planoId,
      nome_do_plano,
      ans,
      forma_pagamento1,
      forma_pagamento2,
      forma_pagamento3,
      valor_pagamento1,
      valor_pagamento2,
      valor_pagamento3,
      descricao,
      observacoes,
      logo: logoSrc,
      banner: bannerSrc,
    },
    success: function (response) {
      console.log(response.message)
      location.reload()
    },
    error: function (xhr, status, error) {
      //showMessageError(error);
      console.error('Erro ao salvar os dados do plano:', status, error);
    },
  });
}