app.get('/corretores', verificaAutenticacao, (req, res) => {
    // Consulta no banco de dados para buscar os dados dos corretores juntamente com as informações das corretoras vinculadas
    db.query('SELECT c.*, co.nomeFantasia AS corretoraNome FROM corretores c LEFT JOIN corretoras co ON c.corretora = co.id', (error, results) => {
      if (error) {
        console.error('Erro ao consultar o banco de dados de corretores:', error);
        return res.status(500).send('Erro ao consultar o banco de dados de corretores.');
      }
  
      // Mapeie os resultados da consulta para criar um objeto de corretores com as informações das corretoras vinculadas
      const corretores = results.map(corretor => {
        return { ...corretor, editing: false };
      });
  
      // Consulta no banco de dados para buscar os dados das corretoras separadamente
      db.query('SELECT * FROM corretoras', (error, corretorasResult) => {
        if (error) {
          console.error('Erro ao consultar o banco de dados de corretoras:', error);
          return res.status(500).send('Erro ao consultar o banco de dados de corretoras.');
        }
  
        const corretoras = corretorasResult;
  
        // Renderize a página "corretores" e passe os dados de corretores e corretoras para o template
        res.render('corretores', { corretores, corretoras, rotaAtual: 'corretores' });
      });
    });
  });
  
app.post('/edit/:id', verificaAutenticacao, (req, res) => {
const idCorretor = req.params.id;
const { cpf, nome, telefone, email, corretora } = req.body;
db.query(
    'UPDATE corretores SET cpf=?, nome=?, telefone=?, email=?, corretora=? WHERE id=?',
    [cpf, nome, telefone, email, corretora, idCorretor],
    (error, results) => {
    if (error) {
        console.error('Erro ao atualizar o corretor no banco de dados:', error);
        return res.status(500).send('Erro ao atualizar o corretor no banco de dados.');
    }

    res.cookie('alertSuccess', 'Corretor atualizado com sucesso!', { maxAge: 3000 });
    res.sendStatus(200); // Resposta de sucesso (status 200) para o cliente
    }
);
});

app.post('/editCorretora/:id', verificaAutenticacao, (req, res) => {
const idCorretora = req.params.id;
const { cnpj, razaoSocial, nomeFantasia } = req.body;
db.query(
    'UPDATE corretoras SET cnpj=?, razaoSocial=?, nomeFantasia=? WHERE id=?',
    [cnpj, razaoSocial, nomeFantasia, idCorretora],
    (error, results) => {
    if (error) {
        console.error('Erro ao atualizar a corretora no banco de dados:', error);
        return res.status(500).send('Erro ao atualizar a corretora no banco de dados.');
    }
    res.cookie('alertSuccess', 'Corretora atualizada com sucesso!', { maxAge: 3000 });
    res.sendStatus(200); // Resposta de sucesso (status 200) para o cliente
    }
);
});

app.get('/corretoras', verificaAutenticacao, (req, res) => {
db.query('SELECT * FROM corretoras', (error, results) => {
    if (error) {
    console.error('Erro ao consultar o banco de dados:', error);
    return res.status(500).send('Erro ao consultar o banco de dados.');
    }

    // Adicione a propriedade "editing: false" a cada corretor do resultado da consulta
    const corretoras = results.map(corretora => {
    return { ...corretora, editing: false };
    });
    res.render('corretoras', { corretoras, rotaAtual: 'corretoras' });
});
})

app.post('/cadastrar-corretor', verificaAutenticacao, (req, res) => {
const { cpf, nome, telefone, email, corretora } = req.body;
// Consulta SQL para inserir o novo corretor na tabela corretores
const sql = 'INSERT INTO corretores (cpf, nome, telefone, email, corretora) VALUES (?, ?, ?, ?, ?)';

// Executar a consulta SQL com os valores do novo corretor
db.query(sql, [cpf, nome, telefone, email, corretora], (error, result) => {
    if (error) {
    console.error('Erro ao cadastrar o corretor:', error);
    return res.status(500).send('Erro ao cadastrar o corretor no banco de dados.');
    }

    res.cookie('alertSuccess', 'Corretor cadastrado com sucesso!', { maxAge: 3000 });
    res.status(200).send('Corretor cadastrado com sucesso.');
});
});

app.post('/cadastrar-corretora', verificaAutenticacao, (req, res) => {
const { cnpj, razaoSocial, nomeFantasia } = req.body;
// Consulta SQL para inserir o novo corretor na tabela corretores
const sql = 'INSERT INTO corretoras (cnpj, razaoSocial, nomeFantasia) VALUES (?, ?, ?)';

// Executar a consulta SQL com os valores do novo corretor
db.query(sql, [cnpj, razaoSocial, nomeFantasia], (error, result) => {
    if (error) {
    console.error('Erro ao cadastrar a corretora:', error);
    return res.status(500).send('Erro ao cadastrar a corretora no banco de dados.');
    }

    res.cookie('alertSuccess', 'Corretora cadastrada com sucesso!', { maxAge: 3000 });
    res.status(200).send('Corretora cadastrada com sucesso.');
});
});

app.delete('/corretores/:id', verificaAutenticacao, (req, res) => {
const corretorId = req.params.id;
// Consulta SQL para excluir o corretor pelo ID
const sql = 'DELETE FROM corretores WHERE id = ?';

// Executar a consulta SQL com o ID do corretor a ser excluído
db.query(sql, corretorId, (error, result) => {
    if (error) {
    console.error('Erro ao excluir o corretor:', error);
    return res.status(500).send('Erro ao excluir o corretor do banco de dados.');
    }

    res.cookie('alertSuccess', 'Corretor excluído com sucesso!', { maxAge: 3000 });
    res.status(200).send('Corretor excluído com sucesso.');
});
});

app.delete('/corretoras/:id', verificaAutenticacao, (req, res) => {
const corretorId = req.params.id;
// Consulta SQL para excluir o corretor pelo ID
const sql = 'DELETE FROM corretoras WHERE id = ?';

// Executar a consulta SQL com o ID do corretor a ser excluído
db.query(sql, corretorId, (error, result) => {
    if (error) {
    console.error('Erro ao excluir a corretora:', error);
    return res.status(500).send('Erro ao excluir a corretora do banco de dados.');
    }

    // Se a exclusão foi bem-sucedida, retornar uma resposta de sucesso
    res.status(200).send('Corretora excluída com sucesso.');
});
});