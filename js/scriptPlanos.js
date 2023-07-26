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

$(".btn-salvar").click(function () {
  const trElement = $(this).closest("tr");
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
      if (response.success) {
        //showMessage(response.message);
        console.log(response.message);
        location.reload(); // Atualizar a página após salvar os dados
      } else {
        //showMessageError(response.message);
        console.error(response.message);
      }
    },
    error: function (xhr, status, error) {
      //showMessageError(error);
      console.error('Erro ao salvar os dados do plano:', error);
    },
  });
});


