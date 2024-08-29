function mascaras() {
  $('[name="pgtoAnualCartao"]').mask('0000.00', { reverse: true });
  $('[name="pgtoAnualCartao3x"]').mask('0000.00', { reverse: true });
  $('[name="pgtoAnualAvista"]').mask('0000.00', { reverse: true });
}

document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.addPaymentMethodBtn').forEach(button => {
    button.addEventListener('click', function() {
      const planoId = this.getAttribute('data-plano-id');
      const form = document.querySelector(`.newPaymentMethodForm[data-plano-id="${planoId}"]`);
  
      if (form) {
        form.style.display = 'block'; // Exibe o formulário correspondente ao plano
      } else {
        console.error('Formulário de nova forma de pagamento não encontrado');
      }
    });
  });
  
  document.querySelectorAll('.savePaymentMethodBtn').forEach(button => {
    button.addEventListener('click', function() {
      const planoId = this.getAttribute('data-plano-id');
      const form = this.closest('.newPaymentMethodForm');
      savePaymentMethod(planoId, form);
    });
  });
});

document.querySelectorAll('.editPaymentMethodBtn').forEach(button => {
  button.addEventListener('click', function() {
      // Aqui você precisa capturar os dados da linha correspondente
      console.log('entrou aqui')
      const row = this.closest('tr');
      const form = document.querySelector(`.newPaymentMethodForm[data-plano-id="${row.getAttribute('data-plano-id')}"]`);
      const idForma = row.getAttribute('data-id'); // Supondo que você tenha o ID da forma de pagamento armazenado em um atributo data-id
      const paymentDescription = row.querySelector('.paymentDescription').textContent;
      const paymentType = row.querySelector('.paymentType').textContent;
      const minParcelValue = row.querySelector('.minParcelValue').textContent.replace('R$ ', '');
      const totalPaymentValue = row.querySelector('.totalPaymentValue').textContent.replace('R$ ', '');

      console.log(form);
      console.log(row);

      console.log({
        idForma,
        paymentDescription,
        paymentType,
        minParcelValue,
        totalPaymentValue
      })

      // Preencha o formulário com os dados para edição
      form.querySelector('[name="paymentDescription"]').value = paymentDescription;
      form.querySelector('[name="paymentType"]').value = paymentType;
      form.querySelector('[name="minParcelValue"]').value = minParcelValue;
      form.querySelector('[name="totalPaymentValue"]').value = totalPaymentValue;


      // Mostre o formulário de edição
      form.style.display = 'block';

      // Mude a função do botão "Salvar" para "Atualizar"
      const saveButton = form.querySelector('.savePaymentMethodBtn');
      const atualizarBtn = form.querySelector('.atualizarPaymentMethodBtn');
      saveButton.classList.add('d-none');
      atualizarBtn.classList.remove('d-none');
      atualizarBtn.addEventListener('click', function() {
          console.log('Entrou aqui');
          updatePaymentMethod(idForma, form);
      });
  });
})

function savePaymentMethod(idPlano, form) {
  const paymentDescription = form.querySelector('[name="paymentDescription"]').value;
  const paymentType = form.querySelector('[name="paymentType"]').value;
  const minParcelValue = form.querySelector('[name="minParcelValue"]').value;
  const totalPaymentValue = form.querySelector('[name="totalPaymentValue"]').value;

  fetch(`/planos/${idPlano}/forma-pagamento`, {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json'
      },
      body: JSON.stringify({
          paymentDescription,
          paymentType,
          minParcelValue,
          totalPaymentValue
      })
  })
  .then(response => response.json())
  .then(data => {
      if (data.message) {
          alert(data.message);
          form.style.display = 'none';
          location.reload();
          //loadPaymentMethods(idPlano)
      }
  })
  .catch(error => console.error('Erro ao salvar forma de pagamento:', error));
}


function updatePaymentMethod(idForma, form) {
  console.log('Entrou na função update e o form recebido foi esse ai')
  console.log(form);
  const idPlano = form.querySelector('.idDoPlano').value;
  const paymentDescription = form.querySelector('[name="paymentDescription"]').value;
  const paymentType = form.querySelector('[name="paymentType"]').value;
  const minParcelValue = form.querySelector('[name="minParcelValue"]').value;
  const totalPaymentValue = form.querySelector('[name="totalPaymentValue"]').value;

  console.log({
    'Id forma de Pagamento ': idForma,
    'Id Plano ': idPlano,
    'Descrição do pagamento ': paymentDescription,
    'Tipo de Pagamento ': paymentType,
    'Valor de parcela mínima ': minParcelValue,
    'Valor total ' : totalPaymentValue
  })

  fetch(`/planos/${idPlano}/forma-pagamento/${idForma}`, {
      method: 'PUT',
      headers: {
          'Content-Type': 'application/json'
      },
      body: JSON.stringify({
          paymentDescription,
          paymentType,
          minParcelValue,
          totalPaymentValue
      })
  })
  .then(response => response.json())
  .then(data => {
      if (data.message) {
          alert(data.message);
          location.reload(); // Simplesmente recarrega a página para ver as atualizações
          //loadPaymentMethods(idPlano);
      }
  })
  .catch(error => console.error('Erro ao atualizar forma de pagamento:', error));
}

document.querySelectorAll('.deletePaymentMethodBtn').forEach(button => {
  button.addEventListener('click', function() {
      if (!confirm('Tem certeza de que deseja excluir esta forma de pagamento?')) return;

      const row = this.closest('tr');
      const idForma = row.getAttribute('data-id');
      const idPlano = row.getAttribute('data-plano-id');

      fetch(`/planos/${idPlano}/forma-pagamento/${idForma}`, {
          method: 'DELETE'
      })
      .then(response => response.json())
      .then(data => {
          if (data.message) {
              alert(data.message);
              location.reload()
              //loadPaymentMethods(idPlano); //Atualiza a tabela de formas de pagamento
          }
      })
      .catch(error => console.error('Erro ao excluir forma de pagamento:', error));
  });
});

/* function loadPaymentMethods(idPlano) {
  fetch(`/planos/${idPlano}/formas-pagamento`)
      .then(response => response.json())
      .then(formasDePagamento => {
          const tableBody = document.querySelector('.table-responsive table tbody');

          // Se não houver um <tbody>, cria um novo
          if (!tableBody) {
              const newTbody = document.createElement('tbody');
              document.querySelector('.table-responsive table').appendChild(newTbody);
              tableBody = newTbody;
          }

          // Itera sobre as formas de pagamento recebidas do servidor
          formasDePagamento.forEach(pagamento => {
              // Verifica se já existe uma linha com o mesmo data-id
              const existingRow = tableBody.querySelector(`tr[data-id="${pagamento.id}"]`);

              // Se a linha já existir, não faz nada
              if (existingRow) return;

              // Cria uma nova linha se não existir
              const row = document.createElement('tr');
              row.setAttribute('data-id', pagamento.id);

              row.innerHTML = `
                  <td class="paymentDescription">${pagamento.descricao}</td>
                  <td class="paymentType">${pagamento.parametrizacao}</td>
                  <td class="minParcelValue">R$ ${parseFloat(pagamento.valor_parcela_minima).toFixed(2)}</td>
                  <td class="totalPaymentValue">R$ ${parseFloat(pagamento.valor_total_pgto).toFixed(2)}</td>
                  <td>
                      <button type="button" class="btn btn-warning btn-sm editPaymentMethodBtn">Editar</button>
                      <button type="button" class="btn btn-danger btn-sm deletePaymentMethodBtn">Excluir</button>
                  </td>
              `;

              tableBody.appendChild(row);
          });

          attachEventHandlers(); // Reatacha os eventos de clique para os botões
      })
      .catch(error => console.error('Erro ao carregar formas de pagamento:', error));
} */


function attachEventHandlers() {
  document.querySelectorAll('.editPaymentMethodBtn').forEach(button => {
      button.addEventListener('click', function() {
          const row = this.closest('tr');
          const idForma = row.getAttribute('data-id');
          const paymentDescription = row.querySelector('.paymentDescription').textContent;
          const paymentType = row.querySelector('.paymentType').textContent;
          const minParcelValue = row.querySelector('.minParcelValue').textContent.replace('R$ ', '');
          const totalPaymentValue = row.querySelector('.totalPaymentValue').textContent.replace('R$ ', '');

          document.getElementById('paymentDescription').value = paymentDescription;
          document.getElementById('paymentType').value = paymentType;
          document.getElementById('minParcelValue').value = minParcelValue;
          document.getElementById('totalPaymentValue').value = totalPaymentValue;

          document.getElementById('savePaymentMethodBtn').textContent = 'Atualizar';
          document.getElementById('savePaymentMethodBtn').removeEventListener('click', savePaymentMethod);
          document.getElementById('savePaymentMethodBtn').addEventListener('click', function() {
              updatePaymentMethod(idForma);
          });
      });
  });
}


$(document).ready(function () {
  // Selecionar todos os botões de editar
  mascaras();
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
    const reajusteSelected = $(this).find('[name="reajusteValue"]').val()
    $(this).find('[name="reajuste"] option').each(function () {
        if ($(this).val() === reajusteSelected) {
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
          <label><strong>Descrição</strong></label>
        </div>
        <div class="col-3">
          <label><strong>Valor</strong></label>
        </div>
      </div>
      <div class="row pagamento">
                    <div class="row">
                      <div class="col-7">
                        <label for="pgtoAnualAvista"> Valor anual á vista <span> (Válido para pgto no boleto, pix ou cartão de crédito)</span>  </label> 
                      </div>
                      <div class="col-3">
                        <div class="input-group">
                          <span class="input-group-text">R$</span>
                          <input type="text" class="form-control" id="pgtoAnualAvista" name="pgtoAnualAvista"
                              value="" required>
                        </div>
                      </div>
                    </div>
                    <div class="row">
                      <div class="col-7">
                        <label for="pgtoAnualCartao"> Valor anual no cartão de crédito <span>(em até 12x)</span> </label>   
                      </div>
                      <div class="col-3">
                        <div class="input-group">
                          <span class="input-group-text">R$</span>
                          <input type="text" class="form-control" id="pgtoAnualCartao" name="pgtoAnualCartao"
                              value="" required>
                        </div>
                      </div>
                    </div>
                    <div class="row">
                      <div class="col-7">
                        <label for="pgtoAnualCartao3x"> Valor anual no cartão de crédito <span>(em até 12x)</span> </label>   
                      </div>
                      <div class="col-3">
                        <div class="input-group">
                          <span class="input-group-text">R$</span>
                          <input type="text" class="form-control" id="pgtoAnualCartao3x" name="pgtoAnualCartao3x"
                              value="" required>
                        </div>
                      </div>
                    </div>

                  </div>
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
          <textarea class="form-control" name="observacoes" rows="4" id="observacoes"></textarea>
        </div>
        <div class="form-group">
                      <label for="reajuste">Mês de Reajuste</label>
                      <select class="form-control" name="reajuste" id="reajuste">
                        <option disabled selected value="">Selecione</option>
                        <option value="Janeiro">Janeiro</option>
                        <option value="Fevereiro">Fevereiro</option>
                        <option value="Março">Março</option>
                        <option value="Abril">Abril</option>
                        <option value="Maio">Maio</option>
                        <option value="Junho">Junho</option>
                        <option value="Julho">Julho</option>
                        <option value="Agosto">Agosto</option>
                        <option value="Setembro">Setembro</option>
                        <option value="Outubro">Outubro</option>
                        <option value="Novembro">Novembro</option>
                        <option value="Dezembro">Dezembro</option>
                      </select>
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
            <option value="Grupo de Estados">Grupo de Estados</option>
            <option value="Grupo de Municípios">Grupo de Municípios</option>
            <option value="Municipal">Municipal</option>
          </select>
        </div>
        <div class="form-group">
          <label for="areaatuacao">Abrangência</label>
          <input type="text" name="areaatuacao" class="form-control">
        </div>
      </div>
    </div>
    <div class="row">
      <h1>Parametrização com Digital Saúde</h1>
      <div class="col-md-6">
        <div class="form-group">
          <label for="numeroConvenio"> Número de Convênio</label>
          <input name="numeroConvenio" id="numeroConvenio" class="numeroConvenio form-control" value="">
        </div>
      </div>
      <div class="col-md-6">
        <div class="form-group">
          <label for="codigoPlanoDS"> Código do Plano</label>
          <input name="codigoPlanoDS" id="codigoPlanoDS" class="codigoPlanoDS form-control" value="">
        </div>
      </div>
    </div>
    <div class="row">
    <h1>Informações da Operadora</h1>
    <div class="col-md-6">
      <div class="form-group">
        <label for="ansOperadora"> Nº ANS Operadora</label>
        <input name="ansOperadora" id="ansOperadora" class="ansOperadora form-control">
      </div>
    </div>
    <div class="col-md-6">
      <div class="form-group">
        <label for="siteOperadora"> Site Operadora</label>
        <input name="siteOperadora" id="siteOperadora" class="siteOperadora form-control">
      </div>
    </div>
    <div class="col-md-6">
      <div class="form-group">
        <label for="telefoneOperadora"> Telefone Operadora</label>
        <input name="telefoneOperadora" id="telefoneOperadora" class="telefoneOperadora form-control">
      </div>
    </div>
    <div class="col-md-6">
      <div class="form-group">
        <label for="cnpjOperadora"> CNPJ Operadora</label>
        <input name="cnpjOperadora" id="cnpjOperadora" class="cnpjOperadora form-control">
      </div>
    </div>
    <div class="col-md-6">
      <div class="form-group">
        <label for="razaoSocialOperadora"> Razão Social Operadora</label>
        <input name="razaoSocialOperadora" id="razaoSocialOperadora" class="razaoSocialOperadora form-control">
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
  mascaras();
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
    pgtoAnualAvista: trElement.find("input[name=pgtoAnualAvista]").val(),
    pgtoAnualCartao: trElement.find("input[name=pgtoAnualCartao]").val(),
    pgtoAnualCartao3x: trElement.find("input[name=pgtoAnualCartao3x]").val(),
    reajuste: trElement.find("select[name=reajuste]").val(),
    numeroConvenio: trElement.find("input[name='numeroConvenio']").val(),
    codigoPlanoDS: trElement.find("input[name='codigoPlanoDS']").val(),
    areaatuacao: trElement.find("input[name='areaatuacao']").val(),
    ansOperadora: trElement.find("input[name='ansOperadora']").val(),
    siteOperadora: trElement.find("input[name='siteOperadora']").val(),
    telefoneOperadora: trElement.find("input[name='telefoneOperadora']").val(),
    cnpjOperadora: trElement.find("input[name='cnpjOperadora']").val(),
    razaoSocialOperadora: trElement.find("input[name='razaoSocialOperadora']").val()
  }

  console.log(plano)

  $.ajax({
    url: '/atualiza-planos',
    type: 'POST',
    contentType: 'application/json', 
    data: JSON.stringify({ plano: plano }),
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
  <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>`
  Mensagem.style.display = 'block';
}

function showMessageError(message) {
  const Mensagem = document.getElementById('MessageError')
  Mensagem.innerHTML = `ALERTA: ${decodeURIComponent(message)} 
  <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>`
  Mensagem.style.display = 'block';
}

