const { db, connectToDatabase } = require('./database');
const express = require("express");
const app = new express();
const ejs = require("ejs");
const path = require('path')
const bodyParser = require("body-parser");
const session = require("express-session");
const crypto = require("crypto");
const cookie = require('cookie-parser');
const multer = require('multer');
const fs = require('fs');
const axios = require('axios');
const winston = require('winston')
const uuid = require('uuid');
const { format } = require('date-fns');
const { ptBR } = require('date-fns/locale');
const nodemailer = require('nodemailer');
const juice = require('juice');
const port = process.env.PORT || 5586;
const appUrl = process.env.APP_URL || 'http://localhost:5586';


/* Verificar se usuário está logado */
const verificaAutenticacao = (req, res, next) => {
  if (req.session && req.session.usuario) {
    res.locals.user = req.session.usuario;
    next();
  } else {
    req.session.originalUrl = req.originalUrl;
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

/* CONEXÃO COM BANCO DE DADOS */

connectToDatabase()
    .then(() => {
        app.listen(port, () => {
            console.log(`Servidor rodando na porta ${port}`);
        });
    })
    .catch((error) => {
        app.get('*', (req, res) => {
            res.redirect('/error404');
        });
        console.error('Erro ao conectar ao banco de dados:', error);
        process.exit(1);
    });

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

/* Criação de rota e ambiente de upload de arquivos */

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const modifiedFileName = file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname);
    // Salve o nome original e o nome modificado em req.locals para acessá-lo posteriormente
    req.locals = {
      originalName: file.originalname,
      modifiedName: modifiedFileName
    };
    cb(null, modifiedFileName);
  }
});

const storageForm = multer.diskStorage({
  destination: 'formulario/',
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const logger = winston.createLogger({
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join('erros', 'error.log.json'),
    }),
  ],
});

const uploadForm = multer({ storage: storageForm });

const upload = multer({ storage: storage });

app.get('/files', verificaAutenticacao, (req, res) => {
  const files = fs.readdirSync('arquivos/');
  res.render('uploads', { files: files, rotaAtual: 'files' })
})

/* app.post('/uploadRestrito', verificaAutenticacao, upload.single('file'), (req, res) => {
  res.json('Enviado com sucesso');
}); */

app.post('/upload', upload.array('file'), (req, res) => {
  // Obtenha o caminho e o nome do arquivo modificado
  const filepaths = req.files.map(file => ({
    originalName: req.locals.originalName,
    modifiedName: file.filename,
    filepath: path.join(__dirname, 'uploads', file.filename)
  }));
  res.json({ filepaths });
});

// Rota para remover um arquivo
app.post('/remove', (req, res) => {
  const { removefile } = req.body;
  console.log({removefile});
  const filepath = path.join(__dirname, 'uploads', removefile);
  console.log(filepath);
  
  // Remove o arquivo
  fs.unlink(filepath, (err) => {
    if (err) {
      console.error(err);
      res.status(500).send('Erro ao remover o arquivo.');
    } else {
      res.send('Arquivo removido com sucesso.');
    }
  });
});

app.post('/deleteImage', verificaAutenticacao, (req, res) => {
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

app.post('/salvarLogo', verificaAutenticacao, (req, res) => {
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
  db.query(queryPlanos, (err, resultPlanos) => {
    if (err) {
      console.error('Erro ao consultar o banco de dados:', err);
      return res.status(500).json({ error: 'Erro ao processar consulta ao BD' })
    }
    res.render("index", { planos: resultPlanos});
  })
});

app.post("/formulario", (req,res) => {
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
        if (err) {
          console.error('Erro ao resgatar profissoes do BD')
        }
        const planoSelecionado = result[0];
        /* req.session.planoSelecionado = planoSelecionado; */
        res.render("form", { planoSelecionado: planoSelecionado, profissoes: resultProfissoes });
      })
    }
  });

})

app.post("/enviadados", async (req, res) => {
  const dependentes = [];

  req.session.planoSelecionado;
  req.session.dadosTitular;
  req.session.dadosResponsavelFinanceiro;
  req.session.dadosEndereco;
  req.session.dadosCorretor;
  req.session.dadosDependentes;
  req.session.dadosDocumentos;

  let planoSelecionado = req.session.planoSelecionado;
  let dadosTitular = req.session.dadosTitular

  const dadosAceite = req.body

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
        cpffinanceiro: dados.cpffinanceiro || dados.cpftitular,
        nomefinanceiro: dados.nomefinanceiro || dados.nomecompleto,
        datadenascimentofinanceiro: dados.datadenascimentofinanceiro || dados.datadenascimento,
        telefonetitularfinanceiro: dados.telefonetitularfinanceiro || dados.telefonetitular,
        emailtitularfinanceiro: dados.emailtitularfinanceiro || dados.emailtitular, 
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

      const numeroPropostaGerado = await consultarNumeroProposta(idImplantacao)

      const emailTitular = await consultarEmailTitular(idImplantacao)

      if(dados.formaPagamento === 1) {
        await sendStatus(idImplantacao, 3, 'Forma de Pagamento escolhida BOLETO');        
      }

      await sendContractEmail(emailTitular, idImplantacao, numeroPropostaGerado, dados.cpffinanceiro, dados.nomefinanceiro);

      await sendStatus(idImplantacao, 2, 'Implantação realizada com sucesso ao Ecommerce');

      await commitTransaction();

      console.log("Dados inseridos com sucesso");
      res.render("sucesso", { numeroPropostaGerado });
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
          logger.error({
            message: 'Erro ao inserir documentos',
            error: err.message,
            stack: err.stack,
            timestamp: new Date().toISOString()
          });
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
            logger.error({
              message: 'Erro ao inserir dependentes',
              error: err.message,
              stack: err.stack,
              timestamp: new Date().toISOString()
            });
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

  function consultarNumeroProposta(idImplantacao) {
    return new Promise((resolve, reject) => {
      db.query('SELECT numeroProposta FROM implantacoes WHERE id=?', [idImplantacao], (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result[0].numeroProposta);
        }
      });
    });
  }

  async function commitTransaction() {
    return new Promise((resolve, reject) => {
      db.commit((err) => {
        if (err) {
          logger.error({
            message: 'Erro ao dar Commit no BD das infos',
            error: err.message,
            stack: err.stack,
            timestamp: new Date().toISOString()
          });
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

app.get("/buscar-corretor", async (req, res) => {
  try {
    const cpfCorretor = req.query.cpfcorretor;

    const token = 'X43ADVSEXM';
    const senhaApi = 'kgt87pkxc2';

    const config = {
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8',
        'token': `${token}`,
        'senhaApi': senhaApi,
      },
    };

    // Fazer a solicitação à API
    const apiUrl = `https://digitalsaude.com.br/api/v2/produtor/procurarPorNumeroDocumento?numeroDocumento=${cpfCorretor}`;
    const response = await axios.get(apiUrl, config);

    // Verificar se a API retornou algum resultado
    if (response.data.length === 0) {
      return res.status(404).json({ error: 'Corretor não encontrado' });
    }

    // Extrair os dados relevantes
    const corretorData = response.data;
    const nomeCorretor = corretorData[0].nome;
    const telefoneCorretor = corretorData[0].telefone;

    // Manipular os dados do produtor (se existirem)
    let dadosProdutores = [];

    if (corretorData.length > 0) {
        corretorData.forEach(corretor => {
            if (corretor.produtor && corretor.produtor.nome) {
                dadosProdutores.push({nome: corretor.produtor.nome, numeroDocumento: corretor.produtor.numeroDocumento});
            } else {
                nomeProdutores.push("Nome do produtor não encontrado");
            }
        });
    } else {
        if (corretorData.produtor && corretorData.produtor.nome) {
          dadosProdutores.push({ nome: corretorData.produtor.nome, numeroDocumento: corretorData.produtor.numeroDocumento });
        } else {
          nomeProdutores.push("Nome do produtor não encontrado");
    }
    }
    
    const responseData = {
      nome: nomeCorretor,
      telefone: telefoneCorretor,
      nomeProdutores: dadosProdutores,
    };

    console.log(responseData)

    res.json(responseData);
    
  } catch (err) {
    console.error('Erro ao consultar a API:', err);
    logger.error({
      message: 'Erro ao consultar API de busca de corretores do Digital',
      error: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString()
    });
    return res.status(500).json({ error: 'Erro ao processar consulta à API' });
  }
});

app.get('/buscar-cep', async (req, res) => {
  const { cep } = req.query;

  try {
    const response = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);
    const data = response.data;
    res.json(data);
  } catch (error) {
    console.error('Erro na busca de CEP:', error.message);
    res.status(500).json({ error: 'Erro na busca de CEP' });
  }
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

async function sendStatus(idImplantacao, idStatus, mensagem){
  const query = 'INSERT INTO status_implantacao (idstatus, idimplantacao, mensagem) VALUES (?, ?, ?)'
  db.query(query, [idStatus, idImplantacao, mensagem], (err, result) => {
    if (err){
      console.log('Erro ao inserir valores na tabela de status' + err)
      logger.error({
        message: 'Erro ao inserir valores na tabela de status',
        error: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString()
      });
    }
    return
  })
}

app.get('/preview-email', (req, res) => {
  const dadosEmail = {
      nomeTitularFinanceiro: "Nome Exemplo Cliente",
      linkAleatorio: "http://exemplo.com/link"
  };

  res.render('emailTemplate', dadosEmail);
});

app.get('/preview-success', (req, res) => {
  const dados = {
    numeroPropostaGerado: 2023456785,
    nomeCliente: 'Teste de Nome Cliente'
  }
  res.render('sucesso', dados)
});

function consultarEmailTitular(idImplantacao) {
  return new Promise((resolve, reject) => {
    db.query('SELECT emailtitularfinanceiro FROM implantacoes WHERE id=?', [idImplantacao], (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result[0].emailtitular);
      }
    });
  });
}

async function sendContractEmail(email, idImplantacao, numeroProposta, cpfTitularFinanceiro,nomeTitularFinanceiro) {
  return new Promise(async (resolve, reject) => {
    const transporter = nodemailer.createTransport({
      host: 'mail.mounthermon.com.br',
      port: 587,
      secure: false,
      auth: {
        user: 'naoresponda@mounthermon.com.br',
        pass: '5w55t5$Ev'
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const linkAleatorio = `${appUrl}/assinar/${idImplantacao}/${numeroProposta}/${cpfTitularFinanceiro}`;

    const html = await ejs.renderFile(path.join(__dirname, '../DentalEcommerce/views/emailTemplate.ejs'), {
      nomeTitularFinanceiro,
      linkAleatorio
    });

    const htmlWithInlineStyles = juice(html);

    const mailOptions = {
      from: 'naoresponda@mounthermon.com.br',
      to: email,
      subject: `MOUNT HERMON - Assinatura Proposta Nº ${numeroProposta}`,
      html: htmlWithInlineStyles
    };

    try {
      await transporter.sendMail(mailOptions);
      resolve(); // Resolva a promessa se o e-mail for enviado com sucesso
    } catch (error) {
      logger.error({
        message: 'Erro no envio do email ao beneficiário para assinatura',
        error: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString()
      });
      reject(error); // Rejeite a promessa se houver um erro no envio do e-mail
    }
  });
}

app.get("/enviar-email/:id", async (req, res) => {
  const idImplantacao = req.params.id;
  const queryImplantacoes =   'SELECT * FROM implantacoes WHERE id=?'
  db.query(queryImplantacoes, [idImplantacao], (err, result) => {
    if(err){
      res.cookie('alertError', 'Erro ao pegar dados do beneficiário para disparo de email', { maxAge: 3000 });
    }

    console.log(result)
    let implantacao = result[0];
    try {
      sendContractEmail(implantacao.emailtitularfinanceiro, idImplantacao, implantacao.numeroProposta, implantacao.cpffinanceiro, implantacao.nomefinanceiro);
      res.cookie('alertSuccess', 'Disparo de email feito com sucesso, aguarde até 5 minutos para verificar se usuário recebe o email', { maxAge: 3000 });
      res.status(200).send('Corretor cadastrado com sucesso.');
    } catch (error) {
      console.error(error);
      res.status(500).send('Erro ao enviar o e-mail');
    }
  })
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/assinar/:idImplantacao/:numeroProposta/:cpfTitularFinanceiro", (req, res) => {
  const numeroProposta = req.params.numeroProposta;
  const cpfTitular = req.params.cpfTitularFinanceiro;

  const idImplantacao = req.params.idImplantacao;
  const queryImplantacoes = 'SELECT * FROM implantacoes WHERE id=?';
  const queryPlano = 'SELECT * FROM planos WHERE id=?';
  const queryProfissao = 'SELECT * FROM profissoes WHERE nome= ?';
  const queryEntidade = 'SELECT * FROM entidades WHERE id=?';
  const queryDependentes = 'SELECT * FROM dependentes WHERE id_implantacoes = ?'
  const queryDocumentos = 'SELECT * FROM documentos_implantacoes WHERE id_implantacao = ?'
  const queryAssinatura = 'SELECT * FROM assinatura_implantacao WHERE id_implantacao = ?'

  db.query(queryImplantacoes, [idImplantacao], (err, resultImplantacoes) => {
    if (err) {
      logger.error({
        message: 'ROTA: ASSINAR | ERRO: ao buscar a implantação no banco de dados',
        error: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString()
      });
      console.log('Erro ao buscar implantação no BD', err);
      res.status(500).send('Erro ao buscar implantação no BD');
      return;
    }

    if (resultImplantacoes.length === 0) {
      logger.error({
        message: 'ROTA: ASSINAR | ERRO: Implantação não foi encontrada',
        error: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString()
      });
      res.status(404).send('Implantação não encontrada');
      return;
    }

    const idImplantacao = resultImplantacoes[0].id;

    const nomeProfissao = resultImplantacoes[0].profissaotitular;

    db.query(queryProfissao, [nomeProfissao], (err, resultProfissao) => {
      if (err) {
        logger.error({
          message: 'ROTA: ASSINAR | ERRO: Erro ao buscar dados da entidade relacionada a profissão',
          error: err.message,
          stack: err.stack,
          timestamp: new Date().toISOString()
        });
        console.error('Erro ao buscar dados da entidade relacionada a profissão')
      }
      const entidadeId = resultProfissao[0].idEntidade;

      db.query(queryEntidade, [entidadeId], (err, resultEntidade) => {
        if (err) {
          logger.error({
            message: 'ROTA: ASSINAR | ERRO: ao buscar entidade relacionada',
            error: err.message,
            stack: err.stack,
            timestamp: new Date().toISOString()
          });
          console.error('Erro puxar entidade relacionada', err)
        }
        const planoId = resultImplantacoes[0].planoSelecionado;
        db.query(queryPlano, [planoId], (err, resultPlano) => {
          if (err) {
            logger.error({
              message: 'ROTA: ASSINAR | ERRO: ao buscar plano vinculado a implantação',
              error: err.message,
              stack: err.stack,
              timestamp: new Date().toISOString()
            });
            console.error('Erro ao buscar plano vinculado à implantação', err);
            res.status(500).send('Erro ao buscar plano vinculado à implantação');
            return;
          }
          db.query(queryDependentes, [idImplantacao], (err, resultDependentes) => {
            if (err) {
              logger.error({
                message: 'ROTA: ASSINAR | ERRO: Ao buscar dependentes vinculados a essa implantação',
                error: err.message,
                stack: err.stack,
                timestamp: new Date().toISOString()
              });
              console.error('Erro na busca pelos dependentes vinculados a essa implantacao', err)
            }
            db.query(queryDocumentos, [idImplantacao], (err, resultDocumentos) => {
              if (err) {
                logger.error({
                  message: 'ROTA: ASSINAR | ERRO: ao buscar documentos vinculados a implantação',
                  error: err.message,
                  stack: err.stack,
                  timestamp: new Date().toISOString()
                });
                console.error('Erro na busca pelos documentos vinculados a implantação', err)
              }
              db.query(queryAssinatura, [idImplantacao], (err, resultAssinatura) => {
                if(err){
                  logger.error({
                    message: 'ROTA: ASSINAR | ERRO: ao pegar a assinatura vinculada',
                    error: err.message,
                    stack: err.stack,
                    timestamp: new Date().toISOString()
                  });
                  console.error('Erro ao pegar assinatura', err)
                }
                const data_implantacao = new Date(resultImplantacoes[0].data_implantacao);
                const dia = String(data_implantacao.getDate()).padStart(2, '0');
                const mes = String(data_implantacao.getMonth() + 1).padStart(2, '0');
                const ano = data_implantacao.getFullYear();
                const dataFormatada = `${dia}/${mes}/${ano}`;

                const assinaturaBase64 = resultAssinatura.length > 0 && resultAssinatura[0] ? resultAssinatura[0].assinatura_base64 : null;
                
                res.render('contrato', { implantacao: resultImplantacoes[0], plano: resultPlano[0], dataFormatada: dataFormatada, entidade: resultEntidade[0], profissao: resultProfissao[0], dependentes: resultDependentes, documento: resultDocumentos[0], assinaturaBase64: assinaturaBase64 });

              })
            })
          })
        })
      })
    });
  })
});

app.post('/salva-assinatura', (req,res) => {
  const idImplantacao = req.body.idImplantacao;
  const assinatura = req.body.assinatura_base64;
  const sqlInsertAsign = 'INSERT INTO assinatura_implantacao( id_implantacao, assinatura_base64) VALUES (?,?)';

  db.query(sqlInsertAsign, [idImplantacao, assinatura], async (err, result) => {
    if(err){
      logger.error({
        message: 'ROTA: ASSINAR | ERRO: ao salvar assinatura do beneficiário',
        error: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString()
      });

      console.error('Erro ao salvar assinatura do beneficiário')
      res.cookie('alertError', 'Erro ao salvar assinatura, contate o suporte')
      res.status(500).send('Erro ao enviar assinatura, solicite auxílio do suporte');
    }
    await sendStatus(idImplantacao, 2, 'Proposta assinada pelo contratante');
    res.cookie('alertSuccess', 'Assinatura feita com sucesso', { maxAge: 3000 });
    res.status(200).send('Corretor cadastrado com sucesso.');
  })
})

app.post('/login-verifica', (req, res) => {
  const { username, password } = req.body;

  const query = 'SELECT * FROM users WHERE username = ?';
  db.query(query, [username], (err, results) => {
    if (err) {
      console.error('Erro ao consultar o banco de dados:', err);
      return res.render('login', { error: 'Erro no servidor contate o suporte' });
    }

    if (results.length === 0) {
      return res.render('login', { error: 'Usuário não encontrado' });
    }

    const user = results[0];

    if (user.password !== password) {
      return res.render('login', { error: 'Senha incorreta' });
    }

    // Após o login, redireciona para a URL original armazenada na sessão ou para '/'
    const originalUrl = req.session.originalUrl || '/';
    delete req.session.originalUrl; // Limpa a URL original da sessão
    req.session.usuario = user;
    res.redirect(originalUrl);
  });
});

app.get('/sucesso', (req, res) => {
  res.render('sucesso', {numeroPropostaGerado: '264646464'})
})

app.get('/implantacoes', verificaAutenticacao, (req, res) => {
  const query = 'SELECT i.id, i.numeroProposta, i.cpftitular, i.nomecompleto, i.data_implantacao, i.planoSelecionado, p.nome_do_plano FROM implantacoes i JOIN planos p ON i.planoSelecionado = p.id';
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Erro ao consultar o banco de dados:', err);
      res.status(500).send('Erro ao processar a solicitação');
    } else {
      res.render('implantacoes', { implantacoes: results, format: format, ptBR: ptBR, rotaAtual: 'implantacoes' });
    }
  });
});

app.get('/implantacao/:id', verificaAutenticacao, (req, res) => {
  const idImplantacao = req.params.id;

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
        rotaAtual: 'implantacoes'
      });
    });
  });
});

app.get('/visualizaImplantacao/:id', verificaAutenticacao, (req, res) => {
  const idImplantacao = req.params.id;
  const queryImplantacoes = 'SELECT * FROM implantacoes WHERE id=?';
  const queryPlano = 'SELECT * FROM planos WHERE id=?';
  const queryProfissao = 'SELECT * FROM profissoes WHERE nome= ?';
  const queryEntidade = 'SELECT * FROM entidades WHERE id=?';
  const queryDependentes = 'SELECT * FROM dependentes WHERE id_implantacoes = ?'
  const queryDocumentos = 'SELECT * FROM documentos_implantacoes WHERE id_implantacao = ?'
  const queryStatus = 'SELECT * FROM status_implantacao WHERE idimplantacao = ?'


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
      if (err) {
        console.error('Erro ao buscar dados da entidade relacionada a profissão')
      }
      const entidadeId = resultProfissao[0].idEntidade;

      db.query(queryEntidade, [entidadeId], (err, resultEntidade) => {
        if (err) {
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
            if (err) {
              console.error('Erro na busca pelos dependentes vinculados a essa implantacao', err)
            }
            db.query(queryDocumentos, [idImplantacao], (err, resultDocumentos) => {
              if (err) {
                console.error('Erro na busca pelos documentos vinculados a implantação', err)
              }
              db.query(queryStatus, [idImplantacao], (err, resultStatus) => {
                if(err) {
                  console.error('Erro ao buscar status da implantacao', err)
                }
                const data_implantacao = new Date(resultImplantacoes[0].data_implantacao);
                const dia = String(data_implantacao.getDate()).padStart(2, '0');
                const mes = String(data_implantacao.getMonth() + 1).padStart(2, '0');
                const ano = data_implantacao.getFullYear();
                const dataFormatada = `${dia}/${mes}/${ano}`;
  
                res.render('detalhes-implantacao', { implantacao: resultImplantacoes[0], plano: resultPlano[0], dataFormatada: dataFormatada, entidade: resultEntidade[0], profissao: resultProfissao[0], dependentes: resultDependentes, documento: resultDocumentos[0], status: resultStatus, rotaAtual: 'implantacoes' });
              })
            })
          })
        })
      })
    });
  })
});

app.get('/planos', verificaAutenticacao, (req, res) => {
  const queryPlanos = 'SELECT * FROM planos';
  const files = fs.readdirSync('arquivos/');

  db.query(queryPlanos, (err, resultPlanos) => {
    if (err) {
      console.error('Erro ao consultar o banco de dados:', err);
      res.status(500).send('Erro ao consultar os planos');
    }
    res.render('planos', { planos: resultPlanos, files: files, rotaAtual: 'planos' });
  })
});

app.post('/atualiza-planos', verificaAutenticacao, (req, res) => {
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
          res.cookie('alertSuccess', 'Plano atualizado com sucesso', { maxAge: 3000 });
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
          res.cookie('alertSuccess', 'Plano inserido com sucesso', { maxAge: 3000 });
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

app.post('/deleta-plano', verificaAutenticacao, (req, res) => {
  const idPlano = req.body.id;
  const query = 'DELETE FROM planos WHERE id = ?';
  db.query(query, [idPlano], (err, result) => {
    if (err) {
      console.error('Erro ao excluir plano, ou ID não existe, erro: ', err);
      return res.status(500).json({ message: 'Erro na exclusão do plano selecionado' });
    }
    res.status(200).json({ message: 'Plano excluído com sucesso ' });
  });
})

app.get('/entidades', verificaAutenticacao, (req, res) => {
  db.query('SELECT * FROM entidades', (error, resultsEntidades) => {
    if (error) throw error;
    res.render('entidades', { entidades: resultsEntidades, rotaAtual: 'entidades' });
  })
})

app.get('/api/profissoes/:id', verificaAutenticacao, (req, res) => {
  var idEntidade = req.params.id
  db.query('SELECT * FROM profissoes WHERE idEntidade = ?', [idEntidade], (error, resultsProfissoes) => {
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
      if (err) {
        console.error('Erro ao deletar profissões relacionadas', err)
      }
      db.query(sql, [nome, descricao, publico, documentos, taxa, idEntidade], (error, result) => {
        if (error) {
          console.error('Erro ao atualizar entidade:', error);
          res.cookie('alertError', 'Erro ao atualizar Entidade, verifique e tente novamente', {
            maxAge: 3000,
          });
          res.status(500).json({ message: 'Erro interno do servidor' });
        }
        profissoes.forEach((profissao) => {
          db.query(sqlInsertProfissoes, [profissao, idEntidade], (err, result) => {
            if (err) {
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
    db.query(sql, [nome, descricao, publico, documentos, taxa, idEntidade], (error, result) => {
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

    if (Array.isArray(profissoes)) {
      profissoes.forEach((profissao) => {
        db.query(sqlProfissoes, [profissao, idEntidade], (err, result) => {
          if (err) {
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

app.post('/error404', (res,req) => {
  res.render('404');
})

app.use((req, res, next) => {
  res.status(404).render('404');
});

