const express = require("express");
const app = new express();
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mysql = require("mysql2");
const session = require("express-session");
const crypto = require("crypto");
const { format } = require('date-fns');
const { ptBR } = require('date-fns/locale');

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
app.use("/bootstrap-icons", express.static("node_modules/bootstrap-icons"));
app.set("view engine", "ejs");
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

db.connect((error) => {
  if (error) {
    console.error("Erro ao conectar ao banco de dados:", error);
  } else {
    console.log("Conexão bem-sucedida ao banco de dados");
  }
});

// Definindo o objeto com dados dos planos
var planos = [
  {
    nome: "OdontoGroup - Plano Odonto Orto",
    logo: "",
    pagamentos: [
      { forma: "Á vista anual boleto ou Cartão de crédito", valor: 100 },
      { forma: "Mensal Cartão de Crédito", valor: 150 },
      { forma: "Mensal no Boleto", valor: 200 },
    ],
  },
  {
    nome: "DentalUni - Plano Elite",
    logo: "",
    pagamentos: [
      { forma: "Á vista anual boleto ou Cartão de crédito", valor: 120 },
      { forma: "Mensal Cartão de Crédito", valor: 170 },
      { forma: "Mensal no Boleto", valor: 220 },
    ],
  },
];

app.get("/", (req, res) => {
  res.render("index", { planos: planos });
});

app.get("/formulario", (req, res) => {
  const planoSelecionado = req.query.planoSelecionado;
  const planoCompleto = planos.find((plano) => plano.nome === planoSelecionado);
  res.render("formulario", { planos: planos, planoSelecionado: planoCompleto });
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

app.get('/implantacoes', verificaAutenticacao, (req, res) => {
  const query = 'SELECT id, cpftitular, nomecompleto, data_implantacao FROM implantacoes';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Erro ao consultar o banco de dados:', err);
      res.status(500).send('Erro ao processar a solicitação');
    } else {
      res.render('implantacoes', { implantacoes: results, format: format, ptBR: ptBR });
    }
  });
});

app.get('/implantacao/:id', verificaAutenticacao, (req, res) => {
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



app.listen(8888);
