let etapaAtual = 1;
var quantidadeDependentes = 0;

let anexosObjeto = {};

var fileInput = document.querySelector('.file-input');
fileInput.removeAttribute('multiple');

let valorAnual = document.querySelector("#valorAnualBD").value;
let valorAnualCartao = document.querySelector("#valorAnualCartaoBD").value;
let valorAnualCartao3Vezes = document.querySelector("#valorAnualCartao3VezesBD").value;


function validarFormulario(etapa) {
  let form = document.getElementById(`formEtapa${etapa}`);
  let stage = document.getElementById(`number-${etapa}`)
  let stageNext = document.getElementById(`number-${etapa + 1}`)

  const attachmentRequiredElements = form.querySelectorAll('.attachment-required');
  if (attachmentRequiredElements.length > 0) {
      // Se houver, verificar se pelo menos um deles possui anexos
      let hasAttachments = false;
      attachmentRequiredElements.forEach(element => {
          const fileItems = element.querySelectorAll('.file-list');
          if (fileItems.length > 0) {
              hasAttachments = true;
          }
      });

      if (!hasAttachments) {
          exibirAlerta('É necessário pelo menos um anexo.');
          return false;
      }
  }

  if(etapa === 8) {
    if (form.checkValidity()) {
      document.getElementById(`formEtapa${etapa}`).style.display = "none";
      $('.stages').hide();
      $('.header').hide();
      etapaAtual = etapaAtual + 1;
      document.getElementById(`formEtapa${etapa + 1}`).style.display = "block";
      pegaDados();
    } else {
      form.reportValidity();
      return false;
    }
  } else {
    if (form.checkValidity()) {
      document.getElementById(`formEtapa${etapa}`).style.display = "none";
      stage.classList.remove('active');
      stageNext.classList.add('active');
      etapaAtual = etapaAtual + 1;
      document.getElementById(`formEtapa${etapa + 1}`).style.display = "block";
    } else {
      form.reportValidity();
      return false;
    }
  }
}

function pegaDados() {

  var dados = {};
  var dependentes = [];
  var inputs = {};

  if(quantidadeDependentes > 0){
    for(i = 1; i <= quantidadeDependentes; i++){
      let divDependente = document.querySelector(`[data-id="dependente-${i}"]`);
      let dependente = {};
      let inputs = divDependente.querySelectorAll('input, select');
      inputs.forEach(input => {
        dependente[input.name] = input.value;
      });
      dependentes.push(dependente);
    }
  }

  $('input, select, radio').each(function() {
    // Verifica se o input está dentro de um dependente
    if (!$(this).closest('.dependente').length) {
        var nome = $(this).attr('name');
        var valor = $(this).val();
        
        // Adiciona ao objeto inputs
        inputs[nome] = valor;
    }
  });

  dados['dependentes'] = dependentes;
  dados['anexos'] = anexosObjeto;
  dados['inputs'] = inputs;
  console.log(dados);
  var jsonDados = JSON.stringify(dados, null, 2);

  var blob = new Blob([jsonDados], {type: 'application/json'});
  var url = URL.createObjectURL(blob);
  
  var linkDownload = document.createElement('a');
  linkDownload.href = url;
  linkDownload.download = 'dados.json';
  linkDownload.click();
}

function voltar() {
  document.getElementById(`formEtapa${etapaAtual}`).style.display = "none";
  let stage = document.getElementById(`number-${etapaAtual}`)
  let stagePrev = document.getElementById(`number-${etapaAtual - 1}`)
  stage.classList.remove('active');
  stagePrev.classList.add('active');
  etapaAtual--;
  document.getElementById(`formEtapa${etapaAtual}`).style.display = "block";
}

function validarPagamento() {
  var pagamento = document.querySelector(
    'input[name="formaPagamento"]:checked'
  ).value;

  if (pagamento === "2" || pagamento === "3") {
    // Abre o modal para informações do cartão de crédito
    $("#modalCartaoCredito").modal("show");
  } else {
    // Para outras formas de pagamento, envia o formulário diretamente
    enviarFormulario();
  }
}

function enviarFormulario() {
  $("#modalCartaoCredito").modal("hide");
  document.getElementById("meuFormulario").submit();
}

$(document).on('change', 'input[name="file-input"]', function () {
  var formularioAtual = document.getElementById(`formEtapa${etapaAtual}`)
  upload(formularioAtual);
})

document.addEventListener("DOMContentLoaded", function () {
  document
    .getElementById("titularresponsavelfinanceiro")
    .addEventListener("change", handleTitularResponsavelChange);

  document
    .getElementById("possuidependentes")
    .addEventListener("change", handlePossuiDependentesChange);

  const cpfCorretorInput = document.getElementById("cpfcorretor");
  const btnBuscarCorretor = document.getElementById("btnBuscarCorretor");
  const corretoraSelect = document.getElementById("corretora");
  btnBuscarCorretor.addEventListener("click", () => {
    const cpfCorretor = cpfCorretorInput.value;
    if (cpfCorretor) {
      fetch(`/buscar-corretor?cpfcorretor=${cpfCorretor}`)
        .then((response) => {
          if (!response.ok) {
            throw new Error("Corretor não encontrado");
          }
          return response.json();
        })
        .then((data) => {
          // Preencher os campos do formulário com as informações retornadas do servidor
          document.getElementById("nomecorretor").value = data.nome || "";
          document.getElementById("celularcorretor").value =
            data.telefone || "";
          document.getElementById("idCorretor").value = data.idCorretor || "";

          const corretoraSelect = document.getElementById("corretora");
          const numeroDocumentoInput =
            document.getElementById("numeroDocumento");

          // Limpar opções existentes
          corretoraSelect.innerHTML = "";
          corretoraSelect.setAttribute("required", true);

          if (data.nomeProdutores && data.nomeProdutores.length > 0) {
            // Adicionar uma opção padrão
            const defaultOption = document.createElement("option");
            defaultOption.disabled = true;
            defaultOption.selected = true;
            defaultOption.required = true;
            defaultOption.text = "Selecione um produtor";
            corretoraSelect.add(defaultOption);

            // Iterar sobre os nomes do array e adicionar opções ao select
            data.nomeProdutores.forEach((produtor) => {
              const option = document.createElement("option");
              option.text = produtor.nome;
              option.value = produtor.numeroDocumento;
              corretoraSelect.add(option);
            });

            // Adicionar um ouvinte de evento change para atualizar o número do documento
            corretoraSelect.addEventListener("change", () => {
              const selectedOption =
                corretoraSelect.options[corretoraSelect.selectedIndex];
              numeroDocumentoInput.value = selectedOption.value;
            });
          } else {
            // Adicionar uma opção padrão caso não haja produtores
            const option = document.createElement("option");
            option.text = "Nenhum produtor encontrado";
            corretoraSelect.add(option);
          }
        })
        .catch((error) => {
          alert(error.message);
          console.error("Erro na requisição:", error);
        });
    }
  });

  const cepInput = document.getElementById("cep");
  const buscarCepBtn = document.getElementById("buscarCepBtn");
  const mensagemErroCep = document.getElementById("mensagemErroCep");

  buscarCepBtn.addEventListener("click", async function () {
    const cep = cepInput.value;

    try {
      const response = await fetch(`/buscar-cep?cep=${cep}`);
      const data = await response.json();

      if (response.ok) {
        mensagemErroCep.textContent = ""; // Limpa a mensagem de erro se houver
        atualizarCamposEndereco(data);
      } else {
        mensagemErroCep.textContent =
          "CEP não encontrado. Por favor, verifique e tente novamente.";
        limparCamposEndereco(); // Limpa os campos de endereço
      }
    } catch (error) {
      console.error("Erro na busca de CEP:", error.message);
    }
  });

  function atualizarCamposEndereco(data) {
    // Atualize os campos conforme necessário
    document.getElementById("enderecoresidencial").value =
      data.logradouro || "";
    document.getElementById("bairro").value = data.bairro || "";
    document.getElementById("cidade").value = data.localidade || "";
    document.getElementById("estado").value = data.uf || "";
  }

  function limparCamposEndereco() {
    // Limpa os campos de endereço
    document.getElementById("enderecoresidencial").value = "";
    document.getElementById("bairro").value = "";
    document.getElementById("cidade").value = "";
    document.getElementById("estado").value = "";
  }
});

function updateTabState() {
  var titularResponsavelSelect = document.getElementById(
    "titularresponsavelfinanceiro"
  );
  if (titularResponsavelSelect) {
    handleTitularResponsavelChange.call(titularResponsavelSelect);
  }
}

var nDependentes = document.querySelector(".nDependentes");

function clearFields(container) {
  var fields = container.querySelectorAll("input, select, textarea");
  fields.forEach(function (field) {
    if (field.type === "checkbox" || field.type === "radio") {
      field.checked = false; // Desmarca checkboxes e radios
    } else {
      field.value = ""; // Limpa outros tipos de campos
    }
  });
}

function handleTitularResponsavelChange() {
  var divTitularFinanceiro = `
        <h6 class="text-center"> Insira os dados do responsável Financeiro</h6>
        <p class="text-center"> A pessoa que serpa legalmente a responsável financeira
            na
            emissão do contrato</p>
        <div class="row">
            <div class="col-md-6">
                <div class="form-group">
                    <label for="cpffinanceiro">CPF:</label>
                    <input type="text" class="form-control required" id="cpffinanceiro" name="cpffinanceiro"
                        placeholder="Cpf titular financeiro" onblur="validarCPF(this)" required>
                    <span class="valid-feedback"></span>
                    <span class="invalid-feedback"></span>
                </div>
            </div>
            <div class="col-md-6">
                <div class="form-group">
                    <label for="nomefinanceiro">Nome Completo:</label>
                    <input type="text" class="form-control required" id="nomefinanceiro" name="nomefinanceiro"
                        placeholder="Nome Completo" required>
                </div>
            </div>
        </div>
        <div class="row">
            <div class="col-md-6">
                <div class="form-group">
                    <label for="datadenascimentofinanceiro">Data de Nascimento:</label>
                    <input type="date" class="form-control required" id="datadenascimentofinanceiro"
                        name="datadenascimentofinanceiro" placeholder="" required>
                </div>
            </div>
            <div class="col-md-6">
                <div class="form-group">
                    <label for="sexotitularfinanceiro">Sexo:</label>
                    <select class="form-control required" id="sexotitularfinanceiro" name="sexotitularfinanceiro" required>
                        <option disabled selected value="">Selecione ...</option>
                        <option value="masculino">Masculino</option>
                        <option value="feminino">Feminino</option>
                    </select>
                </div>
            </div>
        </div>
        <div class="row">
            <div class="col-md-6">
                <div class="form-group">
                    <label for="estadociviltitularfinanceiro">Estado Civil:</label>
                    <select class="form-control required" id="estadociviltitularfinanceiro"
                        name="estadociviltitularfinanceiro" required>
                        <option disabled selected value="">Selecione ...</option>
                        <option value="solteiro">Solteiro</option>
                        <option value="casado">Casado</option>
                        <option value="divorciado">Divorciado</option>
                        <option value="viúvo">Viúvo</option>
                        <option value="Outro">Outro</option>
                    </select>
                </div>
            </div>
            <div class="col-md-6">
                <div class="form-group">
                    <label for="telefonetitularfinanceiro">Telefone</label>
                    <input type="tel" class="form-control required" id="telefonetitularfinanceiro"
                        name="telefonetitularfinanceiro" placeholder="Telefone" required>
                </div>
            </div>
        </div>
        <div class="row">
            <div class="col-md-6">
                <div class="form-group">
                    <label for="emailtitularfinanceiro">Email</label>
                    <input type="email" class="form-control required" id="emailtitularfinanceiro"
                        name="emailtitularfinanceiro" placeholder="Email titular" required>
                </div>
            </div>
            <div class="col-md-6">
                <div class="form-group">
                    <label for="grauparentesco">Grau de Parentesco</label>
                    <select class="form-control required" id="grauparentesco" name="grauparentesco" required>
                        <option disabled selected value="">Selecione ...</option>
                        <option value="Conjugê">Conjugê</option>
                        <option value="Filho">Filho</option>
                        <option value="Mãe">Mãe</option>
                        <option value="Filha">Filha</option>
                        <option value="Enteado(a)">Enteado(a)</option>
                        <option value="Pai">Pai</option>
                        <option value="Irmão/Irmã">Irmão/Irmã</option>
                        <option value="Sogro/Sogra">Sogro/Sogra</option>
                        <option value="Bisavô/Bisavó">Bisavô/Bisavó</option>
                        <option value="Neto">Neto(a)</option>
                        <option value="Bisneto">Bisneto(a)</option>
                        <option value="Avô/Avó">Avô/Avó</option>
                        <option value="Padrasto/Madastra">Padrasto/Madastra</option>
                        <option value="Tio/Tia">Tio/Tia</option>
                        <option value="Sobrinho/Sobrinha">Sobrinho/Sobrinha</option>
                        <option value="Genro/Nora">Genro/Nora</option>
                        <option value="Cunhado/Cunhada">Cunhado/Cunhada</option>
                    </select>
                </div>
            </div>
        </div>
  `;

  var divNaoResponsavel = document.getElementById('Naoeresponsavel');
  var selectedOption = this.value;

  if (selectedOption === "Não") {
    divNaoResponsavel.innerHTML = divTitularFinanceiro;
  } else {
    divNaoResponsavel.innerHTML = ''
  }
}

function handlePossuiDependentesChange() {
  var selecionado = this.value;
  let divPrimeiroDependente = `
  <div class="dependente pl-3" data-id="dependente-1">
        <div class="row">
            <div class="col-md-4"></div>
            <div class="col-md-4"></div>
            <div class="col-md-4">
                <button class="btn btn-danger excluir-dependente"
                    onclick="handleExcluirDependenteClick(this)">Excluir
                    dependente</button>
            </div>
        </div>
        <div class="row">
            <div class="col-md-6">
                <div class="form-group">
                    <label for="cpfdependente">CPF:</label>
                    <input type="text" class="form-control required dependente-input" name="cpfdependente"
                        id="cpfdependente" rows="3" placeholder="CPF do dependente" onblur="validarCPF(this)" required>
                    <span class="valid-feedback"></span>
                    <span class="invalid-feedback"></span>
                </div>
            </div>
            <div class="col-md-6">
                <div class="form-group">
                    <label for="nomecompletodependente">Nome completo do
                        dependente:</label>
                    <input type="text" class="form-control dependente-input" name="nomecompletodependente"
                        placeholder="Nome completo do dependente" required>
                </div>
            </div>
        </div>
        <div class="row">
            <div class="col-md-6">
                <div class="form-group">
                    <label for="nomemaedependente">Nome da mãe do
                        dependente:</label>
                    <input type="text" class="form-control required dependente-input" name="nomemaedependente" rows="3"
                        placeholder="Nome da mãe do dependente" required>
                </div>
            </div>
            <div class="col-md-6">
                <div class="form-group">
                    <label for="nascimentodependente">Data de Nascimento
                        Dependente</label>
                    <input type="date" class="form-control dependente-input" name="nascimentodependente" required>
                </div>
            </div>
        </div>
        <div class="row">
            <div class="col-md-4">
                <div class="form-group">
                    <label for="sexodependente">Sexo:</label>
                    <select class="form-control dependente-input" name="sexodependente">
                        <option disabled selected value="">Selecione ...</option>
                        <option value="Masculino" required>Masculino</option>
                        <option value="Feminino">Feminino</option>
                    </select>
                </div>
            </div>
            <div class="col-md-4">
                <div class="form-group">
                    <label for="estadocivildependente">Estado Civil
                        Dependente:</label>
                    <select class="form-control dependente-input" name="estadocivildependente">
                        <option disabled selected value="">Selecione ...</option>
                        <option value="Casado">Casado(a)</option>
                        <option value="Divorciado">Divorciado(a)</option>
                        <option value="Separado">Separado(a)</option>
                        <option value="Solteiro">Solteiro(a)</option>
                        <option value="Viúvo">Viúvo (a)</option>
                    </select>
                </div>
            </div>
            <div class="col-md-4">
                <div class="form-group">
                    <label for="grauparentescodependente">Grau de
                        parentesco:</label>
                    <select class="form-control dependente-input" name="grauparentescodependente">
                        <option disabled selected value="">Selecione ...</option>
                        <option value="Agregado" required>Agregado</option>
                        <option value="Companheiro">Companheiro</option>
                        <option value="Cônjuge">Cônjuge</option>
                        <option value="Filho(a)">Filho(a)</option>
                        <option value="Filho Adotivo">Filho Adotivo</option>
                        <option value="Irmão(a)">Irmão(a)</option>
                        <option value="Mãe">Mãe</option>
                        <option value="Pai">Pai</option>
                        <option value="Neto(a)">Neto(a)</option>
                        <option value="Sobrinho(a)">Sobrinho(a)</option>
                        <option value="Sogro">Sogro</option>
                        <option value="Enteado">Enteado</option>
                        <option value="Tutelado">Tutelado</option>
                        <option value="Sogra">Sogra</option>
                        <option value="Genro">Genro</option>
                        <option value="Nora">Nora</option>
                        <option value="Cunhado(a)">Cunhado(a)</option>
                        <option value="Primo(a)">Primo(a)</option>
                        <option value="Avô">Avô</option>
                        <option value="Avó">Avó</option>
                        <option value="Tio">Tio</option>
                        <option value="Tia">Tia</option>
                        <option value="Bisneto">Bisneto</option>
                        <option value="Madrasta">Madrasta</option>
                        <option value="Padrasto">Padrasto</option>

                    </select>
                </div>
            </div>
        </div>
    </div>
  `
  var existeSim = document.getElementById("existeSim");
  var dependentes = document.querySelectorAll(".dependente");
  quantidadeDependentes = dependentes.length;
  var spanQtdDependentes = document.querySelector("#qtdDependentes");
  spanQtdDependentes.textContent = quantidadeDependentes;
  var botao = document.querySelector("#add-dependente");
  var spanValorAnual = document.querySelectorAll(".valorAnual");
  var spanValorAnaulCartao = document.querySelectorAll(".valorAnualCartao");
  var spanValorAnualCartao3Vezes = document.querySelectorAll(".valorAnualCartao3Vezes");

  if (selecionado === "Sim") {
    var multiplicador = quantidadeDependentes + 1;
    atualizarValores(spanValorAnual, valorAnual, multiplicador);
    atualizarValores(spanValorAnaulCartao, valorAnualCartao, multiplicador);
    atualizarValores(spanValorAnualCartao3Vezes, valorAnualCartao3Vezes, multiplicador);
    existeSim.innerHTML = divPrimeiroDependente;
    botao.style.display = "block";
    nDependentes.value = 1;
  } else {
    existeSim.innerHTML = '';
    botao.style.display = "none";
    nDependentes.value = 0;
    var multiplicador = 1;
    atualizarValores(spanValorAnual, valorAnual, multiplicador);
    atualizarValores(spanValorAnaulCartao, valorAnualCartao, multiplicador);
    atualizarValores(spanValorAnualCartao3Vezes, valorAnualCartao3Vezes, multiplicador);

    for (var i = 1; i < dependentes.length; i++) {
      dependentes[i].remove();
    }
  }
}

function atualizarValores(spans, valorInicial, multiplicador) {
  spans.forEach(function(span) { 
    var valorAtualizado = valorInicial * multiplicador; 
    span.textContent = valorAtualizado.toFixed(2); 
  });
}

function atualizarDataIdDependentes() {
  var dependentes = document.querySelectorAll(".dependente");
  quantidadeDependentes = dependentes.length;
  var spanQtdDependentes = document.querySelector("#qtdDependentes");
  spanQtdDependentes.textContent = quantidadeDependentes;
  var spanValorAnual = document.querySelectorAll(".valorAnual");
  var spanValorAnaulCartao = document.querySelectorAll(".valorAnualCartao");
  var spanValorAnualCartao3Vezes = document.querySelectorAll(".valorAnualCartao3Vezes");

  var multiplicador = quantidadeDependentes + 1;
  atualizarValores(spanValorAnual, valorAnual, multiplicador);
  atualizarValores(spanValorAnaulCartao, valorAnualCartao, multiplicador);
  atualizarValores(spanValorAnualCartao3Vezes, valorAnualCartao3Vezes, multiplicador);

  dependentes.forEach(function (dependente, index) {
    dependente.dataset.id = "dependente-" + (index + 1);

    dependente.querySelectorAll("input, select").forEach(function (element) {
      var id = element.id;
      element.id = id.replace(/dependente-\d+/, "dependente-" + (index + 1));
    });
  });
}

function handleAdicionarDependenteClick(event) {

  var totalDependentes = document.querySelectorAll(".dependente").length;
  var novoId = "dependente-" + (totalDependentes + 1);

  var clone = document.querySelector(".dependente:first-child").cloneNode(true);
  clone.dataset.id = novoId;

  clone.querySelectorAll("input, select").forEach(function (element) {
    var id = element.id;
    element.id = id.replace("dependente-1", novoId);
    if (element.tagName.toLowerCase() === "input") {
      element.value = "";
    }
  });

  clone.querySelector(".valid-feedback").style.display = "none";
  clone.querySelector(".invalid-feedback").style.display = "none";

  if (totalDependentes >= 1) {
    clone.querySelector(".excluir-dependente").style.display = "block";
  }

  var dependenteContainer = document.querySelector("#existeSim");
  dependenteContainer.appendChild(clone);

  atualizarDataIdDependentes();
}

function handleExcluirDependenteClick(element) {
  var dependente = element.closest(".dependente");
  var totalDependentes = document.querySelectorAll(".dependente").length;

  if (totalDependentes > 1) {
    dependente.remove();

    atualizarDataIdDependentes();
  }
}

function validarCPF(inputElement) {
  var cpfCampo = inputElement;
  var cpf = cpfCampo.value.replace(/\D/g, "");

  var validFeedback = cpfCampo.nextElementSibling
    ? cpfCampo.nextElementSibling
    : cpfCampo.nextSibling;
  var invalidFeedback = validFeedback.nextElementSibling
    ? validFeedback.nextElementSibling
    : validFeedback.nextSibling;

  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) {
    invalidFeedback.style.display = "inline";
    validFeedback.style.display = "none";
    return;
  }

  var soma = 0;
  for (var i = 0; i < 9; i++) {
    soma += parseInt(cpf.charAt(i)) * (10 - i);
  }

  var resto = 11 - (soma % 11);
  var digitoVerificador1 = resto === 10 || resto === 11 ? 0 : resto;

  soma = 0;
  for (var i = 0; i < 10; i++) {
    soma += parseInt(cpf.charAt(i)) * (11 - i);
  }

  resto = 11 - (soma % 11);
  var digitoVerificador2 = resto === 10 || resto === 11 ? 0 : resto;

  if (
    digitoVerificador1 !== parseInt(cpf.charAt(9)) ||
    digitoVerificador2 !== parseInt(cpf.charAt(10))
  ) {
    invalidFeedback.style.display = "inline";
    validFeedback.style.display = "none";
    return;
  }

  invalidFeedback.style.display = "none";
  validFeedback.style.display = "inline";
}

function showErrorMessage() {
  var errorMessageDiv = document.createElement("div");
  errorMessageDiv.id = "error-message";
  errorMessageDiv.style.color = "red";
  errorMessageDiv.innerHTML =
    '<span style="font-weight: bold; font-size: 16px;">⚠ Verifique: </span> os campos em vermelho são obrigatórios.';

  var botaoAcoesDiv = document.querySelector(".botaoAcoes");
  if (botaoAcoesDiv) {
    if (!document.getElementById("error-message")) {
      // Evita duplicar a mensagem de erro
      botaoAcoesDiv.parentNode.insertBefore(errorMessageDiv, botaoAcoesDiv);
    }
  }
}

function removeErrorMessage() {
  var errorMessage = document.getElementById("error-message");
  if (errorMessage) {
    errorMessage.parentNode.removeChild(errorMessage);
  }
}

$('input[name="formaPagamento"]').on('change', function() {
  var formaPagamentoSelecionada = $(this).val();
  if (formaPagamentoSelecionada === '2' || formaPagamentoSelecionada === '3') {
    $('.confirmacaoBoleto').hide();
    funcaoParaCartao();
  }
  if (formaPagamentoSelecionada === '1') {
    $('.confirmacaoBoleto').show()
  }
});

function funcaoParaCartao() {
  $('#modalCartaoCredito').modal('show');
}

function validarPagamento () {
  $('#modalCartaoCredito').hide()
  $('.modal-backdrop').hide()
  $('.confirmacaoPgtoCartao').show()
  $('input[name="formaPagamento"]').prop('disabled', true);

}

function upload(etapa) {

  let allowed_mime_types = [];
  let allowed_size_mb = 100;

  var files_input = etapa.querySelector('.file-input').files;

  if(files_input.lenght == 0) {
      exibirAlerta('Nenhum arquivo selecionado')
      return;
  }

  for(i = 0; i < files_input.length; i ++) {
      let file = files_input[i];

      if(file.size > allowed_size_mb * 1024 * 1024) {
          exibirAlerta('Erro: Limite de tamanho excedido => ' +file.name);
          return;
      }

      let uniq = 'id-' + btoa(file.name).replace(/=/g, '').substring(0, 7);
      let filetype = file.type.match(/([^\/]+)\//) / allowed_mime_types;

      let li = `
          <li class="file-list ${filetype[i]}" id="${uniq}" data-filename="${file.name}" data-file-name-back>
              <div class="thumbnail">
                  <ion-icon name="document-outline"></ion-icon>
                  <ion-icon name="image-outline"></ion-icon>
                  <ion-icon name="musical-notes-outline"></ion-icon>
                  <ion-icon name="videocam-outline"></ion-icon>
                  <span class="completed">
                      <ion-icon name="checkmark"></ion-icon>
                  </span>
              </div>
              <div class="properties">
                  <span class="title"><strong></strong></span>
                  <span class="size"></span>
                  <span class="progress">
                      <span class="buffer"></span>
                      <span class="percentage">0%</span>
                  </span>
              </div>
              <input type="hidden" value="" class="urlArchive">
              <input type="hidden" value="" class="nameBack">
              <button class="remove" onclick="remove(this)" type="button"">
                  <ion-icon name="close"></ion-icon>
              </button>
          </li>
          `;

      etapa.querySelector('.list-upload ul').innerHTML = li + etapa.querySelector('.list-upload ul').innerHTML;

      let li_el = etapa.querySelector('#' + uniq);

      let name = li_el.querySelector('.title strong');
      let size = li_el.querySelector('.size');

      name.innerHTML = file.name;
      size.innerHTML = bytesToSize(file.size);

      var data = new FormData();
      data.append('file', file);

      axios.post('/upload', data, {
          onUploadProgress: function(progressEvent) {
              let percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              li_el.querySelector('.buffer').style.width = percent + '%';
              li_el.querySelector('.percentage').innerHTML = percent + '%';
              

              if (progressEvent.loaded === progressEvent.total) {
                  li_el.querySelector('.completed').style.display = li_el.querySelector('.remove').style.display = 'flex';
              }
          }
      })
      .then(response => {
          const fileData = response.data.filepaths[0];
          li_el.querySelector('.nameBack').value = fileData.modifiedName;
          li_el.querySelector('.urlArchive').value = fileData.filepath;

          anexosObjeto[fileData.modifiedName] = fileData.filepath;
          console.log(anexosObjeto);
      })
      .catch(error => {
          console.error(error);
      });  
  }
}

function remove(button) {
  const li = button.closest('.file-list');
  const modifiedFileName = li.querySelector('.nameBack').value;
  axios.post('/remove', { removefile: modifiedFileName })
      .then(response => {
          if(anexosObjeto.hasOwnProperty(modifiedFileName)) {
              delete anexosObjeto[modifiedFileName]
          }
          li.remove();
      })
      .catch(error => console.error(error));
}


function exibirAlerta(mensagem) {
  mensagem = mensagem.replace(/\n/g, '<br>');
  document.getElementById("customAlertMessage").innerHTML = mensagem;
  document.getElementById("customAlert").style.display = "block";
  document.querySelector("#customAlert .btn-close").addEventListener("click", function() {
      // Oculta o alerta quando o botão de fechar é clicado
      document.getElementById("customAlert").style.display = "none";
  })
}

function bytesToSize(bytes) {
  const units = ['byte', "kilobyte", "megabyte", "terabyte", "petabyte"];
  const unit = Math.floor(Math.log(bytes) / Math.log(2014));
  return new Intl.NumberFormat('en', { style: "unit", unit: units[unit] }).format(bytes / 1024 ** unit);
}