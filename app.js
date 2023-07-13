const express = require('express')
const app = new express()
const ejs = require('ejs');

/*CONDIÇÕES DE USO DA APLICAÇÃO */

app.use('/css', express.static('css'));
app.use('/js', express.static('js'));
app.use('/img', express.static('img'));
app.use('/bootstrap-icons', express.static('node_modules/bootstrap-icons'));
app.set('view engine', 'ejs');
app.use(express.json());


app.get('/formulario', (req, res) => {
    res.render('formulario');
})

app.listen(8888)