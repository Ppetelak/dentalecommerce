$(document).ready(function () {
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

  $('.trPlanoInput').each(function () {
    const contratacaoSelected = $(this).find('[name="contratacaoValue"]').val();
    $(this).find('[name="contratacao"] option').each(function () {
        if ($(this).val() === contratacaoSelected) {
            $(this).prop('selected', true);
        }
    });
    const abrangenciaSelected = $(this).find('[name="abrangencia-value"]').val()
    $(this).find('[name="abrangencia"] option').each(function () {
        if ($(this).val() === abrangenciaSelected) {
            $(this).prop('selected', true);
        }
    });
    const cooparticipacaoSelected = $(this).find('[name="cooparticipacao-value"]').val()
    $(this).find('[name="coparticipacao"] option').each(function () {
        if ($(this).val() === cooparticipacaoSelected) {
            $(this).prop('selected', true);
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
      <div class="row">
        <div class="col-6">
          <label for="nome_do_plano">Nome do Plano:</label>
          <input type="text" class="form-control field-edit" value="" name="nome_do_plano" id="nome_do_plano">
        </div>
        <div class="col-6">
          <label for="ans">ANS</label>
          <input type="text" class="form-control field-edit" value="" name="ans" id="ans">
        </div>
      </div>
      <div class="row">
        <div class="col-6">
          <label for="logo">Logo</label>
          <img class="logo-preview form-control" src="" style="width: 50%;" data-name="logo" name="logo" id="logo">
          <button class="edit-image-btn btn btn-info" title="Editar Imagem" data-toggle="modal"
            data-target="#imagemModal" data-type="logo"><i class="bi bi-images"></i> EDITAR IMAGEM </button>
          </br>
        </div>
        <div class="col-6">
          <label for="banner">Banner</label>
          <img class="banner-preview form-control" src="" style="width: 50%;"
        data-name="banner" name="banner" id="banner">
          <button class="edit-image-btn btn btn-info" title="Editar Imagem" data-toggle="modal"
        data-target="#imagemModal" data-type="banner"><i class="bi bi-images"></i> EDITAR IMAGEM </button>
        </div>
      </div>
    </div>
    <div class="formasdepagamento">
      <h4 class="text-center">Formas de pagamento</h4>
      <div class="row">
        <div class="col-7">
          <label>Descrição</label>
        </div>
        <div class="col-3">
          <label>Valor</label>
        </div>
      </div>
      <div class="row pagamento">
        <div class="col-7">
          <input type="text" class="form-control field-edit" value="" name="formadePagamento">
        </div>
        <div class="col-3">
          <div class="input-group">
            <div class="input-group-prepend">
              <span class="input-group-text">R$</span>
            </div>
            <input type="number" class="form-control field-edit" value="" name="valorPagamento">
          </div>
        </div>
        <div class="col-2">
          <button class="btn btn-danger excluirPagamento" type="button">Remover</button>
        </div>
      </div>
      <button class="btn btn-secondary addPagamento" type="button">Adicionar Forma de Pgamento</button>
    </div>
    <div class="row">
      <div class="col-6">
        <div class="form-group">
          <label for="descricao">Descrição:</label>
          <textarea class="form-control" name="descricao" rows="16" id="descricao"></textarea>
        </div>
      </div>
      <div class="col-6">
        <div class="form-group">
          <label for="">Observações:</label>
          <textarea class="form-control" name="observacoes" rows="6" id="observacoes"></textarea>
        </div>
        <div class="form-group">
          <label for="contratacao">Contratação</label>
          <select class="form-control" name="contratacao" id="contratacao">
            <option disabled selected value="">Selecione</option>
            <option value="Adesão">Adesão</option>
            <option value="Outro">Outro</option>
          </select>
        </div>
        <div class="form-group">
          <label for="coparticipacao">Coparticipação</label>
          <select class="form-control" name="coparticipacao" id="coparticipacao">
            <option disabled selected value="">Selecione</option>
            <option value="Sim">Sim</option>
            <option value="Não">Não</option>
          </select>
        </div>
        <div class="form-group">
          <label for="abrangencia">Abrangência</label>
          <select class="form-control" name="abrangencia" id="abrangencia">
            <option disabled selected value="">Selecione</option>
            <option value="Nacional">Nacional</option>
            <option value="Regional">Regional</option>
          </select>
        </div>
      </div>
    </div>
    <div class="form-group">
      <button class="btn btn-primary btn-salvar" data-id="${novoId}">Salvar Plano</button>
      <button class="btn btn-secondary btn-cancelar" >Cancelar</button>
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
    trElement.remove();
    window.location.reload()
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
  let formasDePagamento = [];

  trElement.find('.pagamento').each(function () {
    const pagamentosData = {
      descricao: $(this).find('[name="formadePagamento"]').val(),
      valor: $(this).find('[name="valorPagamento"]').val()
    }
    formasDePagamento.push(pagamentosData)
  })

  let plano = {
    id: planoId,
    nome_do_plano: trElement.find("input[name=nome_do_plano]").val(),
    ans: trElement.find("input[name=ans]").val(),
    descricao: trElement.find("textarea[name=descricao]").val(),
    observacoes: trElement.find("textarea[name=observacoes]").val(),
    logoSrc: trElement.find(".logo-preview").attr("src"),
    bannerSrc: trElement.find(".banner-preview").attr("src"),
    contratacao: trElement.find("select[name=contratacao]").val(),
    coparticipacao: trElement.find("select[name=coparticipacao]").val(),
    abrangencia: trElement.find("select[name=abrangencia]").val(),
  }

  console.log(formasDePagamento)
  console.log(plano)

  $.ajax({
    url: '/atualiza-planos',
    type: 'POST',
    contentType: 'application/json', 
    data: JSON.stringify({ plano: plano , formasDePagamento: formasDePagamento }),
    success: function (response) {
      console.log(response.message)
      location.reload()
    },
    error: function (xhr, status, error) {
      showMessageError(error);
      console.error('Erro ao salvar os dados do plano:', status, error);
    },
  });
}

$(document).on('click', '.addPagamento', function () {
  const button = $(this);

  const novaLinha = `<div class="row pagamento">
  <div class="col-7">
    <input type="text" class="form-control field-edit" value="" name="formadePagamento">
  </div>
  <div class="col-3">
      <div class="input-group">
        <div class="input-group-prepend">
          <span class="input-group-text">R$</span>
        </div>
        <input type="number" class="form-control field-edit" value="" name="valorPagamento">
      </div>
    </div>
  <div class="col-2">
    <button class="btn btn-danger excluirPagamento" type="button">Remover</button>
  </div>
</div>`

  button.before(novaLinha);
});

$(document).on('click', '.excluirPagamento', function () {
  console.log('Clicou em cancelar excluir pagamento')
  const linhaRemovida = $(this).closest('.pagamento');
  linhaRemovida.remove();
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
  const alertSucess = getCookieValue('alertSuccess');
  showMessage(alertSucess);
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
  <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>`
  Mensagem.style.display = 'block';
}

function showMessageError(message) {
  const Mensagem = document.getElementById('MessageError')
  Mensagem.innerHTML = `ALERTA: ${decodeURIComponent(message)} 
  <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>`
  Mensagem.style.display = 'block';
}

