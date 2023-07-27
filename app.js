const express = require("express");
const app = new express();
const ejs = require("ejs");
const path = require('path')
const bodyParser = require("body-parser");
const mysql = require("mysql2");
const session = require("express-session");
const crypto = require("crypto");
const cookie = require('cookie-parser');
const multer = require('multer');
const fs = require('fs');
const { format } = require('date-fns');
const { ptBR } = require('date-fns/locale');
const porta = process.env.PORT || 3001; 

/* Verificar se usuário está logado */
const verificaAutenticacao = (req, res, next) => {
  if (req.session && req.session.usuario) {
    next();
  } else {
    res.redirect('/login');
  }
};

/*CONDIÇÕES DE USO DA APLICAÇÃO */

app.use(bodyParser.urlencoded({ extended: true }));
app.use("/css", express.static("css"));
app.use("/js", express.static("js"));
app.use("/img", express.static("img"));
app.use("/arquivos", express.static("arquivos"));
app.use("/bootstrap-icons", express.static("node_modules/bootstrap-icons"));
app.set("view engine", "ejs");
app.use(cookie());
app.use(express.json());

const generateSecretKey = () => {
  return crypto.randomBytes(32).toString("hex");
};

const secretKey = generateSecretKey();

app.use(
  session({
    secret: secretKey,
    resave: false,
    saveUninitialized: false,
  })
);

/* CONEXÃO COM BANCO DE DADOS */

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "pmp078917",
  database: "mhdentalvendas",
  port: "3306",
});

/* const db = mysql.createConnection({
  host: "localhost",
  user: "mhdental",
  password: "pmp078917",
  database: "mhdentalvendas1",
  port: "3306",
}); */

db.connect((error) => {
  if (error) {
    console.error("Erro ao conectar ao banco de dados:", error);
  } else {
    console.log("Conexão bem-sucedida ao banco de dados");
  }
});

/* Criação de rota e ambiente de upload de arquivos */

const storage = multer.diskStorage({
  destination: 'arquivos/',
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });

app.get('/files', (req, res) =>{
  const files = fs.readdirSync('arquivos/');
  res.render('uploads', {files:files} )
})

app.post('/upload', upload.single('file'), (req, res) => {
  res.json('Enviado com sucesso');
});

app.post('/deleteImage', (req, res) => {
  const file = path.join(__dirname, req.body.img)
  if (fs.existsSync(file)) {
    try {
      // Exclui o arquivo
      fs.unlinkSync(file);
      res.json({ success: true, message: 'Imagem excluída com sucesso!' });
    } catch (error) {
      console.error('Erro ao excluir a imagem:', error);
      res.json({ success: false, message: 'Erro ao excluir a imagem.' });
    }
  } else {
    res.json({ success: false, message: 'Arquivo não encontrado em: ' + file });
  }
});

app.post('/salvarLogo', (req, res) => {
  const logo = req.body.logoUrl
  const operadoraId = req.body.operadoraId
  const query = 'UPDATE planos SET logo = ? WHERE id = ?';
  db.query(query, [logo, operadoraId], (err, result) => {
    if (err) {
      console.error('Erro ao atualizar operadora:', err);

      // Reverter a transação em caso de erro
      db.rollback(() => {
        console.error('Transação revertida.');
        return res.status(500).json({ message: 'Erro interno do servidor' });
      });
    }

    // Confirmar a transação
    db.commit((err) => {
      if (err) {
        console.error('Erro ao confirmar a transação:', err);

        // Reverter a transação em caso de erro
        db.rollback(() => {
          console.error('Transação revertida.');
          return res.status(500).json({ message: 'Erro interno do servidor' });
        });
      }

      res.cookie('alerta', '✅ Logo da operadora atualizado com SUCESSO', { maxAge: 3000 });
      res.status(200).json({ message: 'Operadora atualizada com sucesso' });
    });
  });
});

/* FIM DE SEÇÃO DE UPLOAD   */

app.get("/", (req, res) => {
  const query = 'SELECT * FROM planos'
  db.query(query, (err, result) =>{
    if(err) {
      console.error('Erro ao consultar o banco de dados:', err);
      return res.status(500).json({ error: 'Erro ao processar consulta ao BD'})
    }
    else {
      res.render("index", { planos: result });
    }
  })
});

app.post("/formulario", (req, res) => {
  const planoId = req.body.planoSelecionado;
  const query = 'SELECT * FROM planos WHERE id = ?';
  db.query(query, [planoId], (err, result) => {
    if (err) {
      console.error('Erro ao consultar o banco de dados:', err);
      return res.status(500).json({ error: 'Erro ao processar consulta ao BD' });
    } else {
      // Verifica se foi encontrado algum plano com o ID informado
      if (result.length === 0) {
        return res.status(404).json({ error: 'Plano não encontrado' });
      }

      const planoCompleto = result[0];
      res.render("formulario", { planoSelecionado: planoCompleto });
    }
  });
});

app.get("/buscar-corretor", (req, res) => {
  const cpfCorretor = req.query.cpfcorretor;
  const query = 'SELECT * FROM corretores WHERE cpf = ?';
  db.query(query, [cpfCorretor], (err, result) => {
    if (err) {
      console.error('Erro ao consultar o banco de dados:', err);
      return res.status(500).json({ error: 'Erro ao processar consulta ao BD' });
    } else {
      // Verifica se foi encontrado algum corretor com o CPF informado
      if (result.length === 0) {
        return res.status(404).json({ error: 'Corretor não encontrado' });
      }

      const corretor = result[0];
      res.json(corretor); // Enviar as informações do corretor como resposta da requisição
    }
  });
});

app.post("/enviadados", (req, res) => {
  const dados = req.body;
  const dependentes = [];
  for (let i = 0; i < dados.cpfdependente.length; i++) {
    dependentes.push({
      cpfdependente: dados.cpfdependente[i],
      nomecompletodependente: dados.nomecompletodependente[i],
      nomemaedependente: dados.nomemaedependente[i],
      nascimentodependente: dados.nascimentodependente[i],
      sexodependente: dados.sexodependente[i],
    });
  }

  // Verifica se a data de nascimento do responsável financeiro é válida
  if (dados.datadenascimentofinanceiro === "") {
    // Caso a data de nascimento esteja vazia, define como null ou alguma data padrão
    dados.datadenascimentofinanceiro = null; // Ou alguma data padrão válida
  } else {
    // Caso a data de nascimento não esteja vazia, tenta convertê-la para um objeto Date
    const dataNascimentoFinanceiro = new Date(dados.datadenascimentofinanceiro);
    // Verifica se a conversão foi bem-sucedida e se é uma data válida
    if (!isNaN(dataNascimentoFinanceiro.getTime())) {
      // Se for uma data válida, formata-a no formato do MySQL (YYYY-MM-DD)
      dados.datadenascimentofinanceiro = dataNascimentoFinanceiro
        .toISOString()
        .slice(0, 10);
    } else {
      // Se não for uma data válida, retorne um erro ou trate a situação conforme necessário
      return res
        .status(400)
        .json({
          error: "Data de nascimento do responsável financeiro inválida",
        });
    }
  }

  const dadosImplantacao = {
    planoSelecionado: dados.planoSelecionado,
    nomecompleto: dados.nomecompleto,
    datadenascimento: dados.datadenascimento,
    cpftitular: dados.cpftitular,
    nomemaetitular: dados.nomemaetitular,
    rgtitular: dados.rgtitular,
    orgaoexpedidor: dados.orgaoexpedidor,
    dataexpedicaorgtitular: dados.dataexpedicaorgtitular,
    sexotitular: dados.sexotitular,
    estadociviltitular: dados.estadociviltitular,
    telefonetitular: dados.telefonetitular,
    celulartitular: dados.celulartitular,
    emailtitular: dados.emailtitular,
    profissaotitular: dados.profissaotitular,
    titularresponsavelfinanceiro: dados.titularresponsavelfinanceiro,
    cpffinanceiro: dados.cpffinanceiro,
    nomefinanceiro: dados.nomefinanceiro,
    datadenascimentofinanceiro: dados.datadenascimentofinanceiro,
    telefonetitularfinanceiro: dados.telefonetitularfinanceiro,
    emailtitularfinanceiro: dados.emailtitularfinanceiro,
    cep: dados.cep,
    enderecoresidencial: dados.enderecoresidencial,
    numeroendereco: dados.numeroendereco,
    complementoendereco: dados.complementoendereco,
    bairro: dados.bairro,
    cidade: dados.cidade,
    cpfcorretor: dados.cpfcorretor,
    nomecorretor: dados.nomecorretor,
    corretora: dados.corretora,
    celularcorretor: dados.celularcorretor,
    formaPagamento: dados.formaPagamento,
    aceitoTermos: dados.aceitoTermos,
    aceitoPrestacaoServicos: dados.aceitoPrestacaoServicos,
  };

  db.query(
    "INSERT INTO implantacoes SET ?",
    dadosImplantacao,
    (err, result) => {
      if (err) {
        console.log("Erro ao inserir na tabela implantacoes:", err);
        res.status(500).send("Erro ao inserir os dados");
      } else {
        console.log("Dados inseridos na tabela implantacoes");
        const idImplantacao = result.insertId;
        insertDependentes(idImplantacao, dependentes, (error) => {
          if (error) {
            console.log("Erro ao inserir na tabela dependentes:", error);
            res.status(500).send("Erro ao inserir os dados");
          } else {
            console.log("Dados inseridos na tabela dependentes");
            res.send("Dados inseridos com sucesso");
          }
        });
      }
    }
  );
});

function insertDependentes(idImplantacao, dependentes, callback) {
  if (dependentes.length === 0) {
    // Se não houver dependentes, finaliza a função recursiva
    callback(null);
    return;
  }

  const dependente = dependentes.shift();
  const dadosDependente = {
    id_implantacoes: idImplantacao,
    cpfdependente: dependente.cpfdependente,
    nomecompletodependente: dependente.nomecompletodependente,
    nomemaedependente: dependente.nomemaedependente,
    nascimentodependente: dependente.nascimentodependente,
    sexodependente: dependente.sexodependente,
  };

  db.query("INSERT INTO dependentes SET ?", dadosDependente, (err, result) => {
    if (err) {
      callback(err);
    } else {
      console.log("Dependente inserido na tabela dependentes:", dependente);
      insertDependentes(idImplantacao, dependentes, callback);
    }
  });
}

app.post("/enviadados-teste", (req, res) => {
  const dados = req.body;
  const dataDependentes = req.body.getDependentes;
  const nDependentes = dados.nDependentes;
  console.log(nDependentes, dataDependentes);
  res.send("Exito! Verificar Console");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post('/login-verifica', (req, res) => {
  const { username, password } = req.body;

  const query = 'SELECT * FROM users WHERE username = ?';
  db.query(query, [username], (err, results) => {
    if (err) {
      console.error('Erro ao consultar o banco de dados:', err);
      return res.status(500).json({ error: 'Erro ao processar a solicitação' });
    }

    if (results.length === 0) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    const user = results[0];

    if (user.password !== password) {
      return res.status(401).json({ error: 'Senha incorreta' });
    }

    // Autenticação bem-sucedida, enviar uma resposta de sucesso
    req.session.usuario = user;
    res.status(200).json({ message: 'Autenticação bem-sucedida' });
  });
});

app.get('/implantacoes', (req, res) => {
  const query = 'SELECT id, cpftitular, nomecompleto, data_implantacao, planoSelecionado FROM implantacoes';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Erro ao consultar o banco de dados:', err);
      res.status(500).send('Erro ao processar a solicitação');
    } else {
      res.render('implantacoes', { implantacoes: results, format: format, ptBR: ptBR });
    }
  });
});

app.get('/implantacao/:id', (req, res) => {
  const idImplantacao = req.params.id;

  // Consulta a implantação pelo ID
  const queryImplantacao = 'SELECT * FROM implantacoes WHERE id = ?';
  db.query(queryImplantacao, [idImplantacao], (err, resultImplantacao) => {
    if (err) {
      console.error('Erro ao consultar o banco de dados:', err);
      return res.status(500).send('Erro ao processar a solicitação');
    }

    if (resultImplantacao.length === 0) {
      return res.status(404).send('Implantação não encontrada');
    }

    const implantacao = resultImplantacao[0];

    // Consulta os dependentes vinculados a essa implantação
    const queryDependentes = 'SELECT * FROM dependentes WHERE id_implantacoes = ?';
    db.query(queryDependentes, [idImplantacao], (err, resultDependentes) => {
      if (err) {
        console.error('Erro ao consultar o banco de dados:', err);
        return res.status(500).send('Erro ao processar a solicitação');
      }

      // Renderiza a página EJS com as informações da implantação e dependentes
      res.render('detalhes-implantacao', {
        implantacao: implantacao,
        dependentes: resultDependentes,
        format: format,
        ptBR: ptBR,
      });
    });
  });
});

app.get('/corretores', (req, res) => {
  // Consulta no banco de dados para buscar os dados dos corretores
  db.query('SELECT * FROM corretores', (error, results) => {
    if (error) {
      console.error('Erro ao consultar o banco de dados:', error);
      return res.status(500).send('Erro ao consultar o banco de dados.');
    }

    // Adicione a propriedade "editing: false" a cada corretor do resultado da consulta
    const corretores = results.map(corretor => {
      return { ...corretor, editing: false };
    });

    // Renderiza a página "corretores" e passa os dados dos corretores para o template
    res.render('corretores', { corretores });
  });
});

app.post('/edit/:id', (req, res) => {
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

      console.log('Corretor atualizado com sucesso!');
      res.sendStatus(200); // Resposta de sucesso (status 200) para o cliente
    }
  );
});

app.post('/cadastrar-corretor', (req, res) => {
  const { cpf, nome, telefone, email, corretora } = req.body;
  // Consulta SQL para inserir o novo corretor na tabela corretores
  const sql = 'INSERT INTO corretores (cpf, nome, telefone, email, corretora) VALUES (?, ?, ?, ?, ?)';

  // Executar a consulta SQL com os valores do novo corretor
  db.query(sql, [cpf, nome, telefone, email, corretora], (error, result) => {
    if (error) {
      console.error('Erro ao cadastrar o corretor:', error);
      return res.status(500).send('Erro ao cadastrar o corretor no banco de dados.');
    }

    // Se a inserção foi bem-sucedida, retornar uma resposta de sucesso
    res.status(200).send('Corretor cadastrado com sucesso.');
  });
});

app.delete('/corretores/:id', (req, res) => {
  const corretorId = req.params.id;
  // Consulta SQL para excluir o corretor pelo ID
  const sql = 'DELETE FROM corretores WHERE id = ?';

  // Executar a consulta SQL com o ID do corretor a ser excluído
  db.query(sql, corretorId, (error, result) => {
    if (error) {
      console.error('Erro ao excluir o corretor:', error);
      return res.status(500).send('Erro ao excluir o corretor do banco de dados.');
    }

    // Se a exclusão foi bem-sucedida, retornar uma resposta de sucesso
    res.status(200).send('Corretor excluído com sucesso.');
  });
});

app.get('/planos', (req, res) => {
  const query = 'SELECT * FROM planos';
  const files = fs.readdirSync('arquivos/');

  db.query(query, (err, result) => {
    if (err) {
      console.error('Erro ao consultar o banco de dados:', err);
      res.status(500).send('Erro ao consultar os planos');
    } else {
      // Renderize a página EJS e passe os planos como parâmetro
      res.render('planos', { planos: result, files:files });
    }
  });
})

app.post('/atualiza-planos', (req, res) => {
  const { id, nome_do_plano, ans, forma_pagamento1, forma_pagamento2, forma_pagamento3, valor_pagamento1, valor_pagamento2, valor_pagamento3, descricao, observacoes, logo, banner } = req.body;

  const query = 'SELECT * FROM planos WHERE id = ?';
  // Consultar o banco de dados para verificar se o ID já existe
  db.query(query, [id], (err, rows) => {
    if (err) {
      console.error('Erro ao consultar plano:', err);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }

    if (rows.length > 0) {
      // O ID existe, realizar a atualização
      // Iniciar uma transação
      db.beginTransaction((err) => {
        if (err) {
          console.error('Erro ao iniciar a transação:', err);
          return res.status(500).json({ message: 'Erro interno do servidor' });
        }

        const updateQuery = 'UPDATE planos SET nome_do_plano = ?, ans = ?, forma_pagamento1 = ?, forma_pagamento2 =?, forma_pagamento3 = ?, valor_pagamento1 = ?, valor_pagamento2 = ?, valor_pagamento3 = ?, descricao = ?, observacoes = ?, logo = ?, banner = ?  WHERE id = ?';
        db.query(updateQuery, [nome_do_plano, ans, forma_pagamento1, forma_pagamento2, forma_pagamento3, valor_pagamento1, valor_pagamento2, valor_pagamento3, descricao, observacoes, logo, banner, id], (err, result) => {
          if (err) {
            console.error('Erro ao atualizar operadora:', err);

            // Reverter a transação em caso de erro
            db.rollback(() => {
              console.error('Transação revertida.');
              return res.status(500).json({ message: 'Erro interno do servidor' });
            });
          }

          // Confirmar a transação
          db.commit((err) => {
            if (err) {
              console.error('Erro ao confirmar a transação:', err);

              // Reverter a transação em caso de erro
              db.rollback(() => {
                console.error('Transação revertida.');
                return res.status(500).json({ message: 'Erro interno do servidor' });
              });
            }

            // Transação bem-sucedida
            res.status(200).json({ message: 'Plano atualizado com sucesso' });
          });
        });
      });
    } else {
      // O ID não existe, criar uma nova operadora
      const createQuery = 'INSERT INTO planos (nome_do_plano, ans, forma_pagamento1, forma_pagamento2, forma_pagamento3, valor_pagamento1, valor_pagamento2, valor_pagamento3, descricao, observacoes, logo, banner) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
      db.query(createQuery, [nome_do_plano, ans, forma_pagamento1, forma_pagamento2, forma_pagamento3, valor_pagamento1, valor_pagamento2, valor_pagamento3, descricao, observacoes, logo, banner], (err, result) => {
        if (err) {
          console.error('Erro ao criar plano:', err);
          return res.status(500).json({ message: 'Erro interno do servidor' });
        }
        //res.cookie('alertSucess', 'Plano criado com Sucesso', { maxAge: 3000 });
        res.status(200).json({ message: 'Nova plano criado com sucesso' });
      });
    }
  });
})

app.post('/deleta-plano', (req,res) => {
  const idPlano = req.body.id;
  const query = 'DELETE FROM planos WHERE id = ?';
  db.query(query, [idPlano], (err, result) => {
    if(err) {
      console.error('Erro ao excluir plano, ou ID não existe, erro: ' , err);
      return res.status(500).json({ message: 'Erro na exclusão do plano selecionado'});
    }
    res.status(200).json({ message: 'Plano excluído com sucesso '});
  });
})

app.get("/logout", (req, res) => {
  // Remover as informações de autenticação da sessão
  req.session.destroy((err) => {
    if (err) {
      console.error("Erro ao encerrar a sessão:", err);
    }
    // Redirecionar o usuário para a página de login ou para outra página desejada
    res.redirect("/login");
  });
});

app.listen(porta, () => {
  console.log(`Servidor rodando na porta ${porta}`);
});
