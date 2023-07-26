$(document).ready(function () {
    // Quando uma imagem existente é clicada
    $(".existing-image-item").click(function () {
        // Esconder todos os botões "Excluir"
        $(".btn-excluir").hide();
        // Exibir o botão "Excluir" apenas para a imagem clicada
        $(this).find(".btn-excluir").show();
    });

    // Quando o botão "Excluir" é clicado
    $(".btn-excluir").click(function (event) {
        event.stopPropagation(); // Impedir que o clique no botão se propague para o contêiner da imagem
        const imageSrc = $(this).parent(".existing-image-item").data("src");
        const confirmation = confirm("Tem certeza que deseja excluir esta imagem?");
        if (confirmation) {
            // Fazer a solicitação de exclusão para o servidor
            $.ajax({
                url: '/deleteImage',
                type: 'POST',
                data: { img: imageSrc },
                success: function (response) {
                    if (response.success) {
                        //showMessage(response.message);
                        console.log(response.message);
                        location.reload();
                    } else {
                        //showMessageError(response.message);
                        console.error(response.message);
                    }
                },
                error: function (xhr, status, error) {
                    //showMessageError(error);
                    console.error('Erro ao excluir a imagem:', error);
                }
            });
        }
    });
    // Quando o botão "Enviar Imagem" é clicado
    $("#btnEnviarImagem").click(function () {
        // Obter o arquivo selecionado
        const fileInput = document.getElementById('fileInput');
        const file = fileInput.files[0];
        if (!file) {
            alert("Por favor, selecione um arquivo de imagem.");
            return;
        }
        const maxSize = 5 * 2000 * 2000; // 5 MB em bytes
        if (file.size > maxSize) {
            alert("O tamanho do arquivo excede o limite máximo de 5 MB.");
            return;
        }

        // Criar o objeto FormData
        const formData = new FormData();
        formData.append('file', file);

        // Fazer a solicitação de envio da imagem para o servidor
        $.ajax({
            url: '/upload',
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function (response) {
                //showMessage(response);
                console.log('Upload concluído:', response);
                location.reload(); // Recarregar a página após o upload ser concluído
            },
            error: function (xhr, status, error) {
                //showMessageError(error);
                console.error('Erro ao fazer upload:', error);
            }
        });
    });
});