document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.next').forEach(function (element) {
        element.addEventListener('click', handleNextClick);
    });

    document.querySelectorAll('.prev').forEach(function (element) {
        element.addEventListener('click', handlePrevClick);
    });

    document.getElementById('titularresponsavelfinanceiro').addEventListener('change', handleTitularResponsavelChange);

    document.getElementById('possuidependentes').addEventListener('change', handlePossuiDependentesChange);

    document.querySelector('.adicionar-dependente').addEventListener('click', handleAdicionarDependenteClick);

    document.addEventListener('click', function (event) {
        if (event.target.classList.contains('excluir-dependente')) {
            handleExcluirDependenteClick(event.target);
        }
    });

    const cpfCorretorInput = document.getElementById("cpfcorretor");
    const btnBuscarCorretor = document.getElementById("btnBuscarCorretor");
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
                    document.getElementById("corretora").value = data.corretora || "";
                    document.getElementById("celularcorretor").value = data.telefone || "";
                })
                .catch((error) => {
                    alert(error.message);
                    console.error("Erro na requisição:", error);
                });
        }
    });
});

var nDependentes = document.querySelector('.nDependentes')

function handleNextClick() {
    var activeTab = document.querySelector('.tab-pane.active');
    var nextTab = activeTab.nextElementSibling;
    var activeProgress = document.querySelector('.progress-bar');
    var currentWidth = activeProgress.style.width;
    var currentWidthValue = parseInt(currentWidth);
    var increment = 14;
    var newWidthValue = currentWidthValue + increment;
    activeProgress.style.width = newWidthValue + '%';


    if (nextTab) {
        activeTab.classList.remove('show', 'active');
        nextTab.classList.add('show', 'active');
    }
}

function handlePrevClick() {
    var activeTab = document.querySelector('.tab-pane.active');
    var prevTab = activeTab.previousElementSibling;
    var activeProgress = document.querySelector('.progress-bar');
    var currentWidth = activeProgress.style.width;
    var currentWidthValue = parseInt(currentWidth);
    var decrement = 14;
    var newWidthValue = currentWidthValue - decrement;
    activeProgress.style.width = newWidthValue + '%';

    if (prevTab) {
        activeTab.classList.remove('show', 'active');
        prevTab.classList.add('show', 'active');
    }
}

function handleTitularResponsavelChange() {
    var selectedOption = this.value;
    var naoEResponsavel = document.getElementById('Naoeresponsavel');


    if (selectedOption === 'Não') {
        naoEResponsavel.style.display = 'block';
    } else {
        naoEResponsavel.style.display = 'none';
    }
}

function handlePossuiDependentesChange() {
    var selecionado = this.value;
    var existeSim = document.getElementById('existeSim');
    var dependentes = document.querySelectorAll('.dependente');
    var botao = document.querySelector('#add-dependente')

    if (selecionado === 'Sim') {
        existeSim.style.display = 'block';
        botao.style.display = 'block';
        nDependentes.value = 1;
    } else {
        existeSim.style.display = 'none';
        botao.style.display = 'none';
        nDependentes.value = 0;

        for (var i = 1; i < dependentes.length; i++) {
            dependentes[i].remove();
        }
    }
}

function atualizarDataIdDependentes() {
    var dependentes = document.querySelectorAll('.dependente');

    dependentes.forEach(function (dependente, index) {
        dependente.dataset.id = 'dependente-' + (index + 1);

        dependente.querySelectorAll('input, select').forEach(function (element) {
            var id = element.id;
            element.id = id.replace(/dependente-\d+/, 'dependente-' + (index + 1));
        });
    });
}

function handleAdicionarDependenteClick(event) {
    event.preventDefault();

    var totalDependentes = document.querySelectorAll('.dependente').length;
    var novoId = 'dependente-' + (totalDependentes + 1);

    var clone = document.querySelector('.dependente:first-child').cloneNode(true);
    clone.dataset.id = novoId;

    clone.querySelectorAll('input, select').forEach(function (element) {
        var id = element.id;
        element.id = id.replace('dependente-1', novoId);
    });

    if (totalDependentes >= 1) {
        clone.querySelector('.excluir-dependente').style.display = 'block';
    }

    var dependenteContainer = document.querySelector('#existeSim');
    dependenteContainer.appendChild(clone);

    atualizarDataIdDependentes();
}

function handleExcluirDependenteClick(element) {
    var dependente = element.closest('.dependente');
    var totalDependentes = document.querySelectorAll('.dependente').length;

    if (totalDependentes > 1) {
        dependente.remove();

        atualizarDataIdDependentes();
    }
}

function abrirPopupCartao() {
    $('#modalCartaoCredito').modal('show');
}

document.getElementById('formDados').addEventListener('submit', function(e){
    e.preventDefault();
    
    var formaPagamento = document.querySelector('input[name="formaPagamento"]:checked').value;
    if (formaPagamento === '2' || formaPagamento === '3') {
        abrirPopupCartao();
    } else {
        this.submit();
    }
});