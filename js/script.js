let etapaAtual = 1;

function validarFormulario(etapa) {
  let form = document.getElementById(`formEtapa${etapa}`);

  if (form.checkValidity()) {
    document.getElementById(`formEtapa${etapa}`).style.display = "none";
    etapaAtual = etapaAtual + 1;
    document.getElementById(`formEtapa${etapa + 1}`).style.display = "block";
  } else {
    form.reportValidity();
    return false;
  }
}

function handleTitularResponsavelChange() {
  var selectedOption = this.value;
  var naoEResponsavel = document.getElementById("Naoeresponsavel");
  var tabTwo = document.getElementById("pills-step2");

  if (selectedOption === "Não") {
    naoEResponsavel.style.display = "block";
    addEventListenersToFields();
    validateRequiredFields();
  } else {
    console.log("entrou no else");
    naoEResponsavel.style.display = "none";
    clearFields(naoEResponsavel);
    tabTwo.querySelector(".next").disabled = false;
  }
}

function voltar() {
  document.getElementById(`formEtapa${etapaAtual}`).style.display = "none";
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

document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".next").forEach(function (element) {
    element.addEventListener("click", handleNextClick);
  });

  document.querySelectorAll(".prev").forEach(function (element) {
    element.addEventListener("click", handlePrevClick);
  });

  document
    .getElementById("titularresponsavelfinanceiro")
    .addEventListener("change", handleTitularResponsavelChange);

  document
    .getElementById("possuidependentes")
    .addEventListener("change", handlePossuiDependentesChange);

  document
    .querySelector(".adicionar-dependente")
    .addEventListener("click", handleAdicionarDependenteClick);

  document.addEventListener("click", function (event) {
    if (event.target.classList.contains("excluir-dependente")) {
      handleExcluirDependenteClick(event.target);
    }
  });

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

          const corretoraSelect = document.getElementById("corretora");
          const numeroDocumentoInput =
            document.getElementById("numeroDocumento");

          // Limpar opções existentes
          corretoraSelect.innerHTML = "";

          if (data.nomeProdutores && data.nomeProdutores.length > 0) {
            // Adicionar uma opção padrão
            const defaultOption = document.createElement("option");
            defaultOption.disabled = true;
            defaultOption.selected = true;
            defaultOption.text = "Selecione um produtor";
            corretoraSelect.add(defaultOption);

            // Iterar sobre os nomes do array e adicionar opções ao select
            data.nomeProdutores.forEach((produtor) => {
              const option = document.createElement("option");
              option.text = produtor.nome;
              option.value = produtor.numeroDocumento; // Definir o valor como o número do documento
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
  var selectedOption = this.value;
  var naoEResponsavel = document.getElementById("Naoeresponsavel");
  var tabTwo = document.getElementById("pills-step2");

  if (selectedOption === "Não") {
    naoEResponsavel.style.display = "block";
    addEventListenersToFields();
    validateRequiredFields();
  } else {
    console.log("entrou no else");
    naoEResponsavel.style.display = "none";
    clearFields(naoEResponsavel);
    tabTwo.querySelector(".next").disabled = false;
  }
}

function handlePossuiDependentesChange() {
  var selecionado = this.value;
  var existeSim = document.getElementById("existeSim");
  var dependentes = document.querySelectorAll(".dependente");
  var botao = document.querySelector("#add-dependente");

  if (selecionado === "Sim") {
    existeSim.style.display = "block";
    botao.style.display = "block";
    nDependentes.value = 1;
  } else {
    existeSim.style.display = "none";
    botao.style.display = "none";
    nDependentes.value = 0;

    for (var i = 1; i < dependentes.length; i++) {
      dependentes[i].remove();
    }
  }
}

function atualizarDataIdDependentes() {
  var dependentes = document.querySelectorAll(".dependente");

  dependentes.forEach(function (dependente, index) {
    dependente.dataset.id = "dependente-" + (index + 1);

    dependente.querySelectorAll("input, select").forEach(function (element) {
      var id = element.id;
      element.id = id.replace(/dependente-\d+/, "dependente-" + (index + 1));
    });
  });
}

function handleAdicionarDependenteClick(event) {
  event.preventDefault();

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

/* const cepInput = document.getElementById("cep");
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
  document.getElementById("enderecoresidencial").value = data.logradouro || "";
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
} */
