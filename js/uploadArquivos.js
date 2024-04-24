document.querySelector('.file-input').addEventListener('change', function () {
    let allowed_mime_types = [];
    let allowed_size_mb = 100;

    var files_input = document.querySelector('.file-input').files;

    if (files_input.length == 0) {
        alert('Error: No file selected');
        return;
    }

    for (i = 0; i < files_input.length; i++) {
        let file = files_input[i];

        if (file.size > allowed_size_mb * 1024 * 1024) {
            alert('Error: Exceed size => ' + file.name);
            return;
        }

        let uniq = 'id-' + btoa(file.name).replace(/=/g, '').substring(0, 7);
        let filetype = file.type.match(/([^\/]+)\//) / allowed_mime_types;

        let li = `
            <li class="file-list ${filetype[i]}" id="${uniq}" data-filename="${file.name}">
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
                <button class="remove" onclick="remove(this)">
                    <ion-icon name="close"></ion-icon>
                </button>
            </li>
            `;

        document.querySelector('.list-upload ul').innerHTML = li + document.querySelector('.list-upload ul').innerHTML;

        let li_el = document.querySelector('#' + uniq);

        let name = li_el.querySelector('.title strong');
        let size = li_el.querySelector('.size');

        name.innerHTML = file.name;
        size.innerHTML = bytesToSize(file.size);

        var data = new FormData();
        data.append('file', file);

        // Modificação para usar axios para enviar a requisição
        axios.post('/upload', data, {
            onUploadProgress: function(progressEvent) {
                let percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                li_el.querySelector('.buffer').style.width = percent + '%';
                li_el.querySelector('.percentage').innerHTML = percent + '%';
                //li_el.querySelector('.urlArchive').value = fileData.filepath

                if (progressEvent.loaded === progressEvent.total) {
                    li_el.querySelector('.completed').style.display = li_el.querySelector('.remove').style.display = 'flex';
                }
            }
        })
        .then(response => {
            const fileData = response.data.filepaths[0];

            const originalName = fileData.originalName;
            const modifiedName = fileData.modifiedName;

            const li_el = document.querySelector(`[data-filename="${originalName}"]`);
            li_el.dataset.fileNameBack = modifiedName;
            //li_el.querySelector('.urlArchive').value = fileData.filepath;
        })
        .catch(error => {
            console.error(error);
        });
    }
});


function remove(button) {
    // Obter o elemento li correspondente
    const li = button.closest('.file-list');

    // Obter o valor do atributo data-file-name-back
    const modifiedFileName = li.dataset.fileNameBack;

    // Enviar o valor para a rota de remoção usando o Axios
    axios.post('/remove', { removefile: modifiedFileName })
        .then(response => {
            console.log(response.data);
            li.remove(); // Remover o elemento li da interface
        })
        .catch(error => console.error(error));
}

function bytesToSize(bytes) {
    const units = ['byte', "kilobyte", "megabyte", "terabyte", "petabyte"];
    const unit = Math.floor(Math.log(bytes) / Math.log(2014));
    return new Intl.NumberFormat('en', { style: "unit", unit: units[unit] }).format(bytes / 1024 ** unit);
}