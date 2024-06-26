const { 
  mysql,
  qInsImplantacao, 
  qInsDependentes,
  config,
  qInsEntidade
} = require("./database");
const express = require("express");
const app = new express();
const ejs = require("ejs");
const path = require("path");
const bodyParser = require("body-parser");
const session = require("express-session");
const crypto = require("crypto");
const cookie = require("cookie-parser");
const multer = require("multer");
const {
  ServicePrincipalCredentials,
  PDFServices,
  MimeType,
  DocumentMergeParams,
  OutputFormat,
  DocumentMergeJob,
  DocumentMergeResult,
  SDKError,
  ServiceUsageError,
  ServiceApiError
} = require("@adobe/pdfservices-node-sdk");
const fs = require("fs");
const fsPromises = require("fs").promises;
const axios = require("axios");
const winston = require("winston");
const uuid = require("uuid");
const { format } = require("date-fns");
const { ptBR } = require("date-fns/locale");
const nodemailer = require("nodemailer");
const juice = require("juice");
const { default: parseJSON } = require("date-fns/parseJSON");
const port = process.env.PORT || 5586;
const appUrl = process.env.APP_URL || "http://localhost:5586";

/* Verificar se usuário está logado */
const verificaAutenticacao = (req, res, next) => {
  if (req.session && req.session.usuario) {
    res.locals.user = req.session.usuario;
    next();
  } else {
    req.session.originalUrl = req.originalUrl;
    res.redirect("/login");
  }
};

/*CONDIÇÕES DE USO DA APLICAÇÃO */

app.use(bodyParser.urlencoded({ extended: true }));
app.use("/css", express.static("css"));
app.use("/js", express.static("js"));
app.use("/img", express.static("img"));
app.use("/arquivos", express.static("arquivos"));
app.use("/uploads", express.static("uploads"));
app.use("/formulario", express.static("formulario"));
app.use('/arquivospdf', express.static('arquivospdf'));
app.use("/bootstrap-icons", express.static("node_modules/bootstrap-icons"));
app.set("view engine", "ejs");
app.use(cookie());
app.use(express.json());



/* FUNÇÃO DE INSERÇÃO AO BANCO DE DADOS */

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
  destination: "uploads/",
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const modifiedFileName =
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname);
    // Salve o nome original e o nome modificado em req.locals para acessá-lo posteriormente
    req.locals = {
      originalName: file.originalname,
      modifiedName: modifiedFileName,
    };
    cb(null, modifiedFileName);
  },
});

const storageForm = multer.diskStorage({
  destination: "formulario/",
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const logger = winston.createLogger({
  level: "error",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join("erros", "error.log.json"),
    }),
  ],
});

const uploadForm = multer({ storage: storageForm });

const upload = multer({ storage: storage });


/* --------------------------------------- FUNÇÕES ÚTEIS --------------------------------- */

function consultarEmailTitular(idImplantacao) {
  return new Promise((resolve, reject) => {
    db.query(
      "SELECT emailtitularfinanceiro FROM implantacoes WHERE id=?",
      [idImplantacao],
      (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result[0].emailtitular);
        }
      }
    );
  });
}

async function salvarPDFProposta(dadosProposta, idProposta) {
  const db = await mysql.createPool(config);
  return new Promise(async (resolve, reject) => {
    let readStream;

    try {
        // Initial setup, create credentials instance
        const credentials = new ServicePrincipalCredentials({
            clientId: "2ccc988bc62c440fbee4c36db6464be0",
            clientSecret: "p8e-o-Hdu0cUQRuIV43fr3_KdE0qswIOtmPF"
        });

        // Creates a PDF Services instance
        const pdfServices = new PDFServices({
            credentials
        });

        // Setup input data for the document merge process
        const jsonDataForMerge = {
            nome: dadosProposta.nome,
            teste: dadosProposta.teste
        };

        // Creates an asset(s) from source file(s) and upload
        const inputDocxPath = path.join(__dirname, 'arquivospdf', 'propostaModelo.pdf');
        readStream = fs.createReadStream(inputDocxPath);
        const inputAsset = await pdfServices.upload({
            readStream,
            mimeType: MimeType.PDF
        });

        // Create parameters for the job
        const params = new DocumentMergeParams({
            jsonDataForMerge,
            outputFormat: OutputFormat.PDF
        });

        // Creates a new job instance
        const job = new DocumentMergeJob({
            inputAsset,
            params
        });

        // Submit the job and get the job result
        const pollingURL = await pdfServices.submit({
            job
        });
        const pdfServicesResponse = await pdfServices.getJobResult({
            pollingURL,
            resultType: DocumentMergeResult
        });

        // Get content from the resulting asset(s)
        const resultAsset = pdfServicesResponse.result.asset;
        const streamAsset = await pdfServices.getContent({
            asset: resultAsset
        });

        // Creates a write stream and copy stream asset's content to it
        const outputFilePath = path.join(__dirname, 'arquivospdf', `Proposta Nº ${numeroProposta}.pdf`);
        console.log(`Saving asset at ${outputFilePath}`);

        const writeStream = fs.createWriteStream(outputFilePath);
        streamAsset.readStream.pipe(writeStream);

        writeStream.on('finish', async () => {
            try {
                // Conecte-se ao banco de dados
                await db.query(
                    'INSERT INTO Propostas (numeroProposta, caminhoArquivoPDF) VALUES (?, ?)',
                    [numeroProposta, outputFilePath], (err, result)
                );

                console.log('Dados inseridos com sucesso:');
                resolve();
            } catch (err) {
                console.error('Erro ao inserir dados no banco de dados:', err);
                reject(err);
            } finally {
                if (db) {
                    await db.end();
                }
            }
        });

        writeStream.on('error', (err) => {
            reject(err);
        });

    } catch (err) {
        if (err instanceof SDKError || err instanceof ServiceUsageError || err instanceof ServiceApiError) {
            console.log("Exception encountered while executing operation", err);
        } else {
            console.log("Exception encountered while executing operation", err);
        }
        reject(err);
    } finally {
        readStream?.destroy();
    }
  });
}

async function sendContractEmail(
  email,
  idImplantacao,
  numeroProposta,
  cpfTitularFinanceiro,
  nomeTitularFinanceiro,
  idEntidade
) {
  return new Promise(async (resolve, reject) => {
    const transporter = nodemailer.createTransport({
      host: "mail.mounthermon.com.br",
      port: 587,
      secure: false,
      auth: {
        user: "naoresponda@mounthermon.com.br",
        pass: "5w55t5$Ev",
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const linkAleatorio = `${appUrl}/assinar/${idImplantacao}/${numeroProposta}/${cpfTitularFinanceiro}/${idEntidade}`;

    const html = await ejs.renderFile(
      path.join(__dirname, "../DentalEcommerce/views/emailTemplate.ejs"),
      {
        nomeTitularFinanceiro,
        linkAleatorio,
      }
    );

    const htmlWithInlineStyles = juice(html);

    const mailOptions = {
      from: "naoresponda@mounthermon.com.br",
      to: email,
      subject: `MOUNT HERMON - Assinatura Proposta Nº ${numeroProposta}`,
      html: htmlWithInlineStyles,
    };

    try {
      await transporter.sendMail(mailOptions);
      resolve(); // Resolva a promessa se o e-mail for enviado com sucesso
    } catch (err) {
      logger.error({
        message: "Erro no envio do email ao beneficiário para assinatura",
        error: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString(),
      });
      reject(err); // Rejeite a promessa se houver um erro no envio do e-mail
    }
  });
}

function consultarNumeroProposta(idImplantacao) {
  return new Promise((resolve, reject) => {
    db.query(
      "SELECT numeroProposta FROM implantacoes WHERE id=?",
      [idImplantacao],
      (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result[0].numeroProposta);
        }
      }
    );
  });
}

async function salvarAnexos(idImplantacao, anexos) {
  const db = await mysql.createPool(config);
  const query = "INSERT INTO anexos_implantacoes (id_implantacao, nome_arquivo, caminho_arquivo) VALUES (?, ?, ?)";
  const promises = []; // Array para armazenar todas as promessas de inserção

  // Iterar sobre cada anexo e criar uma promessa para inseri-lo no banco de dados
  for (const [nomeArquivo, caminhoArquivo] of Object.entries(anexos)) {
    // Adicionar a promessa de inserção ao array de promessas
    promises.push(
      new Promise((resolve, reject) => {
        db.query(query, [idImplantacao, nomeArquivo, caminhoArquivo], (err, result) => {
          if (err) {
            reject(err); // Rejeitar a promessa em caso de erro
          } else {
            resolve(result); // Resolver a promessa se a inserção for bem-sucedida
          }
        });
      })
    );
  }

  // Esperar que todas as inserções sejam concluídas antes de retornar
  try {
    await Promise.all(promises);
    console.log("Todos os anexos foram inseridos com sucesso.");
  } catch (error) {
    console.error("Erro ao inserir anexos:", error);
    throw error; // Lançar o erro novamente para tratamento externo, se necessário
  }
}

/* async function insertData(query, values) {
  return new Promise((resolve, reject) => {
    db.query(query, values, (err, result) => {
      if (err) {
        logger.error({
          message: `Erro ao inserir pela Query ${query}`,
          error: err.message,
          stack: err.stack,
          timestamp: new Date().toISOString(),
        });
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
} */



function formatarDataDs(data) {
  var partesData = data.split('-');
  var dataFormatada = partesData[2] + '/' + partesData[1] + '/' + partesData[0];
  return dataFormatada;
}

async function enviarPropostaDigitalSaude(jsonModeloDS, idImplantacao) {
  const token = "X43ADVSEXM";
  const senhaApi = "kgt87pkxc2";
  const apiUrl = "https://digitalsaude.com.br/api/v2/contrato/";

  const data = JSON.stringify(jsonModeloDS);

  const configDS = {
    headers: {
      "Content-Type": "application/json",
      "token": token,
      "senhaApi": senhaApi
    }
  };

  console.log(data);

  try {
    const response = await axios.post(apiUrl, data, configDS);
    
    // Verificação dos códigos de status
    if (response.status === 200) {
      await sendStatus(idImplantacao, 4, 'Implantação realizada com sucesso no digital saúde');
      console.log("Proposta enviada com sucesso:", response.data);
      return { success: true, data: response.data };
    } else {
      await sendStatus(idImplantacao, 4, "Erro ao enviar proposta para o digital");
      console.error(`Erro: Recebido status ${response.status}`);
      return { success: false, message: `Erro: Recebido status ${response.status}` };
    }
  } catch (error) {
    await sendStatus(idImplantacao, 4, "Erro ao enviar proposta para o digital");
    if (error.response) {
      // A resposta foi recebida e o servidor respondeu com um código de status diferente de 2xx
      const status = error.response.status;
      let message = "Erro desconhecido ao enviar a proposta.";
      
      if (status === 400) {
        message = "Requisição inválida (400). Verifique os dados enviados.";
      } else if (status === 401) {
        message = "Acesso não autorizado (401). Verifique suas credenciais.";
      } else if (status === 500) {
        message = "Erro interno no servidor (500). Tente novamente mais tarde.";
      }
      
      console.error(message, error.response.data);
      return { success: false, message: message, data: error.response.data };
    } else {
      // Ocorreu um erro ao configurar a solicitação ou algo similar
      console.error("Erro ao enviar a proposta:", error.message);
      return { success: false, message: "Erro ao enviar a proposta.", data: error.message };
    }
  }
}


function generateRandomDigits(length) {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10);
  }
  return result;
}

async function generateUniqueProposalNumber() {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = (currentDate.getMonth() + 1).toString().padStart(2, "0"); // Mês com 2 dígitos
  const day = currentDate.getDate().toString().padStart(2, "0"); // Dia com 2 dígitos
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

async function checkProposalExists(proposalNumber) {
  const db = await mysql.createPool(config);
  return new Promise((resolve, reject) => {
    db.query(
      "SELECT * FROM implantacoes WHERE numeroProposta = ?",
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

const pool = mysql.createPool(config);

async function sendStatus(idImplantacao, idStatus, mensagem) {
  const db = await mysql.createPool(config);
  const query = "INSERT INTO status_implantacao (idstatus, idimplantacao, mensagem) VALUES (?, ?, ?)";
  
  try {
    const result = await db.query(query, [idStatus, idImplantacao, mensagem]);
    return result;
  } catch (err) {
    console.error("Erro ao inserir valores na tabela de status", err);
    logger.error({
      message: "Erro ao inserir valores na tabela de status",
      error: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString(),
    });
    throw err; // Relance o erro para que a função chamadora possa tratá-lo
  }
}

function rollbackAndRespond(res, message) {
  // Finalize a transação com rollback
  db.query("ROLLBACK;", [], (err) => {
    if (err) {
      console.error("Erro ao realizar rollback:", err);
    }
    res.status(500).json({ message });
  });
}

async function enviarErroDiscord(mensagem) {
  try {
    await axios.post('https://bot.midiaideal.com/mensagem-erros-ecommerce', { mensagem });
    console.log('Mensagem enviada com sucesso');
  } catch (error) {
      console.error('Erro ao enviar mensagem erro:', error);
  }
}

/* ---------------------------------------- ROTAS ---------------------------------------- */

app.get("/files", verificaAutenticacao, (req, res) => {
  const files = fs.readdirSync("arquivos/");
  res.render("uploads", { files: files, rotaAtual: "files" });
});

app.get('/mandarMensagemRobo/:mensagem', (req,res) => {
  const mensagem = req.params.mensagem;
  enviarErroDiscord(mensagem);
  res.send('mensagem enviada com sucesso')
})

//Rotas para upload
app.post("/upload", upload.array("file"), (req, res) => {
  const filepaths = req.files.map((file) => ({
    originalName: req.locals.originalName,
    modifiedName: file.filename,
    filepath: path.join(appUrl, "uploads", file.filename),
  }));
  console.log({ filepaths });
  res.json({ filepaths });
});

/* ROTA PARA REMOVER ARQUIVOS QUE FORAM FEITOS UPLOAD PELO FORMULÁRIO */
app.post("/remove", (req, res) => {
  const { removefile } = req.body;
  console.log("chamou a rota de remover");
  const filepath = path.join("uploads", removefile);

  fs.unlink(filepath, (err) => {
    if (err) {
      console.error(err);
      res.status(500).send("Erro ao remover o arquivo.");
    } else {
      res.send("Arquivo removido com sucesso.");
    }
  });
});

app.post("/deleteImage", verificaAutenticacao, (req, res) => {
  const file = path.join(__dirname, req.body.img);
  if (fs.existsSync(file)) {
    try {
      // Exclui o arquivo
      fs.unlinkSync(file);
      res.json({ success: true, message: "Imagem excluída com sucesso!" });
    } catch (error) {
      console.error("Erro ao excluir a imagem:", error);
      res.json({ success: false, message: "Erro ao excluir a imagem." });
    }
  } else {
    res.json({ success: false, message: "Arquivo não encontrado em: " + file });
  }
});

app.post("/salvarLogo", verificaAutenticacao, (req, res) => {
  const logo = req.body.logoUrl;
  const operadoraId = req.body.operadoraId;
  const query = "UPDATE planos SET logo = ? WHERE id = ?";
  db.query(query, [logo, operadoraId], (err, result) => {
    if (err) {
      console.error("Erro ao atualizar operadora:", err);

      // Reverter a transação em caso de erro
      db.rollback(() => {
        console.error("Transação revertida.");
        return res.status(500).json({ message: "Erro interno do servidor" });
      });
    }

    // Confirmar a transação
    db.commit((err) => {
      if (err) {
        console.error("Erro ao confirmar a transação:", err);

        // Reverter a transação em caso de erro
        db.rollback(() => {
          console.error("Transação revertida.");
          return res.status(500).json({ message: "Erro interno do servidor" });
        });
      }

      res.cookie("alerta", "✅ Logo da operadora atualizado com SUCESSO", {
        maxAge: 3000,
      });
      res.status(200).json({ message: "Operadora atualizada com sucesso" });
    });
  });
});

/* FIM DE SEÇÃO DE UPLOAD INTERNO DAS MÍDIAS */

app.get("/", async (req, res) => {
  const db = await mysql.createPool(config);
  const queryPlanos = "SELECT * FROM planos";
  db.query(queryPlanos, (err, resultPlanos) => {
    if (err) {
      console.error("Erro ao consultar o banco de dados:", err);
      return res
        .status(500)
        .json({ error: "Erro ao processar consulta ao BD" });
    }
    res.render("index", { planos: resultPlanos });
  });
});

app.post("/formulario", async (req, res) => {
  const db = await mysql.createPool(config);
  const planoId = req.body.planoSelecionado;
  const query = "SELECT * FROM planos WHERE id = ?";
  const queryProfissoes = "SELECT * FROM profissoes";
  db.query(query, [planoId], (err, result) => {
    if (err) {
      console.error("Erro ao consultar o banco de dados:", err);
      return res
        .status(500)
        .json({ error: "Erro ao processar consulta ao BD" });
    } else {
      if (result.length === 0) {
        return res.status(404).json({ error: "Plano não encontrado" });
      }
      db.query(queryProfissoes, (err, resultProfissoes) => {
        if (err) {
          console.error("Erro ao resgatar profissoes do BD");
        }
        const planoSelecionado = result[0];
        /* req.session.planoSelecionado = planoSelecionado; */
        res.render("form", {
          planoSelecionado: planoSelecionado,
          profissoes: resultProfissoes,
        });
      });
    }
  });
});

app.post("/testeFormularioDS", async (req, res) => {
  const dados = req.body.inputs;
  const dependentes = req.body.dependentes;
  const anexos = req.body.anexos;
  const numeroProposta = await generateUniqueProposalNumber();
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
    cpffinanceiro:
      dados.cpffinanceiro || dados.cpftitular,
    nomefinanceiro:
      dados.nomefinanceiro || dados.nomecompleto,
    datadenascimentofinanceiro:
      dados.datadenascimentofinanceiro || dados.datadenascimento,
    telefonetitularfinanceiro:
      dados.telefonetitularfinanceiro || dados.telefonetitular,
    emailtitularfinanceiro:
      dados.emailtitularfinanceiro || dados.emailtitular,
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
    numeroProposta: numeroProposta,
    planoSelecionado: dados.planoSelecionado,
  };

  console.log(dadosImplantacao)

  const jsonModeloDS = {
    "numeroProposta": `${numeroProposta}`,
    "dataAssinatura": "26/02/2024",
    "diaVencimento": 1,
    "cpfResponsavel": dados.cpffinanceiro ? dados.cpffinanceiro : dados.cpftitular,
    "nomeResponsavel": dados.nomefinanceiro ? dados.nomefinanceiro : dados.nomecompleto,
    "observacao": `teste`,
    "plano": {
      "codigo": "VMR5GRUEPJ"
    },
    "convenio": {
      "codigo": "LRYT12JW8T"
    },
    "produtor": {
      "codigo": "E17NJPUZM2"
    },
    "corretora": {
      "codigo": "S62MXENV8X"
    },
    "grupo": {
      "codigo": "V2CAVAD6U2"
    },
    "filial": {
      "codigo": "BETRHPTL2K"
    },
    "beneficiarioList": [
      {
        "nome": dados.nomecompleto,
        "dataNascimento": formatarDataDs(dados.datadenascimento),
        "rg": dados.rgtitular,
        "orgaoEmissor": dados.orgaoexpedidor,
        "cpf": dados.cpftitular,
        "dnv": "string",
        "pis": "string",
        "nomeMae": dados.nomemaetitular,
        "endereco": dados.enderecoresidencial,
        "numero": dados.numeroendereco,
        "complemento": dados.complementoendereco,
        "bairro": dados.bairro,
        "municipio": dados.cidade,
        "uf": dados.estado,
        "cep": dados.cep,
        "dddTelefone": "41",
        "telefone": "992414553",
        "dddCelular": "41",
        "celular": "999665588",
        "email": dados.emailtitular,
        "altura": 0,
        "peso": 0,
        "imc": 0,
        "dataVigencia": "26/02/2024",
        "mensalidade": 0,
        "estadoCivil": {
            "id": dados.estadociviltitular === "Casado" ? 1 :
                  dados.estadociviltitular === "Divorciado" ? 2 :
                  dados.estadociviltitular === "Separado" ? 3 :
                  dados.estadociviltitular === "Solteiro" ? 4 :
                  dados.estadociviltitular === "Viúvo" ? 5: '',
            "nome": dados.estadociviltitular
        },
        "tipoBeneficiario": {
          "id": 1,
          "nome": "Titular"
        },
        "sexo": {
          "id": dados.sexotitular === "Masculino" ? 1 : 2,
          "nome": dados.sexotitular
        },
        "parentesco": {
          "id": 1,
          "nome": "Titular"
        },
        "statusBeneficiario": {
          "id": 2,
          "nome": "Ativo"
        }
      }
    ]
  }

  adicionarDependentes()

  async function adicionarDependentes () {
    dependentes.forEach((dependente) => {
      //insertData(qInsDependentes, [resultImplantacao.insertId, dependente]);
      const dependenteObj = {
        "nome": dependente.nomecompletodependente,
        "dataNascimento": formatarDataDs(dependente.nascimentodependente),
        "rg": "null",
        "orgaoEmissor": "null",
        "cpf": dependente.cpfdependente,
        "dnv": "string",
        "pis": "string",
        "nomeMae": dependente.nomemaedependente,
        "endereco": dados.enderecoresidencial,
        "numero": dados.numeroendereco,
        "complemento": dados.complementoendereco,
        "bairro": dados.bairro,
        "municipio": dados.cidade,
        "uf": dados.estado,
        "cep": dados.cep,
        "dddTelefone": "41",
        "telefone": "999998888",
        "dddCelular": "41",
        "celular": "999998888",
        "email": "dependente@dependente.com.br",
        "altura": 0,
        "peso": 0,
        "imc": 0,
        "dataVigencia": "26/02/2024",
        "mensalidade": 0,
        "estadoCivil": {
            "id": dependente.estadocivildependente === "Casado" ? 1 :
                  dependente.estadocivildependente === "Divorciado" ? 2 :
                  dependente.estadocivildependente === "Separado" ? 3 :
                  dependente.estadocivildependente === "Solteiro" ? 4 :
                  dependente.estadocivildependente === "Viúvo" ? 5: '',
            "nome": dependente.estadocivildependente
        },
        "tipoBeneficiario": {
          "id": 2,
          "nome": "Dependente"
        },
        "sexo": {
          "id": dependente.sexodependente === "Masculino" ? 1 : 2,
          "nome": dependente.sexodependente
        },
        "parentesco": {
          "id": dependente.grauparentescodependente === "Agregado" ? 2 :
                dependente.grauparentescodependente === "Companheiro" ? 3 :
                dependente.grauparentescodependente === "Cônjuge" ? 4 :
                dependente.grauparentescodependente === "Filho(a)" ? 5 :
                dependente.grauparentescodependente === "Filho Adotivo" ? 6 :
                dependente.grauparentescodependente === "Irmão(a)" ? 7 :
                dependente.grauparentescodependente === "Mãe" ? 8 :
                dependente.grauparentescodependente === "Pai" ? 9 :
                dependente.grauparentescodependente === "Neto(a)" ? 10 :
                dependente.grauparentescodependente === "Sobrinho(a)" ? 11 :
                dependente.grauparentescodependente === "Sogro" ? 12 :
                dependente.grauparentescodependente === "Enteado" ? 13 :
                dependente.grauparentescodependente === "Tutelado" ? 14 :
                dependente.grauparentescodependente === "Sogra" ? 15 :
                dependente.grauparentescodependente === "Genro" ? 16 :
                dependente.grauparentescodependente === "Nora" ? 17 :
                dependente.grauparentescodependente === "Cunhado(a)" ? 18 :
                dependente.grauparentescodependente === "Primo(a)" ? 19 :
                dependente.grauparentescodependente === "Avô" ? 20 :
                dependente.grauparentescodependente === "Avó" ? 21 :
                dependente.grauparentescodependente === "Tio" ? 22 :
                dependente.grauparentescodependente === "Tia" ? 23 :
                dependente.grauparentescodependente === "Bisneto" ? 24 :
                dependente.grauparentescodependente === "Madrasta" ? 25 : 26,
          "nome": dependente.grauparentescodependente
        },
        "statusBeneficiario": {
          "id": 2,
          "nome": "Ativo"
        }
      };
      jsonModeloDS.beneficiarioList.push(dependenteObj);
    });
  };

  await enviarPropostaDigitalSaude(jsonModeloDS);

  console.log(jsonModeloDS)

  console.log('Foi')
  res.send('Sucesso na rota, se páh na implantação também')
});

app.post("/testeFormulario", async (req, res) => {
  const db = await mysql.createPool(config);
  try {
    const dados = req.body.inputs;
    const dependentes = req.body.dependentes;
    const anexos = req.body.anexos;

    var cpffinanceiro = dados.cpffinanceiro ? dados.cpffinanceiro : dados.cpftitular
    var nomefinanceiro = dados.nomefinanceiro ? dados.nomefinanceiro : dados.nomecompleto;
    var datadenascimentofinanceiro = dados.datadenascimentofinanceiro ? dados.datadenascimentofinanceiro : dados.datadenascimento;
    var sexotitularfinanceiro = dados.sexotitularfinanceiro ? dados.sexotitularfinanceiro : dados.sexotitular;
    var estadociviltitularfinanceiro = dados.estadociviltitularfinanceiro ? dados.estadociviltitularfinanceiro : dados.estadociviltitular;
    var telefonetitularfinanceiro = 
    dados.telefonetitularfinanceiro ? dados.telefonetitularfinanceiro : dados.telefonetitular;
    var emailtitularfinanceiro = 
    dados.emailtitularfinanceiro ? dados.emailtitularfinanceiro : dados.emailtitular;

    console.log(dados);

    const numeroProposta = await generateUniqueProposalNumber();
    const dadosImplantacao = [
      dados.nomecompleto,
      dados.datadenascimento,
      dados.cpftitular,
      dados.nomemaetitular,
      dados.rgtitular,
      dados.orgaoexpedidor,
      dados.dataexpedicaorgtitular,
      dados.sexotitular,
      dados.estadociviltitular,
      dados.telefonetitular,
      dados.celulartitular,
      dados.emailtitular,
      dados.profissaotitular,
      dados.titularresponsavelfinanceiro,
      cpffinanceiro,
      nomefinanceiro,
      datadenascimentofinanceiro,
      sexotitularfinanceiro,
      estadociviltitularfinanceiro,
      telefonetitularfinanceiro,
      emailtitularfinanceiro,
      dados.grauparentesco,
      dados.cep,
      dados.enderecoresidencial,
      dados.numeroendereco,
      dados.complementoendereco,
      dados.bairro,
      dados.cidade,
      dados.estado,
      dados.cpfcorretor,
      dados.nomecorretor,
      dados.corretora,
      dados.celularcorretor,
      dados.formaPagamento,
      dados.aceitoTermos,
      dados.aceitoPrestacaoServicos,
      dados.planoSelecionado,
      numeroProposta,
      dados.idEntidade
    ];

    async function obsDigitalSaude () {

      if(dados.titularresponsavelfinanceiro === "Sim") {
        return `O TITULAR É O MESMO TITULAR FINANCEIRO`;
      } else {
        return ( 
          `
          O TITULAR NÃO É O MESMO TITULAR FINANCEIRO \n
          ----> Dados responsável Financeiro <---- \n
          CPF: ${dados.cpffinanceiro} \n
          Nome: ${dados.nomefinanceiro} \n
          Data de Nascimento: ${dados.datadenascimentofinanceiro} \n
          Telefone: ${dados.telefonetitularfinanceiro} \n
          Email: ${dados.emailtitularfinanceiro} \n
          Sexo: ${dados.sexotitularfinanceiro} \n
          Estado Civil: ${dados.estadociviltitularfinanceiro} \n
          Grau de Parentesco: ${dados.grauparentesco} \n
          `
        ) ;
      }

    }

    let observacoesDigitalSaude = await obsDigitalSaude ();

    observacoesDigitalSaude += 
      `
      \n
      Pagamento: 
        ${dados.formaPagamento === 1 ? "Boleto" : 
          dados.formaPagamento === 2? "Cartão de Crédito em 12x" : "Cartão de Crédito em 3x"} \n
        Profissão selecionada: ${dados.profissaotitular}
      `;

    const jsonModeloDS = {
      "numeroProposta": `${numeroProposta}`,
      "dataAssinatura": "26/02/2024",
      "diaVencimento": `${dados.dataVencimento}`,
      "cpfResponsavel": dados.cpffinanceiro ? dados.cpffinanceiro : dados.cpftitular,
      "nomeResponsavel": dados.nomefinanceiro ? dados.nomefinanceiro : dados.nomecompleto,
      "observacao": `${observacoesDigitalSaude}`,
      "plano": {
        "codigo": `${dados.codigoPlanoDS}`
      },
      "convenio": {
        "codigo": `${dados.numeroConvenio}`
      },
      "produtor": {
        "codigo": `${dados.idCorretor}`
      },
      "corretora": {
        "codigo": `${dados.codigoCorretora}`
      },
      "grupo": {
        "codigo": "V2CAVAD6U2"
      },
      "filial": {
        "codigo": "BETRHPTL2K"
      },
      "beneficiarioList": [
        {
          "nome": dados.nomecompleto,
          "dataNascimento": formatarDataDs(dados.datadenascimento),
          "rg": dados.rgtitular,
          "orgaoEmissor": dados.orgaoexpedidor,
          "cpf": dados.cpftitular,
          "dnv": "string",
          "pis": "string",
          "nomeMae": dados.nomemaetitular,
          "endereco": dados.enderecoresidencial,
          "numero": dados.numeroendereco,
          "complemento": dados.complementoendereco,
          "bairro": dados.bairro,
          "municipio": dados.cidade,
          "uf": dados.estado,
          "cep": dados.cep,
          "dddTelefone": "41",
          "telefone": "992414553",
          "dddCelular": "41",
          "celular": "999665588",
          "email": dados.emailtitular,
          "altura": 0,
          "peso": 0,
          "imc": 0,
          "dataVigencia": "26/02/2024",
          "mensalidade": 0,
          "estadoCivil": {
              "id": dados.estadociviltitular === "Casado" ? 1 :
                    dados.estadociviltitular === "Divorciado" ? 2 :
                    dados.estadociviltitular === "Separado" ? 3 :
                    dados.estadociviltitular === "Solteiro" ? 4 :
                    dados.estadociviltitular === "Viúvo" ? 5: '',
              "nome": dados.estadociviltitular
          },
          "tipoBeneficiario": {
            "id": 1,
            "nome": "Titular"
          },
          "sexo": {
            "id": dados.sexotitular === "Masculino" ? 1 : 2,
            "nome": dados.sexotitular
          },
          "parentesco": {
            "id": 1,
            "nome": "Titular"
          },
          "statusBeneficiario": {
            "id": 2,
            "nome": "Ativo"
          }
        }
      ]
    }

    
    
    /* INSERÇÃO DE DADOS AO BANCO DE DADOS DAS INFORMAÇÕES SOBRE A IMPLANTAÇÃO */

    await db.query(qInsImplantacao, dadosImplantacao)
      .then(async (resultImplantacao) => {
        const resultImplantacaoId = resultImplantacao.insertId
        await Promise.all(dependentes.map(async (dependente) => {
          await db.query(qInsDependentes, 
          [
            dependente.cpfdependente,
            dependente.nomecompletodependente,
            dependente.nomemaedependente,
            dependente.nascimentodependente,
            dependente.sexodependente,
            dependente.estadocivildependente,
            dependente.grauparentescodependente,  
            resultImplantacaoId
          ]
        )
          try {
            const dependenteObj = {
              "nome": dependente.nomecompletodependente,
              "dataNascimento": formatarDataDs(dependente.nascimentodependente),
              "rg": "null",
              "orgaoEmissor": "null",
              "cpf": dependente.cpfdependente,
              "dnv": "string",
              "pis": "string",
              "nomeMae": dependente.nomemaedependente,
              "endereco": dados.enderecoresidencial,
              "numero": dados.numeroendereco,
              "complemento": dados.complementoendereco,
              "bairro": dados.bairro,
              "municipio": dados.cidade,
              "uf": dados.estado,
              "cep": dados.cep,
              "dddTelefone": "41",
              "telefone": "999998888",
              "dddCelular": "41",
              "celular": "999998888",
              "email": "dependente@dependente.com.br",
              "altura": 0,
              "peso": 0,
              "imc": 0,
              "dataVigencia": "26/02/2024",
              "mensalidade": 0,
              "estadoCivil": {
                  "id": dependente.estadocivildependente === "Casado" ? 1 :
                        dependente.estadocivildependente === "Divorciado" ? 2 :
                        dependente.estadocivildependente === "Separado" ? 3 :
                        dependente.estadocivildependente === "Solteiro" ? 4 :
                        dependente.estadocivildependente === "Viúvo" ? 5: '',
                  "nome": dependente.estadocivildependente
              },
              "tipoBeneficiario": {
                "id": 2,
                "nome": "Dependente"
              },
              "sexo": {
                "id": dependente.sexodependente === "Masculino" ? 1 : 2,
                "nome": dependente.sexodependente
              },
              "parentesco": {
                "id": dependente.grauparentescodependente === "Agregado" ? 2 :
                      dependente.grauparentescodependente === "Companheiro" ? 3 :
                      dependente.grauparentescodependente === "Cônjuge" ? 4 :
                      dependente.grauparentescodependente === "Filho(a)" ? 5 :
                      dependente.grauparentescodependente === "Filho Adotivo" ? 6 :
                      dependente.grauparentescodependente === "Irmão(a)" ? 7 :
                      dependente.grauparentescodependente === "Mãe" ? 8 :
                      dependente.grauparentescodependente === "Pai" ? 9 :
                      dependente.grauparentescodependente === "Neto(a)" ? 10 :
                      dependente.grauparentescodependente === "Sobrinho(a)" ? 11 :
                      dependente.grauparentescodependente === "Sogro" ? 12 :
                      dependente.grauparentescodependente === "Enteado" ? 13 :
                      dependente.grauparentescodependente === "Tutelado" ? 14 :
                      dependente.grauparentescodependente === "Sogra" ? 15 :
                      dependente.grauparentescodependente === "Genro" ? 16 :
                      dependente.grauparentescodependente === "Nora" ? 17 :
                      dependente.grauparentescodependente === "Cunhado(a)" ? 18 :
                      dependente.grauparentescodependente === "Primo(a)" ? 19 :
                      dependente.grauparentescodependente === "Avô" ? 20 :
                      dependente.grauparentescodependente === "Avó" ? 21 :
                      dependente.grauparentescodependente === "Tio" ? 22 :
                      dependente.grauparentescodependente === "Tia" ? 23 :
                      dependente.grauparentescodependente === "Bisneto" ? 24 :
                      dependente.grauparentescodependente === "Madrasta" ? 25 : 26,
                "nome": dependente.grauparentescodependente
              },
              "statusBeneficiario": {
                "id": 0,
                "nome": "Ativo"
              }
            };
            jsonModeloDS.beneficiarioList.push(dependenteObj);
          } catch (error) {
            console.error('Erro ao dar push do dependente no objeto dependentes', error)
          }   
        }));

        try {
          await salvarAnexos(resultImplantacaoId, anexos);
        } catch (error) {
          enviarErroDiscord(`Erro ao salvar Anexos ${error}`)
          console.error("Erro ao salvar anexos:", error);
        }

        try {
          await sendContractEmail(
            dados.emailtitularfinanceiro ? dados.emailtitularfinanceiro : dados.emailtitular,
            resultImplantacaoId,
            numeroProposta,
            dados.cpffinanceiro,
            dados.nomefinanceiro,
            dados.idEntidade
          );
        } catch (error){
          enviarErroDiscord(`Erro ao enviar email para o titular do contrato ${error}`)
          console.error('Erro ao enviar email com contrato', error)
        }

        try {
          await enviarPropostaDigitalSaude(jsonModeloDS, resultImplantacaoId);
        } catch (error) {
          // Tratamento de erro adicional, se necessário
          enviarErroDiscord(`Erro ao enviar dados para o DS da proposta ${error}`)
          await sendStatus(resultImplantacaoId, 4, "Erro ao enviar proposta para o digital");
          console.error("Erro inesperado ao enviar proposta:", error);
        }

        try {
          await salvarPDFProposta(dadosProposta, numeroProposta);
      } catch (err) {
          console.error('Erro ao gerar o PDF:', err);
          res.status(500).send('Erro ao gerar o PDF');
      }
        

        try {
          await sendStatus(resultImplantacaoId, 2, "Implantação realizada com sucesso ao Ecommerce");
        } catch (error) {
          enviarErroDiscord(`Erro ao mudar status da proposta para realizada com sucesso ${error}`)
          console.error('Erro ao mudar status da proposta', error)
        }
        res.status(200).json({ numeroPropostaGerado: numeroProposta });
        //res.render('sucesso', {numeroPropostaGerado: numeroProposta})
        //res.status(200).send({ message: "Implantação realizada com sucesso!" });  
      })
      .catch((error) => {
        enviarErroDiscord(`Erro durante a implantação ${error}`)
        console.error("Erro durante a implantação:", error);
        res.status(500).send({ error: error.message });
      });
    } catch (error) {
      enviarErroDiscord(`Erro geral ${error}`)
      console.error("Erro geral:", error);
      res.status(500).send({ error: error.message });
    }
});

app.get("/buscar-corretor", async (req, res) => {
  try {
    const cpfCorretor = req.query.cpfcorretor;

    const token = "X43ADVSEXM";
    const senhaApi = "kgt87pkxc2";

    const configDS = {
      headers: {
        "Content-Type": "text/plain;charset=UTF-8",
        token: `${token}`,
        senhaApi: senhaApi
      },
    };

    // Fazer a solicitação à API
    /* const apiUrl = `https://e997-2804-14c-87b7-d25a-f565-b1fa-b562-4653.ngrok-free.app/api/v2/produtor/procurarPorNumeroDocumento?numeroDocumento=${cpfCorretor}` */
    const apiUrl = `https://digitalsaude.com.br/api/v2/produtor/procurarPorNumeroDocumento?numeroDocumento=${cpfCorretor}`;
    const response = await axios.get(apiUrl, configDS);

    // Verificar se a API retornou algum resultado
    if (response.data.length === 0) {
      enviarErroDiscord(
        `
        Erro na busca pelo corretor \n
        ${response.data}
        `
      )
      return res.status(404).json({ error: "Corretor não encontrado" });
    }

    // Extrair os dados relevantes
    const corretorData = response.data;
    const nomeCorretor = corretorData[0].nome;
    const telefoneCorretor = corretorData[0].telefone;
    const codigoCorretor = corretorData[0].codigo;

    // Manipular os dados do produtor (se existirem)
    let dadosProdutores = [];

    if (corretorData.length > 0) {
      corretorData.forEach((corretor) => {
        if (corretor.produtor && corretor.produtor.nome) {
          dadosProdutores.push({
            nome: corretor.produtor.nome,
            numeroDocumento: corretor.produtor.numeroDocumento,
            codigoCorretora: corretor.produtor.codigo
          });
        } else {
          nomeProdutores.push("Nome do produtor não encontrado");
        }
      });
    } else {
      if (corretorData.produtor && corretorData.produtor.nome) {
        dadosProdutores.push({
          nome: corretorData.produtor.nome,
          numeroDocumento: corretorData.produtor.numeroDocumento,
          codigoCorretora: corretorData.produtor.codigo
        });
      } else {
        nomeProdutores.push("Nome do produtor não encontrado");
      }
    }

    const responseData = {
      nome: nomeCorretor,
      telefone: telefoneCorretor,
      nomeProdutores: dadosProdutores,
      idCorretor: codigoCorretor,
    };

    console.log(responseData);

    res.json(responseData);
  } catch (err) {
    console.error("Erro ao consultar a API:", err);
    logger.error({
      message: "Erro ao consultar API de busca de corretores do Digital",
      error: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString(),
    });
    return res.status(500).json({ error: "Erro ao processar consulta à API" });
  }
});

app.get("/buscar-cep", async (req, res) => {
  const { cep } = req.query;

  try {
    const response = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);
    const data = response.data;
    res.json(data);
  } catch (error) {
    console.error("Erro na busca de CEP:", error.message);
    res.status(500).json({ error: "Erro na busca de CEP" });
  }
});

app.get("/preview-email", (req, res) => {
  const dadosEmail = {
    nomeTitularFinanceiro: "Nome Exemplo Cliente",
    linkAleatorio: "http://exemplo.com/link",
  };

  res.render("emailTemplate", dadosEmail);
});

app.get("/preview-success", (req, res) => {
  const dados = {
    numeroPropostaGerado: 2023456785,
    nomeCliente: "Teste de Nome Cliente",
  };
  res.render("sucesso", dados);
});

app.get("/enviar-email/:id", async (req, res) => {
  const db = await mysql.createPool(config);
  const idImplantacao = req.params.id;
  const queryImplantacoes = "SELECT * FROM implantacoes WHERE id=?";
  db.query(queryImplantacoes, [idImplantacao], (err, result) => {
    if (err) {
      res.cookie(
        "alertError",
        "Erro ao pegar dados do beneficiário para disparo de email",
        { maxAge: 3000 }
      );
    }

    console.log(result);
    let implantacao = result[0];
    try {
      sendContractEmail(
        implantacao.emailtitularfinanceiro,
        idImplantacao,
        implantacao.numeroProposta,
        implantacao.cpffinanceiro,
        implantacao.nomefinanceiro
      );
      res.cookie(
        "alertSuccess",
        "Disparo de email feito com sucesso, aguarde até 5 minutos para verificar se usuário recebe o email",
        { maxAge: 3000 }
      );
      res.status(200).send("Corretor cadastrado com sucesso.");
    } catch (error) {
      console.error(error);
      res.status(500).send("Erro ao enviar o e-mail");
    }
  });
});

app.get("/login", (req, res) => {
  res.render("login");
});

/* ROTA PARA ASSINATURA DO CONTRATO */
app.get(
  "/assinar/:idImplantacao/:numeroProposta/:cpfTitularFinanceiro/:idEntidade", async (req, res) => {
    const db = await mysql.createPool(config);
    const numeroProposta = req.params.numeroProposta;
    const cpfTitular = req.params.cpfTitularFinanceiro;

    const idEntidade = req.params.idEntidade;

    const idImplantacao = req.params.idImplantacao;
    const queryImplantacoes = "SELECT * FROM implantacoes WHERE id=?";
    const queryPlano = "SELECT * FROM planos WHERE id=?";
    const queryEntidade = "SELECT * FROM entidades WHERE id=?";
    const queryDependentes =
      "SELECT * FROM dependentes WHERE id_implantacoes = ?";
    const queryDocumentos =
      "SELECT * FROM anexos_implantacoes WHERE id_implantacao = ?";
    const queryAssinatura =
      "SELECT * FROM assinatura_implantacao WHERE id_implantacao = ?";

    db.query(queryImplantacoes, [idImplantacao], (err, resultImplantacoes) => {
      if (err) {
        logger.error({
          message:
            "ROTA: ASSINAR | ERRO: ao buscar a implantação no banco de dados",
          error: err.message,
          stack: err.stack,
          timestamp: new Date().toISOString(),
        });
        console.log("Erro ao buscar implantação no BD", err);
        res.status(500).send("Erro ao buscar implantação no BD");
        return;
      }

      if (resultImplantacoes.length === 0) {
        logger.error({
          message: "ROTA: ASSINAR | ERRO: Implantação não foi encontrada",
          error: err.message,
          stack: err.stack,
          timestamp: new Date().toISOString(),
        });
        res.status(404).send("Implantação não encontrada");
        return;
      }

      const idImplantacao = resultImplantacoes[0].id;
      const planoId = resultImplantacoes[0].planoSelecionado;

      db.query(queryEntidade, [idEntidade], (err, resultEntidade) => {
        if (err) {
          logger.error({
            message: "ROTA: ASSINAR | ERRO: ao buscar entidade relacionada",
            error: err.message,
            stack: err.stack,
            timestamp: new Date().toISOString(),
          });
          console.error("Erro puxar entidade relacionada", err);
        }
        
        db.query(queryPlano, [planoId], (err, resultPlano) => {
          if (err) {
            logger.error({
              message:
                "ROTA: ASSINAR | ERRO: ao buscar plano vinculado a implantação",
              error: err.message,
              stack: err.stack,
              timestamp: new Date().toISOString(),
            });
            console.error(
              "Erro ao buscar plano vinculado à implantação",
              err
            );
            res
              .status(500)
              .send("Erro ao buscar plano vinculado à implantação");
            return;
          }
          db.query(
            queryDependentes,
            [idImplantacao],
            (err, resultDependentes) => {
              if (err) {
                logger.error({
                  message:
                    "ROTA: ASSINAR | ERRO: Ao buscar dependentes vinculados a essa implantação",
                  error: err.message,
                  stack: err.stack,
                  timestamp: new Date().toISOString(),
                });
                console.error(
                  "Erro na busca pelos dependentes vinculados a essa implantacao",
                  err
                );
              }
              db.query(
                queryDocumentos,
                [idImplantacao],
                (err, resultDocumentos) => {
                  if (err) {
                    logger.error({
                      message:
                        "ROTA: ASSINAR | ERRO: ao buscar documentos vinculados a implantação",
                      error: err.message,
                      stack: err.stack,
                      timestamp: new Date().toISOString(),
                    });
                    console.error(
                      "Erro na busca pelos documentos vinculados a implantação",
                      err
                    );
                  }
                  db.query(
                    queryAssinatura,
                    [idImplantacao],
                    (err, resultAssinatura) => {
                      if (err) {
                        logger.error({
                          message:
                            "ROTA: ASSINAR | ERRO: ao pegar a assinatura vinculada",
                          error: err.message,
                          stack: err.stack,
                          timestamp: new Date().toISOString(),
                        });
                        console.error("Erro ao pegar assinatura", err);
                      }
                      const data_implantacao = new Date(
                        resultImplantacoes[0].data_implantacao
                      );
                      const dia = String(data_implantacao.getDate()).padStart(
                        2,
                        "0"
                      );
                      const mes = String(
                        data_implantacao.getMonth() + 1
                      ).padStart(2, "0");
                      const ano = data_implantacao.getFullYear();
                      const dataFormatada = `${dia}/${mes}/${ano}`;

                      const assinaturaBase64 =
                        resultAssinatura.length > 0 && resultAssinatura[0]
                          ? resultAssinatura[0].assinatura_base64
                          : null;

                      res.render("contrato", {
                        implantacao: resultImplantacoes[0],
                        plano: resultPlano[0],
                        dataFormatada: dataFormatada,
                        entidade: resultEntidade[0],
                        dependentes: resultDependentes,
                        documentos: resultDocumentos,
                        assinaturaBase64: assinaturaBase64,
                      });
                    }
                  );
                }
              );
            }
          );
        });
      });
    });
  }
);

/* ROTA PARA SALVAR ASSINATURA DO CONTRATO */
app.post("/salva-assinatura", async (req, res) => {
  const db = await mysql.createPool(config);
  const idImplantacao = req.body.idImplantacao;
  const assinatura = req.body.assinatura_base64;
  const sqlInsertAsign =
    "INSERT INTO assinatura_implantacao( id_implantacao, assinatura_base64) VALUES (?,?)";

  db.query(sqlInsertAsign, [idImplantacao, assinatura], async (err, result) => {
    if (err) {
      logger.error({
        message: "ROTA: ASSINAR | ERRO: ao salvar assinatura do beneficiário",
        error: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString(),
      });

      console.error("Erro ao salvar assinatura do beneficiário");
      res.cookie("alertError", "Erro ao salvar assinatura, contate o suporte");
      res
        .status(500)
        .send("Erro ao enviar assinatura, solicite auxílio do suporte");
    }
    await sendStatus(idImplantacao, 2, "Proposta assinada pelo contratante");
    res.cookie("alertSuccess", "Assinatura feita com sucesso", {
      maxAge: 3000,
    });
    res.status(200).send("Corretor cadastrado com sucesso.");
  });
});

app.post("/login-verifica", async (req, res) => {
  const db = await mysql.createPool(config);
  const { username, password } = req.body;

  const query = "SELECT * FROM users WHERE username = ?";
  db.query(query, [username], (err, results) => {
    if (err) {
      console.error("Erro ao consultar o banco de dados:", err);
      return res.render("login", {
        error: "Erro no servidor contate o suporte",
      });
    }

    if (results.length === 0) {
      return res.render("login", { error: "Usuário não encontrado" });
    }

    const user = results[0];

    if (user.password !== password) {
      return res.render("login", { error: "Senha incorreta" });
    }

    // Após o login, redireciona para a URL original armazenada na sessão ou para '/'
    const originalUrl = req.session.originalUrl || "/";
    delete req.session.originalUrl; // Limpa a URL original da sessão
    req.session.usuario = user;
    res.redirect(originalUrl);
  });
});

app.get("/sucesso/:numeroProposta", (req, res) => {
  const dados = {
    numeroPropostaGerado: req.params.numeroProposta,
    nomeCliente: "Teste de Nome Cliente",
  };
  res.render("sucesso", dados);
});


app.get("/implantacoes", verificaAutenticacao, async (req, res) => {
  const db = await mysql.createPool(config);
  const query =
    "SELECT i.id, i.numeroProposta, i.cpftitular, i.nomecompleto, i.data_implantacao, i.planoSelecionado, p.nome_do_plano FROM implantacoes i JOIN planos p ON i.planoSelecionado = p.id";

  db.query(query, (err, results) => {
    if (err) {
      console.error("Erro ao consultar o banco de dados:", err);
      res.status(500).send("Erro ao processar a solicitação");
    } else {
      res.render("implantacoes", {
        implantacoes: results,
        format: format,
        ptBR: ptBR,
        rotaAtual: "implantacoes",
      });
    }
  });
});

app.get("/implantacao/:id", verificaAutenticacao, (req, res) => {
  const idImplantacao = req.params.id;

  const queryImplantacao = "SELECT * FROM implantacoes WHERE id = ?";
  db.query(queryImplantacao, [idImplantacao], (err, resultImplantacao) => {
    if (err) {
      console.error("Erro ao consultar o banco de dados:", err);
      return res.status(500).send("Erro ao processar a solicitação");
    }

    if (resultImplantacao.length === 0) {
      return res.status(404).send("Implantação não encontrada");
    }

    const implantacao = resultImplantacao[0];

    // Consulta os dependentes vinculados a essa implantação
    const queryDependentes =
      "SELECT * FROM dependentes WHERE id_implantacoes = ?";
    db.query(queryDependentes, [idImplantacao], (err, resultDependentes) => {
      if (err) {
        console.error("Erro ao consultar o banco de dados:", err);
        return res.status(500).send("Erro ao processar a solicitação");
      }

      // Renderiza a página EJS com as informações da implantação e dependentes
      res.render("detalhes-implantacao", {
        implantacao: implantacao,
        dependentes: resultDependentes,
        format: format,
        ptBR: ptBR,
        rotaAtual: "implantacoes",
      });
    });
  });
});

app.get("/visualizaImplantacao/:id", verificaAutenticacao, async (req, res) => {
  const db = await mysql.createPool(config);
  const idImplantacao = req.params.id;
  const queryImplantacoes = "SELECT * FROM implantacoes WHERE id=?";
  const queryPlano = "SELECT * FROM planos WHERE id=?";
  const queryEntidade = "SELECT * FROM entidades WHERE id=?";
  const queryDependentes =
    "SELECT * FROM dependentes WHERE id_implantacoes = ?";
  const queryDocumentos =
    "SELECT * FROM anexos_implantacoes WHERE id_implantacao = ?";
  const queryStatus =
    "SELECT * FROM status_implantacao WHERE idimplantacao = ?";

  

db.query(queryImplantacoes, [idImplantacao], (err, resultImplantacoes) => {
  if (err) {
    console.log("Erro ao buscar implantação no BD", err);
    res.status(500).send("Erro ao buscar implantação no BD");
    return;
  }

  if (resultImplantacoes.length === 0) {
    res.status(404).send("Implantação não encontrada");
    return;
  }

  const idImplantacao = resultImplantacoes[0].id;

  const entidadeId = resultImplantacoes[0].idEntidade;

  const planoId = resultImplantacoes[0].planoSelecionado;

    db.query(queryEntidade, [entidadeId], (err, resultEntidade) => {
      if (err) {
        console.error("Erro puxar entidade relacionada", err);
      }
      
      db.query(queryPlano, [planoId], (err, resultPlano) => {
        if (err) {
          console.error("Erro ao buscar plano vinculado à implantação", err);
          res
            .status(500)
            .send("Erro ao buscar plano vinculado à implantação");
          return;
        }
        db.query(
          queryDependentes,
          [idImplantacao],
          (err, resultDependentes) => {
            if (err) {
              console.error(
                "Erro na busca pelos dependentes vinculados a essa implantacao",
                err
              );
            }
            db.query(
              queryDocumentos,
              [idImplantacao],
              (err, resultDocumentos) => {
                if (err) {
                  console.error(
                    "Erro na busca pelos documentos vinculados a implantação",
                    err
                  );
                }
                db.query(
                  queryStatus,
                  [idImplantacao],
                  (err, resultStatus) => {
                    if (err) {
                      console.error(
                        "Erro ao buscar status da implantacao",
                        err
                      );
                    }
                    const data_implantacao = new Date(
                      resultImplantacoes[0].data_implantacao
                    );
                    const dia = String(data_implantacao.getDate()).padStart(
                      2,
                      "0"
                    );
                    const mes = String(
                      data_implantacao.getMonth() + 1
                    ).padStart(2, "0");
                    const ano = data_implantacao.getFullYear();
                    const dataFormatada = `${dia}/${mes}/${ano}`;

                    res.render("detalhes-implantacao", {
                      implantacao: resultImplantacoes[0],
                      plano: resultPlano[0],
                      dataFormatada: dataFormatada,
                      entidade: resultEntidade[0],
                      dependentes: resultDependentes,
                      documento: resultDocumentos,
                      status: resultStatus,
                      rotaAtual: "implantacoes",
                    });
                  }
                );
              }
            );
          }
        );
      });
    });
  });
});

app.get("/planos", verificaAutenticacao, async (req, res) => {
  const db = await mysql.createPool(config);
  const queryPlanos = "SELECT * FROM planos";
  const files = fs.readdirSync("arquivos/");

  db.query(queryPlanos, (err, resultPlanos) => {
    if (err) {
      console.error("Erro ao consultar o banco de dados:", err);
      res.status(500).send("Erro ao consultar os planos");
    }
    res.render("planos", {
      planos: resultPlanos,
      files: files,
      rotaAtual: "planos",
    });
  });
});

app.post("/atualiza-planos", verificaAutenticacao, async (req, res) => {
  const db = await mysql.createPool(config);
  const { plano } = req.body;
  db.query("SELECT *FROM planos WHERE id = ?", [plano.id], (err, result) => {
    if(err) {
      console.error('Erro ao consultar plano ao tentar atualiza-lo', err)
    }
    if (result.length > 0) {
      // O plano existe, atualize-o
      const updateQuery =
        "UPDATE planos SET nome_do_plano = ?, ans = ?, descricao = ?, observacoes = ?, logo = ?, banner = ? , contratacao= ?, coparticipacao = ?, abrangencia = ?, pgtoAnualAvista = ?, pgtoAnualCartao =? , pgtoAnualCartao3x = ? , reajuste = ? , numeroConvenio = ?, codigoPlanoDS = ? WHERE id = ?";
      db.query(
        updateQuery,
        [
          plano.nome_do_plano,
          plano.ans,
          plano.descricao,
          plano.observacoes,
          plano.logoSrc,
          plano.bannerSrc,
          plano.contratacao,
          plano.coparticipacao,
          plano.abrangencia,
          plano.pgtoAnualAvista,
          plano.pgtoAnualCartao,
          plano.pgtoAnualCartao3x,
          plano.reajuste,
          plano.numeroConvenio,
          plano.codigoPlanoDS,
          plano.id,
        ],
        (err, result) => {
          if (err) {
            console.error("Erro ao atualizar plano:", err);
            return rollbackAndRespond(res, "Erro interno do servidor");
          }
          res.cookie("alertSuccess", "Plano atualizado com sucesso", {
            maxAge: 3000,
          });
          res.status(200).json({ message: "Plano atualizado com sucesso" });
        }
      );
    } else {
      // O plano não existe, crie-o
      const createQuery =
        "INSERT INTO planos (nome_do_plano, ans, descricao, observacoes, logo, banner, contratacao, coparticipacao, abrangencia, pgtoAnualAvista, pgtoAnualCartao, pgtoAnualCartao3x, reajuste, numeroConvenio, codigoPlanoDS) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
      db.query(
        createQuery,
        [
          plano.nome_do_plano,
          plano.ans,
          plano.descricao,
          plano.observacoes,
          plano.logoSrc,
          plano.bannerSrc,
          plano.contratacao,
          plano.coparticipacao,
          plano.abrangencia,
          plano.pgtoAnualAvista,
          plano.pgtoAnualCartao,
          plano.pgtoAnualCartao3x,
          plano.reajuste,
          plano.numeroConvenio,
          plano.codigoPlanoDS
        ],
        (err, result) => {
          if (err) {
            console.error("Erro ao criar plano:", err);
            return rollbackAndRespond(res, "Erro interno do servidor");
          }
          res.cookie("alertSuccess", "Plano inserido com sucesso", {
            maxAge: 3000,
          });
          res.status(200).json({ message: "Plano inserido com sucesso" });
        }
      );
    }
  })
});

app.post("/deleta-plano", verificaAutenticacao, async (req, res) => {
  const db = await mysql.createPool(config);
  const idPlano = req.body.id;
  const query = "DELETE FROM planos WHERE id = ?";
  db.query(query, [idPlano], (err, result) => {
    if (err) {
      console.error("Erro ao excluir plano, ou ID não existe, erro: ", err);
      return res
        .status(500)
        .json({ message: "Erro na exclusão do plano selecionado" });
    }
    res.status(200).json({ message: "Plano excluído com sucesso " });
  });
});

app.get("/entidades", verificaAutenticacao, async (req, res) => {
  const db = await mysql.createPool(config);
  db.query("SELECT * FROM entidades", (error, resultsEntidades) => {
    if (error) throw error;
    db.query('SELECT * FROM profissoes', (error, resultProfissoes) => {
      if(error) throw error;
      res.render("entidades", {
        entidades: resultsEntidades,
        profissoes: resultProfissoes,
        rotaAtual: "entidades",
      });
    })
  });
});

/* app.get("/api/profissoes/:id", verificaAutenticacao, async (req, res) => {
  const db = await mysql.createPool(config);
  var idEntidade = req.params.id;
  db.query(
    "SELECT * FROM profissoes WHERE idEntidade = ?",
    [idEntidade],
    (error, resultsProfissoes) => {
      if (error) {
        res.status(500).json({ error: "Erro ao buscar profissões" });
      } else {
        res.json(resultsProfissoes);
      }
    }
  );
}); */

app.post("/editar-entidade/:id", verificaAutenticacao, async (req, res) => {
  const db = await mysql.createPool(config);
  const idEntidade = req.params.id;
  const { nome, descricao, publico, documentos, taxa, profissoes } = req.body;
  
  await db.query(
    qInsEntidade,
    [nome, descricao, publico, documentos, taxa, idEntidade],
    async (error, result) => {
      if (error) {
        console.error("Erro ao atualizar entidade:", error);
        res.cookie(
          "alertError",
          "Erro ao atualizar Entidade, verifique e tente novamente",
          {
            maxAge: 3000,
          }
        );
        res.status(500).json({ message: "Erro interno do servidor" });
        return; // Retorne caso haja erro
      }

      res.cookie("alertSuccess", "Entidade atualizada com Sucesso", { maxAge: 3000 });
      res.status(200).json({ message: "Entidade atualizada com sucesso" });
    });
});

app.delete("/excluir-entidade/:id", verificaAutenticacao, async (req, res) => {
  const db = await mysql.createPool(config);
  const idEntidade = req.params.id;
  const sqlExcluirEntidade = "DELETE FROM entidades WHERE id = ?";

  db.query(sqlExcluirEntidade, [idEntidade], (error, result) => {
    if (error) {
      console.error("Erro ao excluir a entidade:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    } else {
      res.cookie("alertSuccess", "Entidade excluída com sucesso", {
        maxAge: 3000,
      });
      res.status(200).json({ message: "Entidade excluída com sucesso" });
    }
  });
});

app.post("/cadastrar-entidade", verificaAutenticacao, async (req, res) => {
  const db = await mysql.createPool(config);
  const { nome, descricao, publico, documentos, taxa, profissoes } = req.body;
  const sql =
    "INSERT INTO entidades (nome, descricao, publico, documentos, taxa) VALUES (?, ?, ?, ?, ?)";
  const sqlProfissoes =
    "INSERT INTO profissoes (nome, idEntidade) VALUES(?, ?)";
  db.query(
    sql,
    [nome, descricao, publico, documentos, taxa],
    (error, result) => {
      if (error) {
        console.error("Erro ao cadastrar entidade:", error);
        res.cookie(
          "alertError",
          "Erro ao cadastrar Entidade, verifique e tente novamente",
          { maxAge: 3000 }
        );
        res.status(500).json({ message: "Erro interno do servidor" });
      }

      const idEntidade = result.insertId;

      if (Array.isArray(profissoes)) {
        profissoes.forEach((profissao) => {
          db.query(sqlProfissoes, [profissao, idEntidade], (err, result) => {
            if (err) {
              comsole.error("Erro ao cadastrar profissao relacionada", err);
            }
          });
        });
      }
      res.cookie("alertSuccess", "Entidade criada com Sucesso", {
        maxAge: 3000,
      });
      res.status(200).json({ message: "Nova entidade criada com sucesso" });
    }
  );
});

app.post("/editar-profissao/:id", verificaAutenticacao, async (req,res) => {
  const db = await mysql.createPool(config);
  const idProfissao = req.params.id;
  const { nome, idEntidade } = req.body;

  await db.query("UPDATE profissoes SET nome=?, idEntidade=? WHERE id=?", [nome, idEntidade, idProfissao] ,async (error, result) => {
    if(error){
      res.cookie(
        "alertError",
        "Erro ao atualizar Entidade, verifique e tente novamente",
        {
          maxAge: 3000,
        }
      )
    }
    res.cookie("alertSuccess", "Profissão atualizada com sucesso", { maxAge: 3000 });
    res.status(200).json({ message: "Profissão atualizada com sucesso" });
  })
})

app.post("/cadastrar-profissao", verificaAutenticacao, async (req, res) => {
  const db = await mysql.createPool(config);
  const { nome, entidadeVinculada } = req.body;
  const sqlProfissao =
    "INSERT INTO profissoes (nome, idEntidade) VALUES (?, ?)";
  db.query(sqlProfissao, [nome, entidadeVinculada], (err, result) => {
    if (err) {
      console.error("Erro ao cadastrar profissao", err);
    }
    res.cookie("alertSuccess", "Profissão criada com Sucesso", {
      maxAge: 3000,
    });
    res.status(200).json({ message: "Nova profissão criada com sucesso" });
  });
});

app.delete("/excluir-profissao/:id", verificaAutenticacao, async (req, res) => {
  const db = await mysql.createPool(config);
  const idProfissao = req.params.id;
  const sqlExcluirProfissao = "DELETE FROM profissoes WHERE id = ?";

  db.query(sqlExcluirProfissao, [idProfissao], (error, result) => {
    if (error) {
      console.error("Erro ao excluir a profissão:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    } else {
      res.cookie("alertSuccess", "Profissão excluída com sucesso", {
        maxAge: 3000,
      });
      res.status(200).json({ message: "Profissão excluída com sucesso" });
    }
  });
});

/* TESTES  */

app.get('/gerarpdf', async (req, res) => {
  let readStream;
  try {
      // Initial setup, create credentials instance
      const credentials = new ServicePrincipalCredentials({
          clientId: "2ccc988bc62c440fbee4c36db6464be0",
          clientSecret: "p8e-o-Hdu0cUQRuIV43fr3_KdE0qswIOtmPF"
      });

      // Creates a PDF Services instance
      const pdfServices = new PDFServices({
          credentials
      });

      // Setup input data for the document merge process
      const jsonDataForMerge = {
          nome: "Kane Miller",
          teste: 100
      }

      // Creates an asset(s) from source file(s) and upload
      const inputDocxPath = path.join(__dirname, 'arquivospdf', 'documentMergeTemplate.docx');
      readStream = fs.createReadStream(inputDocxPath);
      const inputAsset = await pdfServices.upload({
          readStream,
          mimeType: MimeType.DOCX
      });

      // Create parameters for the job
      const params = new DocumentMergeParams({
          jsonDataForMerge,
          outputFormat: OutputFormat.PDF
      });

      // Creates a new job instance
      const job = new DocumentMergeJob({
          inputAsset,
          params
      });

      // Submit the job and get the job result
      const pollingURL = await pdfServices.submit({
          job
      });
      const pdfServicesResponse = await pdfServices.getJobResult({
          pollingURL,
          resultType: DocumentMergeResult
      });

      // Get content from the resulting asset(s)
      const resultAsset = pdfServicesResponse.result.asset;
      const streamAsset = await pdfServices.getContent({
          asset: resultAsset
      });

      // Creates a write stream and copy stream asset's content to it
      const outputFilePath = path.join(__dirname, 'arquivospdf', 'formulario_preenchido.pdf');
      console.log(`Saving asset at ${outputFilePath}`);

      const writeStream = fs.createWriteStream(outputFilePath);
      streamAsset.readStream.pipe(writeStream);
      writeStream.on('finish', () => {
        res.sendFile(outputFilePath, err => {
            if (err) {
                console.error('Erro ao enviar o arquivo:', err);
                res.status(500).send('Erro ao enviar o arquivo');
            }
        });
    });

    // Manter o streaming até o fim
    streamAsset.readStream.on('end', () => {
        console.log('PDF gerado e salvo com sucesso!');
    });
  } catch (err) {
      if (err instanceof SDKError || err instanceof ServiceUsageError || err instanceof ServiceApiError) {
          console.log("Exception encountered while executing operation", err);
      } else {
          console.log("Exception encountered while executing operation", err);
      }
  } finally {
      readStream?.destroy();
  }
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

app.post("/error404", (res, req) => {
  res.render("404");
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});

app.use((req, res, next) => {
  res.status(404).render("404");
});
