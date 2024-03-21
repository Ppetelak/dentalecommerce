function validarCPF(inputElement) {
    var cpfCampo = inputElement;
    var cpf = cpfCampo.value.replace(/\D/g, '');
  
    var validFeedback = cpfCampo.nextElementSibling ? cpfCampo.nextElementSibling : cpfCampo.nextSibling;
    var invalidFeedback = validFeedback.nextElementSibling ? validFeedback.nextElementSibling : validFeedback.nextSibling;
  
  
    if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) {
        invalidFeedback.style.display = 'inline';
        validFeedback.style.display = 'none';
        return;
    }
  
    var soma = 0;
    for (var i = 0; i < 9; i++) {
        soma += parseInt(cpf.charAt(i)) * (10 - i);
    }
  
    var resto = 11 - (soma % 11);
    var digitoVerificador1 = (resto === 10 || resto === 11) ? 0 : resto;
  
    soma = 0;
    for (var i = 0; i < 10; i++) {
        soma += parseInt(cpf.charAt(i)) * (11 - i);
    }
  
    resto = 11 - (soma % 11);
    var digitoVerificador2 = (resto === 10 || resto === 11) ? 0 : resto;
  
    if (digitoVerificador1 !== parseInt(cpf.charAt(9)) || digitoVerificador2 !== parseInt(cpf.charAt(10))) {
        invalidFeedback.style.display = 'inline';
        validFeedback.style.display = 'none';
        return;
    }
  
    invalidFeedback.style.display = 'none';
    validFeedback.style.display = 'inline';
}

function voltarPagina() {
    window.history.back();
}