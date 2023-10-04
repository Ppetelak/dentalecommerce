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
const uuid = require('uuid');
const { format } = require('date-fns');
const { ptBR } = require('date-fns/locale');
const porta = process.env.PORT || 5586; 

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
app.use("/formulario", express.static("formulario"));
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
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const storageForm = multer.diskStorage({
  destination: 'formulario/',
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const uploadForm = multer({ storage: storageForm });

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
  const queryPlanos = 'SELECT * FROM planos'
  db.query(queryPlanos, (err, resultPlanos) =>{
  if(err) {
    console.error('Erro ao consultar o banco de dados:', err);
    return res.status(500).json({ error: 'Erro ao processar consulta ao BD'})
  }
    res.render("index", { planos: resultPlanos });
  })
});

app.post("/formulario", (req, res) => {
  const planoId = req.body.planoSelecionado;
  const query = 'SELECT * FROM planos WHERE id = ?';
  const queryProfissoes = 'SELECT * FROM profissoes'
  db.query(query, [planoId], (err, result) => {
    if (err) {
      console.error('Erro ao consultar o banco de dados:', err);
      return res.status(500).json({ error: 'Erro ao processar consulta ao BD' });
    } else {
      if (result.length === 0) {
        return res.status(404).json({ error: 'Plano não encontrado' });
      }
      db.query(queryProfissoes, (err, resultProfissoes) => {
        if(err){
          console.error('Erro ao resgatar profissoes do BD')
        }
        const planoCompleto = result[0];
        res.render("formulario", { planoSelecionado: planoCompleto, profissoes: resultProfissoes });
      })
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

function generateRandomDigits(length) {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10);
  }
  return result;
}

async function generateUniqueProposalNumber() {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = (currentDate.getMonth() + 1).toString().padStart(2, '0'); // Mês com 2 dígitos
  const day = currentDate.getDate().toString().padStart(2, '0'); // Dia com 2 dígitos
  let randomPart;

  // Tente gerar um número único até encontrar um que não exista no banco de dados
  while (true) {
    randomPart = generateRandomDigits(4); // 4 dígitos aleatórios
    const proposalNumber = `${year}${month}${day}${randomPart}`;

    const exists = await checkProposalExists(proposalNumber);
    if (!exists) {
      return proposalNumber; // Retorna o número único
    }
  }
}

function checkProposalExists(proposalNumber) {
  return new Promise((resolve, reject) => {
    db.query(
      'SELECT * FROM implantacoes WHERE numeroProposta = ?',
      [proposalNumber],
      (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results.length > 0);
        }
      }
    );
  });
}

/* app.post("/enviadados", async (req, res) => {
  const dados = req.body;
  const dependentes = [];

  const numeroProposta = await generateUniqueProposalNumber();

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
    numeroProposta: numeroProposta
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
}); */

app.post("/enviadados", uploadForm.fields([{ name: 'documentoFoto', maxCount: 1 }, { name: 'comprovanteResidencia', maxCount: 1 }]), async (req, res) => {
  const dados = req.body;
  const dependentes = [];

  const numeroProposta = await generateUniqueProposalNumber();

  for (let i = 0; i < dados.cpfdependente.length; i++) {
    dependentes.push({
      cpfdependente: dados.cpfdependente[i],
      nomecompletodependente: dados.nomecompletodependente[i],
      nomemaedependente: dados.nomemaedependente[i],
      nascimentodependente: dados.nascimentodependente[i],
      sexodependente: dados.sexodependente[i],
    });
  }

  db.beginTransaction(async function (err) {
    if (err) {
      console.log("Erro ao iniciar a transação:", err);
      return res.status(500).send("Erro ao inserir os dados");
    }

    try {
      const dataNascimentoFinanceiro = new Date(dados.datadenascimentofinanceiro);
      const srcDocumentoFoto = req.files['documentoFoto'][0].path;
      const srcComprovanteResidencia = req.files['comprovanteResidencia'][0].path;

      if (dados.datadenascimentofinanceiro !== "") {
        if (!isNaN(dataNascimentoFinanceiro.getTime())) {
          dados.datadenascimentofinanceiro = dataNascimentoFinanceiro.toISOString().slice(0, 10);
        } else {
          throw new Error("Data de nascimento do responsável financeiro inválida");
        }
      } else {
        dados.datadenascimentofinanceiro = null; // Ou alguma data padrão válida
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
        numeroProposta: numeroProposta
      };

      const resultImplantacao = await insertData("INSERT INTO implantacoes SET ?", dadosImplantacao);
      const idImplantacao = resultImplantacao.insertId;

      await insertDependentes(idImplantacao, dependentes);

      await insertDocumentPaths(idImplantacao, srcDocumentoFoto, srcComprovanteResidencia);

      await commitTransaction();

      console.log("Dados inseridos com sucesso");
      res.send("Dados inseridos com sucesso");
    } catch (error) {
      await rollbackTransaction();
      console.log("Erro durante a transação:", error);
      res.status(500).send("Erro ao inserir os dados");
    }
  });

  async function insertDocumentPaths(idImplantacao, srcDocumentoFoto, srcComprovanteResidencia) {
    const query = "INSERT INTO documentos_implantacoes (id_implantacao, documentoFoto, comprovanteResidencia) VALUES (?, ?, ?)";
    
    await insertData(query, [idImplantacao, srcDocumentoFoto, srcComprovanteResidencia]);
  }

  async function insertData(query, values) {
    return new Promise((resolve, reject) => {
      db.query(query, values, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }

  async function insertDependentes(idImplantacao, dependentes) {
    return new Promise((resolve, reject) => {
      function insertDependente(dependente) {
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
            reject(err);
          } else {
            if (dependentes.length === 0) {
              resolve();
            } else {
              insertDependente(dependentes.shift());
            }
          }
        });
      }

      if (dependentes.length > 0) {
        insertDependente(dependentes.shift());
      } else {
        resolve(); // Nenhum dependente para inserir
      }
    });
  }

  async function commitTransaction() {
    return new Promise((resolve, reject) => {
      db.commit((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async function rollbackTransaction() {
    return new Promise((resolve, reject) => {
      db.rollback(() => {
        resolve();
      });
    });
  }
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

app.get('/gerarContrato/:id', (req, res) => {
  const idImplantacao = req.params.id;
  const queryImplantacoes = 'SELECT * FROM implantacoes WHERE id=?';
  const queryPlano = 'SELECT * FROM planos WHERE id=?';
  const queryProfissao = 'SELECT * FROM profissoes WHERE nome= ?';
  const queryEntidade = 'SELECT * FROM entidades WHERE id=?';
  const queryDependentes = 'SELECT * FROM dependentes WHERE id_implantacoes = ?'
  const queryDocumentos = 'SELECT *FROM documentos_implantacoes WHERE id_implantacao = ?'

 
  db.query(queryImplantacoes, [idImplantacao], (err, resultImplantacoes) => {
    if (err) {
      console.log('Erro ao buscar implantação no BD', err);
      res.status(500).send('Erro ao buscar implantação no BD');
      return;
    }

    if (resultImplantacoes.length === 0) {
      res.status(404).send('Implantação não encontrada');
      return;
    }

    const idImplantacao = resultImplantacoes[0].id;

    const nomeProfissao = resultImplantacoes[0].profissaotitular;

    db.query(queryProfissao, [nomeProfissao], (err, resultProfissao) => {
      if(err){
        console.error('Erro ao buscar dados da entidade relacionada a profissão')
      }
      const entidadeId = resultProfissao[0].idEntidade;

      db.query(queryEntidade, [entidadeId], (err, resultEntidade) => {
        if(err){
          console.error('Erro puxar entidade relacionada', err)
        }
        const planoId = resultImplantacoes[0].planoSelecionado;
        db.query(queryPlano, [planoId], (err, resultPlano) => {
          if (err) {
            console.error('Erro ao buscar plano vinculado à implantação', err);
            res.status(500).send('Erro ao buscar plano vinculado à implantação');
            return;
          }
          db.query(queryDependentes, [idImplantacao], (err, resultDependentes) => {
            if(err){
              console.error('Erro na busca pelos dependentes vinculados a essa implantacao', err)
            }
            db.query(queryDocumentos, [idImplantacao], (err, resultDocumentos) => {
              if(err){
                console.error('Erro na busca pelos documentos vinculados a implantação', err)
              }
              const data_implantacao = new Date(resultImplantacoes[0].data_implantacao);
              const dia = String(data_implantacao.getDate()).padStart(2, '0');
              const mes = String(data_implantacao.getMonth() + 1).padStart(2, '0');
              const ano = data_implantacao.getFullYear();
              const dataFormatada = `${dia}/${mes}/${ano}`;
  
              res.render('contrato', { implantacao: resultImplantacoes[0], plano: resultPlano[0], dataFormatada: dataFormatada, entidade:resultEntidade[0], profissao: resultProfissao[0], dependentes: resultDependentes, documento: resultDocumentos[0] });
            })
          })
        });
      })
    })    
  });
});

app.get('/corretores', (req, res) => {
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
      res.render('corretores', { corretores, corretoras });
    });
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

      res.cookie('alertSuccess','Corretor atualizado com sucesso!', {maxAge: 3000});
      res.sendStatus(200); // Resposta de sucesso (status 200) para o cliente
    }
  );
});

app.post('/editCorretora/:id', (req, res) => {
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
      res.cookie('alertSuccess','Corretora atualizada com sucesso!', {maxAge: 3000});
      res.sendStatus(200); // Resposta de sucesso (status 200) para o cliente
    }
  );
});

app.get('/corretoras', (req,res) => {
  db.query('SELECT * FROM corretoras', (error, results) => {
    if (error) {
      console.error('Erro ao consultar o banco de dados:', error);
      return res.status(500).send('Erro ao consultar o banco de dados.');
    }

    // Adicione a propriedade "editing: false" a cada corretor do resultado da consulta
    const corretoras = results.map(corretora => {
      return { ...corretora, editing: false };
    });
  res.render('corretoras', { corretoras });
  });
})

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

    res.cookie('alertSuccess','Corretor cadastrado com sucesso!', {maxAge: 3000});
    res.status(200).send('Corretor cadastrado com sucesso.');
  });
});

app.post('/cadastrar-corretora', (req, res) => {
  const { cnpj, razaoSocial, nomeFantasia } = req.body;
  // Consulta SQL para inserir o novo corretor na tabela corretores
  const sql = 'INSERT INTO corretoras (cnpj, razaoSocial, nomeFantasia) VALUES (?, ?, ?)';

  // Executar a consulta SQL com os valores do novo corretor
  db.query(sql, [cnpj, razaoSocial, nomeFantasia], (error, result) => {
    if (error) {
      console.error('Erro ao cadastrar a corretora:', error);
      return res.status(500).send('Erro ao cadastrar a corretora no banco de dados.');
    }

    res.cookie('alertSuccess','Corretora cadastrada com sucesso!', {maxAge: 3000});
    res.status(200).send('Corretora cadastrada com sucesso.');
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

    res.cookie('alertSuccess','Corretor excluído com sucesso!', {maxAge: 3000});
    res.status(200).send('Corretor excluído com sucesso.');
  });
});

app.delete('/corretoras/:id', (req, res) => {
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

app.get('/planos', (req, res) => {
  const queryPlanos = 'SELECT * FROM planos';
  const files = fs.readdirSync('arquivos/');

  db.query(queryPlanos, (err, resultPlanos) => {
    if (err) {
      console.error('Erro ao consultar o banco de dados:', err);
      res.status(500).send('Erro ao consultar os planos');
    } 
    res.render('planos', { planos: resultPlanos, files:files });
  })
});

app.post('/atualiza-planos', (req, res) => {
  const { plano } = req.body;

  // Inicie a transação
  db.beginTransaction((err) => {
    if (err) {
      console.error('Erro ao iniciar a transação:', err);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }

    // Verifique se o plano já existe no banco de dados
    const selectQuery = 'SELECT id FROM planos WHERE id = ?';
    db.query(selectQuery, [plano.id], (err, rows) => {
      if (err) {
        console.error('Erro ao consultar plano:', err);
        return rollbackAndRespond(res, 'Erro interno do servidor');
      }

      if (rows.length > 0) {
        // O plano existe, atualize-o
        const updateQuery = 'UPDATE planos SET nome_do_plano = ?, ans = ?, descricao = ?, observacoes = ?, logo = ?, banner = ? , contratacao= ?, coparticipacao = ?, abrangencia = ?, pgtoAnualAvista = ?, pgtoAnualCartao =? , pgtoAnualCartao3x = ? , reajuste = ? WHERE id = ?';
        db.query(updateQuery, [plano.nome_do_plano, plano.ans, plano.descricao, plano.observacoes, plano.logoSrc, plano.bannerSrc, plano.contratacao, plano.coparticipacao, plano.abrangencia, plano.pgtoAnualAvista, plano.pgtoAnualCartao, plano.pgtoAnualCartao3x, plano.reajuste, plano.id], (err, result) => {
          if (err) {
            console.error('Erro ao atualizar plano:', err);
            return rollbackAndRespond(res, 'Erro interno do servidor');
          }
          res.cookie('alertSuccess', 'Plano atualizado com sucesso', {maxAge: 3000});
          res.status(200).json({ message: 'Plano atualizado com sucesso' });
        });
      } else {
        // O plano não existe, crie-o
        const createQuery = 'INSERT INTO planos (nome_do_plano, ans, descricao, observacoes, logo, banner, contratacao, coparticipacao, abrangencia, pgtoAnualAvista, pgtoAnualCartao, pgtoAnualCartao3x, reajuste) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        db.query(createQuery, [plano.nome_do_plano, plano.ans, plano.descricao, plano.observacoes, plano.logoSrc, plano.bannerSrc, plano.contratacao, plano.coparticipacao, plano.abrangencia, plano.pgtoAnualAvista, plano.pgtoAnualCartao, plano.pgtoAnualCartao3x, plano.reajuste], (err, result) => {
          if (err) {
            console.error('Erro ao criar plano:', err);
            return rollbackAndRespond(res, 'Erro interno do servidor');
          }
          res.cookie('alertSuccess', 'Plano inserido com sucesso', {maxAge: 3000});
          res.status(200).json({ message: 'Plano inserido com sucesso' });
        });
      }
    });
  });
});

function rollbackAndRespond(res, message) {
  // Reverter a transação em caso de erro
  db.rollback(() => {
    console.error('Transação revertida.');
    res.status(500).json({ message });
  });
}

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

app.get('/entidades', verificaAutenticacao, (req, res) => {
  db.query('SELECT * FROM entidades', (error, resultsEntidades) => {
    if (error) throw error;
    res.render('entidades', { entidades: resultsEntidades});
  })
})

app.get('/api/profissoes/:id', verificaAutenticacao, (req, res) => {
  var idEntidade = req.params.id
  db.query('SELECT * FROM profissoes WHERE idEntidade = ?',[idEntidade], (error, resultsProfissoes) => {
    if (error) {
      res.status(500).json({ error: 'Erro ao buscar profissões' });
    } else {
      res.json(resultsProfissoes);
    }
  });
});

app.post('/editar-entidade/:id', verificaAutenticacao, (req, res) => {
  const idEntidade = req.params.id;
  const {
    nome,
    descricao,
    publico,
    documentos,
    taxa,
    profissoes
  } = req.body;

  const sql =
    'UPDATE entidades SET nome=?, descricao=?, publico=?, documentos=?, taxa=? WHERE id=?';
  const sqlDeleteProfissoes = 'DELETE FROM profissoes WHERE idEntidade = ?'
  const sqlInsertProfissoes = 'INSERT INTO profissoes (nome, idEntidade) VALUES (?, ?)';
  
  // Verifique se há algo dentro de profissoes
  if (Array.isArray(profissoes) && profissoes.length > 0) {
    db.query(sqlDeleteProfissoes, [idEntidade], (err, result) => {
      if(err){
        console.error('Erro ao deletar profissões relacionadas', err)
      }
      db.query( sql, [nome, descricao, publico, documentos, taxa, idEntidade],(error, result) => {
        if (error) {
          console.error('Erro ao atualizar entidade:', error);
          res.cookie('alertError', 'Erro ao atualizar Entidade, verifique e tente novamente', {
            maxAge: 3000,
          });
          res.status(500).json({ message: 'Erro interno do servidor' });
        }
        profissoes.forEach((profissao) => {
          db.query(sqlInsertProfissoes, [profissao, idEntidade], (err, result) => {
            if(err){
              console.error('Erro ao CADASTRAR profissões relacionadas', err)
            }
            res.cookie('alertSuccess', 'Entidade atualizada com Sucesso', { maxAge: 3000 });
            res.status(200).json({ message: 'Entidade atualizada com sucesso' });
          });
        })
      })  
    });
  } else {
    // Se profissoes estiver vazio, continue sem excluir ou inserir
    db.query( sql, [nome, descricao, publico, documentos, taxa, idEntidade],(error, result) => {
      if (error) {
        console.error('Erro ao atualizar entidade:', error);
        res.cookie('alertError', 'Erro ao atualizar Entidade, verifique e tente novamente', {
          maxAge: 3000,
        });
        res.status(500).json({ message: 'Erro interno do servidor' });
      }
      res.cookie('alertSuccess', 'Entidade atualizada com Sucesso', { maxAge: 3000 });
      res.status(200).json({ message: 'Entidade atualizada com sucesso' });
    });
  }
});

app.delete('/excluir-entidade/:id', verificaAutenticacao, (req, res) => {
  const idEntidade = req.params.id;

  // Verifique se existem registros na tabela "formularios_entidades" vinculados a esta entidade
  const sqlCheckRelacionamento = 'SELECT COUNT(*) AS count FROM formularios_entidades WHERE entidade_id = ?';

  db.query(sqlCheckRelacionamento, [idEntidade], (error, result) => {
    if (error) {
      console.error('Erro ao verificar relacionamentos:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    } else {
      const countRelacionamentos = result[0].count;

      if (countRelacionamentos > 0) {
        // Se houver relacionamentos, não é possível excluir a entidade
        res.status(400).json({ message: 'Não é possível excluir a entidade, pois existem formulários vinculados a ela' });
      } else {
        // Se não houver relacionamentos, é seguro excluir a entidade
        const sqlExcluirEntidade = 'DELETE FROM entidades WHERE id = ?';

        db.query(sqlExcluirEntidade, [idEntidade], (error, result) => {
          if (error) {
            console.error('Erro ao excluir a entidade:', error);
            res.status(500).json({ message: 'Erro interno do servidor' });
          } else {
            res.cookie('alertSuccess', 'Entidade excluída com sucesso', { maxAge: 3000 })
            res.status(200).json({ message: 'Entidade excluída com sucesso' });
          }
        });
      }
    }
  });
});

app.post('/cadastrar-entidade', verificaAutenticacao, (req, res) => {
  const { nome, descricao, publico, documentos, taxa, profissoes } = req.body;
  const sql = 'INSERT INTO entidades (nome, descricao, publico, documentos, taxa) VALUES (?, ?, ?, ?, ?)'
  const sqlProfissoes = 'INSERT INTO profissoes (nome, idEntidade) VALUES(?, ?)'
  db.query(sql, [nome, descricao, publico, documentos, taxa], (error, result) => {
    if (error) {
      console.error('Erro ao cadastrar entidade:', error);
      res.cookie('alertError', 'Erro ao cadastrar Entidade, verifique e tente novamente', { maxAge: 3000 });
      res.status(500).json({ message: 'Erro interno do servidor' });
    }

    const idEntidade = result.insertId;

    if (Array.isArray(profissoes)){
      profissoes.forEach((profissao) => {
        db.query(sqlProfissoes, [profissao, idEntidade], (err, result) => {
          if(err){
            comsole.error('Erro ao cadastrar profissao relacionada', err)
          }     
        })
      })
    }
    res.cookie('alertSuccess', 'Entidade criada com Sucesso', { maxAge: 3000 });
    res.status(200).json({ message: 'Nova entidade criada com sucesso' });
  })
});

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
