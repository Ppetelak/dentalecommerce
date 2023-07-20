$(document).ready(function () {
    $('.next').click(function () {
        var activeTab = $('.tab-pane.active');
        var nextTab = activeTab.next('.tab-pane');
        var activeProgress = $('.progress-bar');
        var progressValue = (nextTab.index() / ($('.tab-pane').length - 1)) * 100;
        if (nextTab.length > 0) {
            activeTab.removeClass('show active');
            nextTab.addClass('show active');
            activeProgress.width(progressValue + '%').attr('aria-valuenow', progressValue);
        }
    });

    $('.prev').click(function () {
        var activeTab = $('.tab-pane.active');
        var prevTab = activeTab.prev('.tab-pane');
        var activeProgress = $('.progress-bar');
        var progressValue = (prevTab.index() / ($('.tab-pane').length - 1)) * 100;
        if (prevTab.length > 0) {
            activeTab.removeClass('show active');
            prevTab.addClass('show active');
            activeProgress.width(progressValue + '%').attr('aria-valuenow', progressValue);
        }
    });
    $('#titularresponsavelfinanceiro').change(function () {
        var selectedOption = $(this).val();
        if (selectedOption === 'Não') {
            $('#Naoeresponsavel').show();
        } else {
            $('#Naoeresponsavel').hide();
        }
    });
    $('#possuidependentes').change(function() {
        var selecionado = $(this).val();
        
        // Se selecionar "Sim", exibe a seção de dependentes
        if (selecionado === 'Sim') {
          $('#existeSim').show();
        } else {
          // Caso contrário, esconde a seção de dependentes e remove os dependentes adicionados anteriormente
          $('#existeSim').hide();
          $('.dependente').not(':first').remove();
        }
      });
    
      // Ao clicar em "Adicionar dependente"
      $('adicionar-dependente').click(function() {
        var totalDependentes = $('.dependente').length;
        var novoId = 'dependente-' + (totalDependentes + 1);
    
        // Clona a primeira seção de dependente e altera o data-id e os ids dos inputs
        var clone = $('.dependente:first').clone();
        clone.attr('data-id', novoId);
        clone.find('input, select').each(function() {
          var id = $(this).attr('id');
          $(this).attr('id', id.replace('dependente-1', novoId));
        });
    
        // Exibe o botão "Excluir dependente" se houver mais de um dependente
        if (totalDependentes >= 1) {
          clone.find('excluir-dependente').show();
        }
    
        // Insere o novo dependente após o último dependente existente
        $('.dependente:last').after(clone);
      });
    
      // Ao clicar em "Excluir dependente"
      $(document).on('click', 'excluir-dependente', function() {
        var dependente = $(this).closest('.dependente');
        var totalDependentes = $('.dependente').length;
    
        // Remove o dependente apenas se houver mais de um dependente
        if (totalDependentes > 1) {
          dependente.remove();
        }
    });
});