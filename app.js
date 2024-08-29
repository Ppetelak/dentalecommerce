const {
  mysql,
  qInsImplantacao,
  qInsDependentes,
  config,
  qInsEntidade,
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
const fs = require("fs");
const fsPromises = require("fs").promises;
const axios = require("axios");
const winston = require("winston");
const uuid = require("uuid");
const moment = require("moment");
const { format } = require("date-fns");
const { ptBR } = require("date-fns/locale");
const nodemailer = require("nodemailer");
const puppeteer = require("puppeteer");
const juice = require("juice");
const { default: parseJSON } = require("date-fns/parseJSON");
const { create } = require("domain");
const { default: id } = require("date-fns/locale/id");
const port = process.env.PORT || 5586;
const appUrl = process.env.APP_URL || "http://localhost:5586";
const pastaInterna = process.env.PASTA_INTERNA || "dentalEcommerce"

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
app.use("/arquivospdf", express.static("arquivospdf"));
app.use("/fonts", express.static("fonts"));
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

const logDirectory = path.join(__dirname, 'logs');

// Garantir que a pasta de logs exista
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory);
}

function logToFile(filename, message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  const logFilepath = path.join(logDirectory, `${filename}.txt`);
  
  fs.appendFileSync(logFilepath, logMessage, 'utf8');
}

/* --------------------------------------- FUNÇÕES ÚTEIS --------------------------------- */

async function enviarAnexosParaDSContrato(numeroProposta) {
  console.log("entrou na função de enviar os anexos");
  const db = await mysql.createPool(config);
  const query = "SELECT * FROM anexos_implantacoes WHERE id_implantacao = ?";
  const token = "X43ADVSEXM";
  const senhaApi = "kgt87pkxc2";
  const apiUrl = "https://digitalsaude.com.br/api/v2/anexo/";

  try {
    const idImplantacao = await consultarIDProposta(numeroProposta);
    const querySelectCodigoDS =
      "SELECT codigo_ds FROM propostas_codigods WHERE numeroProposta = ?";
    const codigoDSResult = await db.query(querySelectCodigoDS, [idImplantacao]);

    if (!codigoDSResult || codigoDSResult.length === 0) {
      console.error(
        "Não foi encontrado o código DS para a proposta:",
        numeroProposta
      );
      logger.info("ERRO: Não foi encontrado o código DS para a proposta");
      return {
        success: false,
        message: "Não foi encontrado o código DS para a proposta",
      };
    }

    const codigoDS = codigoDSResult[0].codigo_ds;

    const rows = await db.query(query, [numeroProposta]);
    const anexos = rows;
    var quantidadeAnexos = anexos.length;

    enviarMensagemDiscord(`Quantidade de anexos encontrados para a proposta de id ${idImplantacao}: ${quantidadeAnexos}`, 'erro');

    if (!anexos || anexos.length === 0) {
      enviarMensagemDiscord(`Nenhum anexo encontrado para a proposta: ${numeroProposta}`, 'erro');
      logger.info("ERRO: Nenhum anexo encontrado para a proposta");
      return { success: true, message: "Nenhum anexo para enviar" };
    }

    const configDS = {
      headers: {
        "Content-Type": "application/json",
        token: token,
        senhaApi: senhaApi,
      },
    };

    for (const anexo of anexos) {
      const data = {
        codigoContrato: codigoDS,
        arquivo: anexo.nome_arquivo,
        linkAnexo: anexo.caminho_arquivo,
      };
      enviarMensagemDiscord(`Enviado um anexo de link: ${data.linkAnexo} para a proposta de número: ${numeroProposta}`, 'erro')
      console.log("Enviando anexo:", data);

      try {
        const response = await axios.post(apiUrl, data, configDS);

        if (response.status === 200) {
          await sendStatus(
            numeroProposta,
            4,
            `Anexo de nome "${data.nomeArquivo}" anexado ao contrato com sucesso`
          );
          enviarMensagemDiscord(`MENSAGEM: Anexo enviado com sucesso ${response.data}`, 'erro')
          console.log("Anexo enviado com sucesso:", response.data);
          logger.info("SUCESS: Anexo enviado com sucesso");
        } else {
          await sendStatus(
            numeroProposta,
            4,
            `ERRO ao anexar arquivo de nome "${data.nomeArquivo}" ao contrato`
          );
          enviarMensagemDiscord(`ERRO: Recebido status ${response.status}`, "erro");
        }
      } catch (error) {
        enviarMensagemDiscord(`ERRO: Erro ao enviar anexo ao digital saúde ${error.message}`, 'erro');
        await sendStatus(
          numeroProposta,
          4,
          `ERRO ao anexar arquivo de nome "${data.nomeArquivo}" ao contrato`
        );

        if (error.response) {
          const status = error.response.status;
          let message = "Erro desconhecido ao enviar anexo a proposta.";

          if (status === 400) {
            message = "Requisição inválida (400). Verifique os dados enviados.";
          } else if (status === 401) {
            message =
              "Acesso não autorizado (401). Verifique suas credenciais.";
          } else if (status === 500) {
            message =
              "Erro interno no servidor (500). Tente novamente mais tarde.";
          }

          console.error(message, error.response.data);
          enviarMensagemDiscord(`ERRO: ${message}, ERRO: ${error.response.data}`, 'erro')
        } else {
          console.error("Erro ao enviar anexo:", error.message);
        }
      }
    }
    return { success: true };
  } catch (err) {
    logger.info("erro: Erro ao enviar anexo ao digital saúde", err.message);
    console.error("Erro ao consultar o banco de dados:", err);
    return {
      success: false,
      message: "Erro ao consultar o banco de dados",
      error: err,
    };
  } finally {
    await db.end();
  }
}

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

function getBase64Image(filePath) {
  // Lê o arquivo como um buffer
  const buffer = fs.readFileSync(filePath);

  // Converte o buffer para base64
  return buffer.toString("base64");
}

async function gerarSalvarPDFProposta(
  link,
  numeroProposta,
  idImplantacao,
  planoLogoSrc,
  dataVigencia,
  ansOperadora
) {
  const db = await mysql.createPool(config);
  const query =
    "INSERT INTO anexos_implantacoes (id_implantacao, nome_arquivo, caminho_arquivo) VALUES (?, ?, ?)";
  return new Promise(async (resolve, reject) => {
    try {
      const browser = await puppeteer.launch({
        headless: true, // Mude para true para produção
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      const page = await browser.newPage();

      const url = link;
      await page.goto(url, { waitUntil: "networkidle2", timeout: 180000 });
      await page.waitForSelector("body"); // Aguarde um elemento específico que garante que os estilos foram aplicados

      // Aguarde até que o conteúdo da página esteja completamente carregado
      await page.evaluate(() => {
        return new Promise((resolve) => {
          if (document.readyState === "complete") {
            resolve();
          } else {
            window.addEventListener("load", resolve);
          }
        });
      });

      const urlAdmBase64 = getBase64Image(
        path.join(__dirname, "img", "logomounthermonoriginal.png")
      );
      const urlPlanoBase64 = getBase64Image(path.join(__dirname, planoLogoSrc));

      const header = `
        <header style="width: 100%; position: fixed; top: 0; left: 0; right: 0; padding-top: 10px;">
          <div style="width: 100%; padding: 10px; display: flex; flex-direction: row; font-size: 12px;">
            <div style="width: 60%; padding: 10px; display: flex; flex-direction: column;">
              <div style="width: 100%; padding: 10px; display: flex; flex-direction: row;">
                <div style="width: 50%; padding: 10px; display: flex; flex-direction: column;">
                <strong> Administradora de Benefícios: </strong>
                  <img style="max-width: 50%;" src="data:image/png;base64,${urlAdmBase64}">
                  <div style="font-family: 'Times New Roman', Times, serif; background-color: black;padding: 2px; color: white; display: inline-block; width: fit-content;-webkit-print-color-adjust: exact">
                    <div style="border: 1px solid white">
                      ANS
                    </div>
                  </div>
                </div>
                <div style="width: 50%; padding: 10px; display: flex; flex-direction: column;">
                <strong> Operadora: </strong>
                  <img style="max-width: 50%;" src="data:image/png;base64,${urlPlanoBase64}">
                  <div style="font-family: 'Times New Roman', Times, serif; background-color: black;padding: 2px; color: white; display: inline-block; width: fit-content;-webkit-print-color-adjust: exact">
                    <div style="border: 1px solid white">
                      ANS ${ansOperadora}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div style="width: 40%; padding: 10px; display: flex; flex-direction: column;">
              <div style="width: 100%; padding: 10px; display: flex; flex-direction: row; background: #000080; color:#ffffff; -webkit-print-color-adjust: exact; border-radius: 11px 0px 0px 11px;">
                <div style="width: 50%; padding: 10px; display: flex; flex-direction: column;">
                  Numero da Proposta <br>
                  <span style="background: white; color: black; padding: 10px; border-radius: 5px;">${numeroProposta}</span>
                </div>
                <div style="width: 50%; padding: 10px; display: flex; flex-direction: column;">
                  Data Vigência <br>
                  <span style="background: white; color: black; padding: 10px; border-radius: 5px;">${dataVigencia}</span>
                </div>
              </div>
            </div>
          </div>
        </header>
      `;

      const footer = `
        <footer style="font-size:10px; text-align:center; width: 100%; padding: 10px 0; background-color: #000080; color: #ffffff; -webkit-print-color-adjust: exact; position: fixed; bottom: 0; left: 0; right: 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 0 20px;">
            <span>Mount Hermon - Administradora de Beneficíos</span>
            <span>0800 480 1000 - mounthermon.com.br</span>
          </div>
          <div style="margin-top: 5px;">
            <span class="pageNumber"></span> / <span class="totalPages"></span>
          </div>
        </footer>
      `;

      console.log("Generating PDF");
      const pdf = await page.pdf({
        format: "A4",
        displayHeaderFooter: true,
        headerTemplate: header,
        footerTemplate: footer,
        printBackground: true,
      });

      await browser.close();

      const nomeArquivo = `Proposta Nº ${numeroProposta}.pdf`;

      const filePath = path.join(
        __dirname,
        "arquivospdf",
        `Proposta Nº ${numeroProposta}.pdf`
      );
      fs.writeFileSync(filePath, pdf);
      const fileUrl = `${appUrl}/arquivospdf/${nomeArquivo}`;

      db.query(query, [numeroProposta, nomeArquivo, fileUrl], (err, result) => {
        if (err) {
          enviarMensagemDiscord( `Erro ao salvar anexo do PDF gerado da proposta ao banco de dados, ERRO: ${err} -------- Proposta Nº ${numeroProposta}`, 'erro')
          reject(err);
        } else {
          sendStatus(
            idImplantacao,
            2,
            "PDF do contrato após assinatura gerado com sucesso"
          );
          resolve(result);
        }
      });
    } catch (error) {
      console.error("Error salvar PDF:", error);
      enviarMensagemDiscord(`Erro geral na função de gerar PDF ERRO: ${error} ------ Proposta Nº ${numeroProposta}`, 'erro');
      reject(error);
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
    try {
      logger.info("Iniciando a configuração do transporter");
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

      logger.info("Transporter configurado com sucesso");

      const linkAleatorio = `${appUrl}/assinar/${idImplantacao}/${numeroProposta}/${cpfTitularFinanceiro}/${idEntidade}`;
      logger.info(`Link aleatório gerado: ${linkAleatorio}`);

      logger.info("Renderizando o template do email");
      const html = await ejs.renderFile(
        path.join(__dirname, `../${pastaInterna}/views/emailTemplate.ejs`),
        {
          nomeTitularFinanceiro,
          linkAleatorio,
        }
      );
      logger.info("Template renderizado com sucesso");

      const htmlWithInlineStyles = juice(html);

      const mailOptions = {
        from: "naoresponda@mounthermon.com.br",
        to: email,
        subject: `MOUNT HERMON - Assinatura Proposta Nº ${numeroProposta}`,
        html: htmlWithInlineStyles,
      };

      logger.info("Enviando email");
      await transporter.sendMail(mailOptions);
      logger.info("Email enviado com sucesso");
      resolve(); // Resolva a promessa se o e-mail for enviado com sucesso
    } catch (err) {
      logger.error({
        message: "Erro no envio do email ao beneficiário para assinatura",
        error: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString(),
      });
      enviarMensagemDiscord(`Erro ao enviar email para o titular do contrato ${err}`, 'erro');
      reject(err); // Rejeite a promessa se houver um erro no envio do e-mail
    }
  });
}

async function consultarNumeroProposta(idImplantacao) {
  const db = await mysql.createPool(config);
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

async function consultarIDProposta(numeroProposta) {
  const db = await mysql.createPool(config);
  return new Promise((resolve, reject) => {
    db.query(
      "SELECT id FROM implantacoes WHERE numeroProposta=?",
      [numeroProposta],
      (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result[0].id);
        }
      }
    );
  });
}

async function salvarAnexos(idImplantacao, anexos) {
  const db = await mysql.createPool(config);
  const query =
    "INSERT INTO anexos_implantacoes (id_implantacao, nome_arquivo, caminho_arquivo) VALUES (?, ?, ?)";
  const promises = []; // Array para armazenar todas as promessas de inserção

  // Iterar sobre cada anexo e criar uma promessa para inseri-lo no banco de dados
  for (const [nomeArquivo, caminhoArquivo] of Object.entries(anexos)) {
    // Adicionar a promessa de inserção ao array de promessas
    promises.push(
      new Promise((resolve, reject) => {
        db.query(
          query,
          [idImplantacao, nomeArquivo, caminhoArquivo],
          (err, result) => {
            if (err) {
              reject(err); // Rejeitar a promessa em caso de erro
            } else {
              resolve(result); // Resolver a promessa se a inserção for bem-sucedida
            }
          }
        );
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

async function formatarData(data) {
  try {
    if (typeof data !== "string") return "";

    const dataObj = new Date(data);
    if (isNaN(dataObj)) {
      console.error("Data inválida:", data);
      return "";
    }

    return format(dataObj, "dd/MM/yyyy");
  } catch (error) {
    console.error("Erro ao formatar data:", error);
    return "";
  }
}

function formatarDataDs(data) {
  var partesData = data.split("-");
  var dataFormatada = partesData[2] + "/" + partesData[1] + "/" + partesData[0];
  return dataFormatada;
}

async function sendCodigoPropostaIdProposta(codigoPropostaDs, idImplantacao) {
  const db = await mysql.createPool(config);
  try {
    await db.query('INSERT INTO propostas_codigods (numeroProposta, codigo_ds) VALUES (?, ?)', [idImplantacao, codigoPropostaDs], (err, result) => {
      return result;
    })
  } catch (err) {
    enviarMensagemDiscord(`Erro ao cadastrar código de proposta gerado no DS: ${err}`, 'erro')
  }
}

async function enviarPropostaDigitalSaude(jsonModeloDS, idImplantacao) {
  //const db = await mysql.createPool(config);
  const token = "X43ADVSEXM";
  const senhaApi = "kgt87pkxc2";
  const apiUrl = "https://digitalsaude.com.br/api/v2/contrato/";

/*   const data = JSON.stringify(jsonModeloDS); */
  const data = jsonModeloDS;
  console.log(data);

  const configDS = {
    headers: {
      "Content-Type": "application/json",
      token: token,
      senhaApi: senhaApi,
    },
  };
/* 
  logToFile(idImplantacao, `Enviando proposta: ${data}`); */

  try {
    const response = await axios.post(apiUrl, data, configDS);
    const codigoImplantacaoDS = response.data.codigo;
    console.log(codigoImplantacaoDS)
    enviarMensagemDiscord(`Response do DS para chamada de API para envio da Proposta RESPOSTA ${response.data}`, 'erro')
    logToFile(`RESPONSE DS ${idImplantacao}`, `Response Completo: ${JSON.stringify(response.data, null, 2)}`);
    sendCodigoPropostaIdProposta(codigoImplantacaoDS, idImplantacao);

    if (response.status === 200) {
      logToFile(idImplantacao, `Proposta enviada com sucesso. Código de Implantação DS: ${codigoImplantacaoDS}`);
      await sendStatus(idImplantacao, 4, "Implantação realizada com sucesso no digital saúde");
      return { success: true, data: response.data };
    } else {
      enviarMensagemDiscord(` 2 Erro ao enviar proposta para o DS: ${error.message}`, 'erro')
      logToFile(idImplantacao, `Erro ao enviar proposta. Status: ${response.status}`);
      await sendStatus(idImplantacao, 4, "Erro ao enviar proposta para o digital 1");
      return {
        success: false,
        message: `Erro: Recebido status ${response.status}`,
      };
    }
  } catch (error) {
    enviarMensagemDiscord(` 1 Erro ao enviar proposta para o DS: ${error.message}`, 'erro')
    logToFile(idImplantacao, `Erro ao enviar proposta: ${error.message}`);
    await sendStatus(idImplantacao, 4, "Erro ao enviar proposta para o digital 2");

    if (error.response) {
      const status = error.response.status;
      let message = "Erro desconhecido ao enviar a proposta.";

      if (status === 400) {
        message = "Requisição inválida (400). Verifique os dados enviados.";
      } else if (status === 401) {
        message = "Acesso não autorizado (401). Verifique suas credenciais.";
      } else if (status === 500) {
        message = "Erro interno no servidor (500). Tente novamente mais tarde.";
      }
      enviarMensagemDiscord(`2 Erro ao enviar proposta para o DS: ${error.message}`, 'erro')
      logToFile(idImplantacao, `${message}: ${JSON.stringify(error.response.data)}`);
      return { success: false, message: message, data: error.response.data };
    } else {
      enviarMensagemDiscord(` 3 Erro ao enviar proposta para o DS: ${error.message}`, 'erro')
      logToFile(idImplantacao, `Erro ao configurar a solicitação: ${error.message}`);
      return {
        success: false,
        message: "Erro ao enviar a proposta.",
        data: error.message,
      };
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
  const query =
    "INSERT INTO status_implantacao (idstatus, idimplantacao, mensagem) VALUES (?, ?, ?)";

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

async function rollbackAndRespond(res, message) {
  const db = await mysql.createPool(config);
  db.query("ROLLBACK;", [], (err) => {
    if (err) {
      console.error("Erro ao realizar rollback:", err);
    }
    res.status(500).json({ message });
  });
}

async function enviarMensagemDiscord(mensagem, tipo) {
  if (tipo === "erro"){
    try {
      console.log(`Mensagem para discord: ${mensagem}`);
      await axios.post('https://bot.midiaideal.com/mensagem-erros-ecommerce', { mensagem });
      console.log('Mensagem enviada com sucesso');
    } catch (error) {
      console.error("Erro ao enviar mensagem erro:", error);
    }
  }
  if (tipo === "financeiro"){
    try {
      console.log(`Mensagem para discord: ${mensagem}`);
      await axios.post('https://bot.midiaideal.com/mensagem-financeiro-ecommerce', { mensagem });
      console.log('Mensagem enviada com sucesso');
    } catch (error) {
      console.error("Erro ao enviar mensagem erro:", error);
    }
  }
  if(tipo === "implantacao") {
    try {
      console.log(`Mensagem para discord: ${mensagem}`);
      await axios.post('https://bot.midiaideal.com/mensagem-implantacoes-ecommerce', { mensagem });
      console.log('Mensagem enviada com sucesso');
    } catch (error) {
      console.error("Erro ao enviar mensagem erro:", error);
    }
  }  
}

async function pegarCodigoDSGrupo(idFormaPagamento, idEntidade) {
  const db = await mysql.createPool(config);

  try {
    const resultFormaPagamento = await db.query(
      `SELECT parametrizacao FROM formas_pagamento WHERE id = ?`,
      [idFormaPagamento]
    );

    if (resultFormaPagamento.length === 0) {
      throw new Error("Forma de pagamento não encontrada");
    }

    const formaDePagamento = resultFormaPagamento[0].parametrizacao;

    const resultCodigo = await db.query(
      `SELECT codigo_ds FROM entidades_parametros WHERE id_entidade = ? AND forma_pagamento = ?`,
      [idEntidade, formaDePagamento]
    );

    if (resultCodigo.length === 0) {
      throw new Error("Código DS não encontrado para a entidade e forma de pagamento");
    }
    console.log(resultCodigo[0].codigo_ds);

    return resultCodigo[0].codigo_ds;
  } catch (error) {
    console.error("Erro ao pegar código DS do grupo:", error);
    throw error; // Opcional: Rejeitar a promessa para que o chamador saiba que ocorreu um erro
  }
}



/* ---------------------------------------- ROTAS ---------------------------------------- */

app.get("/files", verificaAutenticacao, (req, res) => {
  const files = fs.readdirSync("arquivos/");
  res.render("uploads", { files: files, rotaAtual: "files" });
});

app.get("/mandarMensagemRobo/:mensagem", (req, res) => {
  const mensagem = req.params.mensagem;
  enviarMensagemDiscord(mensagem, 'erro');
  res.send("mensagem enviada com sucesso");
});

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

app.get("/rotaTeste", (req, res) => {
  console.log('Rota puxou certo')
  res.send('Está on e puxando a rota')
})

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
  const queryFormasDePagamento = "SELECT * FROM formas_pagamento";
  db.query(queryPlanos, (err, resultPlanos) => {
    if (err) {
      console.error("Erro ao consultar o banco de dados:", err);
      return res
        .status(500)
        .json({ error: "Erro ao processar consulta ao BD" });
    }
    db.query(queryFormasDePagamento, (err, resultFormasDePagamentos) => {
      if (err) {
        console.error('Erro ao buscar oas formas de pagamento')
      }
      res.render(
        "index", 
        { 
          planos: resultPlanos,
          pagamentos: resultFormasDePagamentos
        });
    })
  });
});

app.post("/formulario", async (req, res) => {
  const db = await mysql.createPool(config);
  const planoId = req.body.planoSelecionado;
  const query = "SELECT * FROM planos WHERE id = ?";
  const queryProfissoes = "SELECT * FROM profissoes";
  const queryFormasPagamento = "SELECT * FROM formas_pagamento WHERE id_plano = ?";
  const queryVencimentosDatas = "SELECT * FROM datasVencimentos"
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
        db.query(queryFormasPagamento, [planoId],  (err, resultPagamentos) => {
          if (err) {
            console.error("Erro ao resgatar formas de pagamento do BD");
          }
          const planoSelecionado = result[0];
          db.query([queryVencimentosDatas], (err, resultVencimentos) => {
            if(err) {
              console.error("Erro ao resgatar vencimentos do BD")
            }
            res.render("form", {
              planoSelecionado: planoSelecionado,
              profissoes: resultProfissoes,
              pagamentos: resultPagamentos,
              vencimentos: resultVencimentos
            });
          })
        /* req.session.planoSelecionado = planoSelecionado; */
        
      })
        
      });
    }
  });
});

/* app.post("/testeFormularioDS", async (req, res) => {
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
    cpffinanceiro: dados.cpffinanceiro || dados.cpftitular,
    nomefinanceiro: dados.nomefinanceiro || dados.nomecompleto,
    datadenascimentofinanceiro:
      dados.datadenascimentofinanceiro || dados.datadenascimento,
    telefonetitularfinanceiro:
      dados.telefonetitularfinanceiro || dados.telefonetitular,
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
    numeroProposta: numeroProposta,
    planoSelecionado: dados.planoSelecionado,
  };

  console.log(dadosImplantacao);

  const jsonModeloDS = {
    numeroProposta: `${numeroProposta}`,
    dataAssinatura: "26/02/2024",
    diaVencimento: 1,
    cpfResponsavel: dados.cpffinanceiro
      ? dados.cpffinanceiro
      : dados.cpftitular,
    nomeResponsavel: dados.nomefinanceiro
      ? dados.nomefinanceiro
      : dados.nomecompleto,
    observacao: `teste`,
    plano: {
      codigo: "VMR5GRUEPJ",
    },
    convenio: {
      codigo: "LRYT12JW8T",
    },
    produtor: {
      codigo: "E17NJPUZM2",
    },
    corretora: {
      codigo: "S62MXENV8X",
    },
    grupo: {
      codigo: "V2CAVAD6U2",
    },
    filial: {
      codigo: "BETRHPTL2K",
    },
    beneficiarioList: [
      {
        nome: dados.nomecompleto,
        dataNascimento: formatarDataDs(dados.datadenascimento),
        rg: dados.rgtitular,
        orgaoEmissor: dados.orgaoexpedidor,
        cpf: dados.cpftitular,
        dnv: "string",
        pis: "string",
        nomeMae: dados.nomemaetitular,
        endereco: dados.enderecoresidencial,
        numero: dados.numeroendereco,
        complemento: dados.complementoendereco,
        bairro: dados.bairro,
        municipio: dados.cidade,
        uf: dados.estado,
        cep: dados.cep,
        dddTelefone: "41",
        telefone: "992414553",
        dddCelular: "41",
        celular: "999665588",
        email: dados.emailtitular,
        altura: 0,
        peso: 0,
        imc: 0,
        dataVigencia: "26/02/2024",
        mensalidade: 0,
        estadoCivil: {
          id:
            dados.estadociviltitular === "Casado"
              ? 1
              : dados.estadociviltitular === "Divorciado"
              ? 2
              : dados.estadociviltitular === "Separado"
              ? 3
              : dados.estadociviltitular === "Solteiro"
              ? 4
              : dados.estadociviltitular === "Viúvo"
              ? 5
              : "",
          nome: dados.estadociviltitular,
        },
        tipoBeneficiario: {
          id: 1,
          nome: "Titular",
        },
        sexo: {
          id: dados.sexotitular === "Masculino" ? 1 : 2,
          nome: dados.sexotitular,
        },
        parentesco: {
          id: 1,
          nome: "Titular",
        },
        statusBeneficiario: {
          id: 2,
          nome: "Ativo",
        },
      },
    ],
  };

  adicionarDependentes();

  async function adicionarDependentes() {
    dependentes.forEach((dependente) => {
      //insertData(qInsDependentes, [resultImplantacao.insertId, dependente]);
      const dependenteObj = {
        nome: dependente.nomecompletodependente,
        dataNascimento: formatarDataDs(dependente.nascimentodependente),
        rg: "null",
        orgaoEmissor: "null",
        cpf: dependente.cpfdependente,
        dnv: "string",
        pis: "string",
        nomeMae: dependente.nomemaedependente,
        endereco: dados.enderecoresidencial,
        numero: dados.numeroendereco,
        complemento: dados.complementoendereco,
        bairro: dados.bairro,
        municipio: dados.cidade,
        uf: dados.estado,
        cep: dados.cep,
        dddTelefone: "41",
        telefone: "999998888",
        dddCelular: "41",
        celular: "999998888",
        email: "dependente@dependente.com.br",
        altura: 0,
        peso: 0,
        imc: 0,
        dataVigencia: "26/02/2024",
        mensalidade: 0,
        estadoCivil: {
          id:
            dependente.estadocivildependente === "Casado"
              ? 1
              : dependente.estadocivildependente === "Divorciado"
              ? 2
              : dependente.estadocivildependente === "Separado"
              ? 3
              : dependente.estadocivildependente === "Solteiro"
              ? 4
              : dependente.estadocivildependente === "Viúvo"
              ? 5
              : "",
          nome: dependente.estadocivildependente,
        },
        tipoBeneficiario: {
          id: 2,
          nome: "Dependente",
        },
        sexo: {
          id: dependente.sexodependente === "Masculino" ? 1 : 2,
          nome: dependente.sexodependente,
        },
        parentesco: {
          id:
            dependente.grauparentescodependente === "Agregado"
              ? 2
              : dependente.grauparentescodependente === "Companheiro"
              ? 3
              : dependente.grauparentescodependente === "Cônjuge"
              ? 4
              : dependente.grauparentescodependente === "Filho(a)"
              ? 5
              : dependente.grauparentescodependente === "Filho Adotivo"
              ? 6
              : dependente.grauparentescodependente === "Irmão(a)"
              ? 7
              : dependente.grauparentescodependente === "Mãe"
              ? 8
              : dependente.grauparentescodependente === "Pai"
              ? 9
              : dependente.grauparentescodependente === "Neto(a)"
              ? 10
              : dependente.grauparentescodependente === "Sobrinho(a)"
              ? 11
              : dependente.grauparentescodependente === "Sogro"
              ? 12
              : dependente.grauparentescodependente === "Enteado"
              ? 13
              : dependente.grauparentescodependente === "Tutelado"
              ? 14
              : dependente.grauparentescodependente === "Sogra"
              ? 15
              : dependente.grauparentescodependente === "Genro"
              ? 16
              : dependente.grauparentescodependente === "Nora"
              ? 17
              : dependente.grauparentescodependente === "Cunhado(a)"
              ? 18
              : dependente.grauparentescodependente === "Primo(a)"
              ? 19
              : dependente.grauparentescodependente === "Avô"
              ? 20
              : dependente.grauparentescodependente === "Avó"
              ? 21
              : dependente.grauparentescodependente === "Tio"
              ? 22
              : dependente.grauparentescodependente === "Tia"
              ? 23
              : dependente.grauparentescodependente === "Bisneto"
              ? 24
              : dependente.grauparentescodependente === "Madrasta"
              ? 25
              : 26,
          nome: dependente.grauparentescodependente,
        },
        statusBeneficiario: {
          id: 2,
          nome: "Ativo",
        },
      };
      jsonModeloDS.beneficiarioList.push(dependenteObj);
    });
  }

  await enviarPropostaDigitalSaude(jsonModeloDS);

  console.log(jsonModeloDS);

  console.log("Foi");
  res.send("Sucesso na rota, se páh na implantação também");
}); */


app.post("/testeFormulario", async (req, res) => {
  const db = await mysql.createPool(config);
  try {
    const dados = req.body.inputs;
    const dependentes = req.body.dependentes;
    const anexos = req.body.anexos;

    var cpffinanceiro = dados.cpffinanceiro
      ? dados.cpffinanceiro
      : dados.cpftitular;
    var nomefinanceiro = dados.nomefinanceiro
      ? dados.nomefinanceiro
      : dados.nomecompleto;
    var datadenascimentofinanceiro = dados.datadenascimentofinanceiro
      ? dados.datadenascimentofinanceiro
      : dados.datadenascimento;
    var sexotitularfinanceiro = dados.sexotitularfinanceiro
      ? dados.sexotitularfinanceiro
      : dados.sexotitular;
    var estadociviltitularfinanceiro = dados.estadociviltitularfinanceiro
      ? dados.estadociviltitularfinanceiro
      : dados.estadociviltitular;
    var telefonetitularfinanceiro = dados.telefonetitularfinanceiro
      ? dados.telefonetitularfinanceiro
      : dados.telefonetitular;
    var emailtitularfinanceiro = dados.emailtitularfinanceiro
      ? dados.emailtitularfinanceiro
      : dados.emailtitular;

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
      dados.idEntidade,
      dados.dataVencimento,
      dados.numerocns,
    ];

    async function obsDigitalSaude() {
      if (dados.titularresponsavelfinanceiro === "Sim") {
        return `O TITULAR É O MESMO TITULAR FINANCEIRO`;
      } else {
        return `
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
            `;
      }
    }

    let observacoesDigitalSaude = await obsDigitalSaude();

    observacoesDigitalSaude += `
        \n
        Pagamento: 
          ${
            dados.formaPagamento === 1
              ? "Boleto"
              : dados.formaPagamento === 2
              ? "Cartão de Crédito em 12x"
              : "Cartão de Crédito em 3x"
          } \n
          Profissão selecionada: ${dados.profissaotitular}
        `;

        const jsonModeloDS = {
      numeroProposta: `${numeroProposta}`,
      dataAssinatura: "26/02/2024",
      diaVencimento: `${dados.dataVencimento}`,
      cpfResponsavel: dados.cpffinanceiro
        ? dados.cpffinanceiro
        : dados.cpftitular,
      nomeResponsavel: dados.nomefinanceiro
        ? dados.nomefinanceiro
        : dados.nomecompleto,
      observacao: `${observacoesDigitalSaude}`,
      plano: {
        codigo: `${dados.codigoPlanoDS}`,
      },
      convenio: {
        codigo: `${dados.numeroConvenio}`,
      },
      produtor: {
        codigo: `${dados.idCorretor}`,
      },
      corretora: {
        codigo: `${dados.codigoCorretora}`,
      },
      grupo: {
        codigo: `${await pegarCodigoDSGrupo(dados.formaPagamento, dados.idEntidade)}`,
      },
      filial: {
        codigo: "BETRHPTL2K",
      },
      beneficiarioList: [
        {
          nome: dados.nomecompleto,
          dataNascimento: formatarDataDs(dados.datadenascimento),
          rg: dados.rgtitular,
          orgaoEmissor: dados.orgaoexpedidor,
          cpf: dados.cpftitular,
          dnv: "string",
          pis: "string",
          nomeMae: dados.nomemaetitular,
          endereco: dados.enderecoresidencial,
          numero: dados.numeroendereco,
          complemento: dados.complementoendereco,
          bairro: dados.bairro,
          municipio: dados.cidade,
          uf: dados.estado,
          cep: dados.cep,
          dddTelefone: "41",
          telefone: "99999999",
          dddCelular: "41",
          celular: "999999999",
          email: dados.emailtitular,
          altura: 0,
          peso: 0,
          imc: 0,
          dataVigencia: "26/02/2024",
          mensalidade: 0,
          estadoCivil: {
            id:
              dados.estadociviltitular === "Casado"
                ? 1
                : dados.estadociviltitular === "Divorciado"
                ? 2
                : dados.estadociviltitular === "Separado"
                ? 3
                : dados.estadociviltitular === "Solteiro"
                ? 4
                : dados.estadociviltitular === "Viúvo"
                ? 5
                : "",
            nome: dados.estadociviltitular,
          },
          tipoBeneficiario: {
            id: 1,
            nome: "Titular",
          },
          sexo: {
            id: dados.sexotitular === "Masculino" ? 1 : 2,
            nome: dados.sexotitular,
          },
          parentesco: {
            id: 1,
            nome: "Titular",
          },
          statusBeneficiario: {
            id: 2,
            nome: "Ativo",
          },
        },
      ],
    };
    /* INSERÇÃO DE DADOS AO BANCO DE DADOS DAS INFORMAÇÕES SOBRE A IMPLANTAÇÃO */
    console.log(dadosImplantacao);

    await db
      .query(qInsImplantacao, dadosImplantacao)
      .then(async (resultImplantacao) => {
        const resultImplantacaoId = resultImplantacao.insertId;
        await Promise.all(
          dependentes.map(async (dependente) => {
            await db.query(qInsDependentes, [
              dependente.cpfdependente,
              dependente.nomecompletodependente,
              dependente.nomemaedependente,
              dependente.nascimentodependente,
              dependente.sexodependente,
              dependente.estadocivildependente,
              dependente.grauparentescodependente,
              dependente.rgdependente,
              resultImplantacaoId,
            ]);
            try {
              const dependenteObj = {
                nome: dependente.nomecompletodependente,
                dataNascimento: formatarDataDs(dependente.nascimentodependente),
                rg: dependente.rgdependente,
                orgaoEmissor: "null",
                cpf: dependente.cpfdependente,
                dnv: "string",
                pis: "string",
                nomeMae: dependente.nomemaedependente,
                endereco: dados.enderecoresidencial,
                numero: dados.numeroendereco,
                complemento: dados.complementoendereco,
                bairro: dados.bairro,
                municipio: dados.cidade,
                uf: dados.estado,
                cep: dados.cep,
                dddTelefone: "41",
                telefone: "999998888",
                dddCelular: "41",
                celular: "999998888",
                email: "dependente@dependente.com.br",
                altura: 0,
                peso: 0,
                imc: 0,
                dataVigencia: "26/02/2024",
                mensalidade: 0,
                estadoCivil: {
                  id:
                    dependente.estadocivildependente === "Casado"
                      ? 1
                      : dependente.estadocivildependente === "Divorciado"
                      ? 2
                      : dependente.estadocivildependente === "Separado"
                      ? 3
                      : dependente.estadocivildependente === "Solteiro"
                      ? 4
                      : dependente.estadocivildependente === "Viúvo"
                      ? 5
                      : "",
                  nome: dependente.estadocivildependente,
                },
                tipoBeneficiario: {
                  id: 2,
                  nome: "Dependente",
                },
                sexo: {
                  id: dependente.sexodependente === "Masculino" ? 1 : 2,
                  nome: dependente.sexodependente,
                },
                parentesco: {
                  id:
                    dependente.grauparentescodependente === "Agregado"
                      ? 2
                      : dependente.grauparentescodependente === "Companheiro"
                      ? 3
                      : dependente.grauparentescodependente === "Cônjuge"
                      ? 4
                      : dependente.grauparentescodependente === "Filho(a)"
                      ? 5
                      : dependente.grauparentescodependente === "Filho Adotivo"
                      ? 6
                      : dependente.grauparentescodependente === "Irmão(a)"
                      ? 7
                      : dependente.grauparentescodependente === "Mãe"
                      ? 8
                      : dependente.grauparentescodependente === "Pai"
                      ? 9
                      : dependente.grauparentescodependente === "Neto(a)"
                      ? 10
                      : dependente.grauparentescodependente === "Sobrinho(a)"
                      ? 11
                      : dependente.grauparentescodependente === "Sogro"
                      ? 12
                      : dependente.grauparentescodependente === "Enteado"
                      ? 13
                      : dependente.grauparentescodependente === "Tutelado"
                      ? 14
                      : dependente.grauparentescodependente === "Sogra"
                      ? 15
                      : dependente.grauparentescodependente === "Genro"
                      ? 16
                      : dependente.grauparentescodependente === "Nora"
                      ? 17
                      : dependente.grauparentescodependente === "Cunhado(a)"
                      ? 18
                      : dependente.grauparentescodependente === "Primo(a)"
                      ? 19
                      : dependente.grauparentescodependente === "Avô"
                      ? 20
                      : dependente.grauparentescodependente === "Avó"
                      ? 21
                      : dependente.grauparentescodependente === "Tio"
                      ? 22
                      : dependente.grauparentescodependente === "Tia"
                      ? 23
                      : dependente.grauparentescodependente === "Bisneto"
                      ? 24
                      : dependente.grauparentescodependente === "Madrasta"
                      ? 25
                      : 26,
                  nome: dependente.grauparentescodependente,
                },
                statusBeneficiario: {
                  id: 0,
                  nome: "Ativo",
                },
              };
              jsonModeloDS.beneficiarioList.push(dependenteObj);
            } catch (error) {
              logger.error({
                message:
                  "Erro ao dar push do dependente no objeto dependentes rota envio de dados da proposta",
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString(),
              });
              console.error(
                "Erro ao dar push do dependente no objeto dependentes",
                error
              );
            }
          })
        );

        try {
          await enviarMensagemDiscord(
            `
            NOVA PROPOSTA RECEBIDA DE Nº: ${numeroProposta}
            TItular: ${dados.nomecompleto},
            Titular Financeiro: ${dados.titularresponsavelfinanceiro}
            `,
            'implantacao'
          )
        } catch (error) {
          logToFile (`ERRO DISCORD MSG: ${numeroProposta}`, 'Erro ao enviar mensagem para o discord sobre nova implantacao')
        }

        try {
          await enviarMensagemDiscord(
            `
            NOVA PROPOSTA RECEBIDA DE Nº: ${numeroProposta}
            TItular Financeiro: ${nomefinanceiro}
            CPF: ${cpffinanceiro}
            Endereço: ${dados.enderecoresidencial}, Nº ${dados.numeroendereco}, Bairro: ${dados.bairro}, Cidade: ${dados.cidade}, Estado: ${dados.estado}, CEP: ${dados.cep}
            --- Forma de Pagamento ---

            `,
            'financeiro'
          )
        } catch (error) {
          logToFile (`ERRO DISCORD MSG: ${numeroProposta}`, 'Erro ao enviar mensagem para o discord sobre nova implantacao')
        }

        try {
          await salvarAnexos(numeroProposta, anexos);
        } catch (error) {
          enviarMensagemDiscord(`Erro ao salvar Anexos ${error}`, 'erro');
          logger.error({
            message: "Erro ao salvar anexos rota envio de dados da proposta",
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
          });
          console.error("Erro ao salvar anexos:", error);
        }

        // ENVIAR EMAIL COM CONTRATO

        try {
          await sendContractEmail(
            dados.emailtitularfinanceiro
              ? dados.emailtitularfinanceiro
              : dados.emailtitular,
            resultImplantacaoId,
            numeroProposta,
            cpffinanceiro,
            nomefinanceiro,
            dados.idEntidade
          );
        } catch (error) {
          enviarMensagemDiscord(
            `Erro ao enviar email para o titular do contrato ${error}`, 'erro'
          );
          logger.error({
            message:
              "Erro ao enviar email para o titular do contrato rota envio de dados da proposta",
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
          });
          console.error("Erro ao enviar email com contrato", error);
        }

        // ENVIAR PROPOSTA DIGITAL SAÚDE

        try {
          await enviarPropostaDigitalSaude(jsonModeloDS, resultImplantacaoId);
        } catch (error) {
          // Tratamento de erro adicional, se necessário
          enviarMensagemDiscord(
            `Erro ao enviar dados para o DS da proposta ${error}`, 'erro'
          );
          logger.error({
            message:
              "Erro ao enviar proposta para o Digital Saúde rota envio de dados da proposta",
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
          });
          await sendStatus(
            resultImplantacaoId,
            4,
            "Erro ao enviar proposta para o digital 3"
          );
          console.error("Erro inesperado ao enviar proposta:", error);
        }

        try {
          await sendStatus(
            resultImplantacaoId,
            2,
            "Implantação realizada com sucesso ao Ecommerce"
          );
        } catch (error) {
          enviarMensagemDiscord(
            `Erro ao mudar status da proposta para realizada com sucesso ${error}`, 'erro'
          );
          logger.error({
            message:
              "Erro ao enviar atualização de status da proposta para o Ecommerce rota envio de dados da proposta",
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
          });
          console.error("Erro ao mudar status da proposta", error);
        }
        res.status(200).json({ numeroPropostaGerado: numeroProposta });
        //res.render('sucesso', {numeroPropostaGerado: numeroProposta})
        //res.status(200).send({ message: "Implantação realizada com sucesso!" });
      })
      .catch((error) => {
        enviarMensagemDiscord(`Erro durante a implantação ${error}`, 'erro');
        logger.error({
          message:
            "Erro geral durante a implantação rota envio de dados da proposta",
          error: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
        });
        console.error("Erro durante a implantação:", error);
        res.status(500).send({ error: error.message });
      });
  } catch (error) {
    enviarMensagemDiscord(`Erro geral ${error}`, 'erro');
    logger.error({
      message:
        "Erro2 geral durante a implantação rota envio de dados da proposta",
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
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
        senhaApi: senhaApi,
      },
    };

    // Fazer a solicitação à API
    const apiUrl = `https://digitalsaude.com.br/api/v2/produtor/procurarPorNumeroDocumento?numeroDocumento=${cpfCorretor}`;
    const response = await axios.get(apiUrl, configDS);

    // Verificar se a API retornou algum resultado
    if (response.data.length === 0) {
      enviarMensagemDiscord(
        `
        Erro na busca pelo corretor \n
        ${response.data}
        `,
        'erro'
      );
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
            codigoCorretora: corretor.produtor.codigo,
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
          codigoCorretora: corretorData.produtor.codigo,
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

app.get("/enviar-email/:id", verificaAutenticacao, async (req, res) => {
  const db = await mysql.createPool(config);
  const idImplantacao = req.params.id;
  const queryImplantacoes = "SELECT * FROM implantacoes WHERE id=?";

  try {
    db.query(queryImplantacoes, [idImplantacao], async (err, result) => {
      if (err) {
        res.cookie("alertError", "Erro ao pegar dados do beneficiário para disparo de email", { maxAge: 3000 });
        return res.status(500).send("Erro ao pegar dados do beneficiário");
      }

      console.log(result);
      let implantacao = result[0];

      try {
        await sendContractEmail(
          implantacao.emailtitularfinanceiro,
          idImplantacao,
          implantacao.numeroProposta,
          implantacao.cpffinanceiro,
          implantacao.nomefinanceiro,
          implantacao.identidade
        );
        res.cookie("alertSuccess", "Disparo de email feito com sucesso, aguarde até 5 minutos para verificar se usuário recebe o email", { maxAge: 3000 });
        res.status(200).send("Envio de email feito com sucesso.");
      } catch (error) {
        logger.error({
          message: "Erro no envio do email ao beneficiário para assinatura",
          error: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
        });
        console.error(error);
        res.cookie("alertError", "Erro ao enviar o e-mail", { maxAge: 3000 });
        res.status(500).send("Erro ao enviar o e-mail");
      }
    });
  } catch (err) {
    logger.error({
      message: "Erro ao conectar com o banco de dados",
      error: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString(),
    });
    res.status(500).send("Erro ao conectar com o banco de dados");
  }
});

app.get("/login", (req, res) => {
  res.render("login");
});

/* ROTA PARA ASSINATURA DO CONTRATO */
app.get(
  "/assinar/:idImplantacao/:numeroProposta/:cpfTitularFinanceiro/:idEntidade",
  async (req, res) => {
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
    var view;

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

                      const dependentes = resultDependentes;

                      dependentes.forEach((dependente) => {
                        dependente.nascimentodependente = format(
                          new Date(dependente.nascimentodependente),
                          "dd/MM/yyyy"
                        );
                      });

                      const plano = resultPlano[0];
                      var tipoContrato = plano.tipoContrato;

                      console.log(tipoContrato)

                      if (tipoContrato === "OdontoGroup") {
                        view = "contratoOdontoGroup";
                      } else if (tipoContrato === "DentalUni") {
                        view = "contratoDentalUni";
                      } else if (tipoContrato === "Porto") {
                        view = "contratoPorto";
                      } else {
                        view = "contrato";
                      }

                      console.log(view)

                      const implantacao = resultImplantacoes[0];
                      implantacao.datadenascimento = format(
                        new Date(implantacao.datadenascimento),
                        "dd/MM/yyyy"
                      );

                      res.render(view, {
                        implantacao: implantacao,
                        plano: resultPlano[0],
                        dataFormatada: dataFormatada,
                        entidade: resultEntidade[0],
                        dependentes: dependentes,
                        documentos: resultDocumentos,
                        assinaturaBase64: assinaturaBase64,
                        dadosAssinatura: resultAssinatura[0],
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
  const numeroProposta = req.body.numeroProposta;
  const planoLogo = req.body.planoLogo;
  const dataVigencia = req.body.dataVigencia;
  const urlContrato = req.body.urlContrato;
  const idImplantacao = req.body.idImplantacao;
  const assinatura = req.body.assinatura_base64;
  const ansOperadora = req.body.ansOperadora

  // Capturar o IP do solicitante
  const ipAddress =
    req.headers["x-forwarded-for"] || req.connection.remoteAddress;

  // Capturar a data e horário em UTC-3
  const timestamp = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
  );

  // Pegar localização se estiver disponível
  const location = req.body.location;

  const sqlInsertAssign =
    "INSERT INTO assinatura_implantacao(id_implantacao, assinatura_base64, ip_address, timestamp, location) VALUES (?,?,?,?,?)";

  db.query(
    sqlInsertAssign,
    [idImplantacao, assinatura, ipAddress, timestamp, location],
    async (err, result) => {
      if (err) {
        logger.info("ERRO: ao salvar assinatura do beneficiário no BD", err);
        logger.error({
          message: "ROTA: ASSINAR | ERRO: ao salvar assinatura do beneficiário",
          error: err.message,
          stack: err.stack,
          timestamp: new Date().toISOString(),
        });

        console.error("Erro ao salvar assinatura do beneficiário");
        res.cookie(
          "alertError",
          "Erro ao salvar assinatura, contate o suporte"
        );
        res
          .status(500)
          .send("Erro ao enviar assinatura, solicite auxílio do suporte");
        return;
      }
      logger.info("MSG: Inseriu no banco a assinatura");

      await sendStatus(idImplantacao, 2, "Proposta assinada pelo contratante");
      await gerarSalvarPDFProposta(
        urlContrato,
        numeroProposta,
        idImplantacao,
        planoLogo,
        dataVigencia,
        ansOperadora
      );
      await enviarAnexosParaDSContrato(numeroProposta);

      res.cookie("alertSuccess", "Assinatura feita com sucesso", {
        maxAge: 3000,
      });
      res.status(200).send("Assinado com sucesso.");
    }
  );
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
  const numeroProposta = await consultarNumeroProposta(idImplantacao);

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
          res.status(500).send("Erro ao buscar plano vinculado à implantação");
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
              [numeroProposta],
              (err, resultDocumentos) => {
                if (err) {
                  console.error(
                    "Erro na busca pelos documentos vinculados a implantação",
                    err
                  );
                }
                db.query(queryStatus, [idImplantacao], (err, resultStatus) => {
                  if (err) {
                    console.error("Erro ao buscar status da implantacao", err);
                  }
                  const data_implantacao = new Date(
                    resultImplantacoes[0].data_implantacao
                  );
                  const dia = String(data_implantacao.getDate()).padStart(
                    2,
                    "0"
                  );
                  const mes = String(data_implantacao.getMonth() + 1).padStart(
                    2,
                    "0"
                  );
                  const ano = data_implantacao.getFullYear();
                  const dataFormatada = `${dia}/${mes}/${ano}`;

                  res.render("detalhes-implantacao", {
                    implantacao: resultImplantacoes[0],
                    plano: resultPlano[0],
                    dataFormatada: dataFormatada,
                    entidade: resultEntidade[0],
                    dependentes: resultDependentes,
                    documentos: resultDocumentos,
                    status: resultStatus,
                    rotaAtual: "implantacoes",
                    moment: moment
                  });
                });
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
  const queryFormasPagamento = "SELECT * FROM formas_pagamento";
  const files = fs.readdirSync("arquivos/");

  db.query(queryPlanos, (err, resultPlanos) => {
    if (err) {
      console.error("Erro ao consultar o banco de dados:", err);
      res.status(500).send("Erro ao consultar os planos");
    }
    db.query(queryFormasPagamento, (err, resultFormasPagamento) => {
      if(err) {
        console.error('Erro ao trazer as formas de pagamento cadastradas', err)
      }
      res.render("planos", {
        planos: resultPlanos,
        formasDePagamento: resultFormasPagamento,
        files: files,
        rotaAtual: "planos",
      });
    })
  });
});

app.post('/planos/:idPlano/forma-pagamento', async (req, res) => {
  const db = await mysql.createPool(config);
  const { idPlano } = req.params;
  console.log(idPlano)
  const { paymentDescription, paymentType, minParcelValue, totalPaymentValue } = req.body;

  try {
      const query = `
          INSERT INTO formas_pagamento (id_plano, descricao, parametrizacao, valor_parcela_minima, valor_total_pgto)
          VALUES (?, ?, ?, ?, ?)
      `;
      await db.query(query, [idPlano, paymentDescription, paymentType, minParcelValue, totalPaymentValue]);
      res.status(200).json({ message: 'Forma de pagamento salva com sucesso!' });
  } catch (error) {
      console.error('Erro ao salvar forma de pagamento:', error);
      res.status(500).json({ message: 'Erro ao salvar forma de pagamento.' });
  }
});

app.put('/planos/:idPlano/forma-pagamento/:idForma', async (req, res) => {
  console.log('entrou na rota de atualização da forma de pagamento do plano');
  const db = await mysql.createPool(config);
  const { idPlano, idForma } = req.params;
  const { paymentDescription, paymentType, minParcelValue, totalPaymentValue } = req.body;

  try {
      const query = `
          UPDATE formas_pagamento
          SET descricao = ?, parametrizacao = ?, valor_parcela_minima = ?, valor_total_pgto = ?
          WHERE id = ? AND id_plano = ?
      `;
      await db.query(query, [paymentDescription, paymentType, minParcelValue, totalPaymentValue, idForma, idPlano]);
      res.status(200).json({ message: 'Forma de pagamento atualizada com sucesso!' });
  } catch (error) {
      console.error('Erro ao atualizar forma de pagamento:', error);
      res.status(500).json({ message: 'Erro ao atualizar forma de pagamento.' });
  }
});

// Rota para excluir uma forma de pagamento
app.delete('/planos/:idPlano/forma-pagamento/:idForma', async (req, res) => {
  const db = await mysql.createPool(config);
  const { idPlano, idForma } = req.params;

  try {
      const query = `
          DELETE FROM formas_pagamento WHERE id = ? AND id_plano = ?
      `;
      await db.query(query, [idForma, idPlano]);
      res.status(200).json({ message: 'Forma de pagamento excluída com sucesso!' });
  } catch (error) {
      console.error('Erro ao excluir forma de pagamento:', error);
      res.status(500).json({ message: 'Erro ao excluir forma de pagamento.' });
  }
});

app.get('/planos/:idPlano/formas-pagamento', async (req, res) => {
  const db = await mysql.createPool(config);
  const { idPlano }  = req.params;
  console.log('entrou aqui com o id do Plano:' + idPlano)
  try {
      const query = `
          SELECT * FROM formas_pagamento WHERE id_plano = ?
      `;
      const formasDePagamento = await db.query(query, [idPlano]);
      res.status(200).json(formasDePagamento);
  } catch (error) {
      console.error('Erro ao buscar formas de pagamento:', error);
      res.status(500).json({ message: 'Erro ao buscar formas de pagamento.' });
  }
});

app.post("/atualiza-planos", verificaAutenticacao, async (req, res) => {
  const db = await mysql.createPool(config);
  const { plano } = req.body;
  db.query("SELECT *FROM planos WHERE id = ?", [plano.id], (err, result) => {
    if (err) {
      console.error("Erro ao consultar plano ao tentar atualiza-lo", err);
    }
    if (result.length > 0) {
      // O plano existe, atualize-o
      const updateQuery =
        "UPDATE planos SET nome_do_plano = ?, ans = ?, descricao = ?, observacoes = ?, logo = ?, banner = ? , contratacao= ?, coparticipacao = ?, abrangencia = ?, pgtoAnualAvista = ?, pgtoAnualCartao =? , pgtoAnualCartao3x = ? , reajuste = ? , numeroConvenio = ?, codigoPlanoDS = ?, areaatuacao = ?, ansOperadora = ?, siteOperadora = ?, telefoneOperadora = ?, cnpjOperadora = ?, razaoSocialOperadora = ? WHERE id = ?";
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
          plano.areaatuacao,
          plano.ansOperadora,
          plano.siteOperadora,
          plano.telefoneOperadora,
          plano.cnpjOperadora,
          plano.razaoSocialOperadora,
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
        "INSERT INTO planos (nome_do_plano, ans, descricao, observacoes, logo, banner, contratacao, coparticipacao, abrangencia, pgtoAnualAvista, pgtoAnualCartao, pgtoAnualCartao3x, reajuste, numeroConvenio, codigoPlanoDS, areaatuacao, ansOperadora, siteOperadora, telefoneOperadora, cnpjOperadora, razaoSocialOperadora) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
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
          plano.codigoPlanoDS,
          plano.areaatuacao,
          plano.ansOperadora,
          plano.siteOperadora,
          plano.telefoneOperadora,
          plano.cnpjOperadora,
          plano.razaoSocialOperadora,
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
  });
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
    db.query("SELECT * FROM profissoes", (error, resultProfissoes) => {
      if (error) throw error;
      res.render("entidades", {
        entidades: resultsEntidades,
        profissoes: resultProfissoes,
        rotaAtual: "entidades",
      });
    });
  });
});

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

      res.cookie("alertSuccess", "Entidade atualizada com Sucesso", {
        maxAge: 3000,
      });
      res.status(200).json({ message: "Entidade atualizada com sucesso" });
    }
  );
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

app.post("/editar-profissao/:id", verificaAutenticacao, async (req, res) => {
  const db = await mysql.createPool(config);
  const idProfissao = req.params.id;
  const { nome, idEntidade } = req.body;

  await db.query(
    "UPDATE profissoes SET nome=?, idEntidade=? WHERE id=?",
    [nome, idEntidade, idProfissao],
    async (error, result) => {
      if (error) {
        res.cookie(
          "alertError",
          "Erro ao atualizar Entidade, verifique e tente novamente",
          {
            maxAge: 3000,
          }
        );
      }
      res.cookie("alertSuccess", "Profissão atualizada com sucesso", {
        maxAge: 3000,
      });
      res.status(200).json({ message: "Profissão atualizada com sucesso" });
    }
  );
});

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

app.get("/generate-pdf", async (req, res) => {
  const link = req.query.url;
  const numeroProposta = req.query.numeroProposta;
  const planoLogoSrc = req.query.planoLogo;
  const dataVigencia = req.query.dataVigencia;
  const ansOperadora = req.query.ansOperadora;


  try {
    console.log("Launching browser");
    const browser = await puppeteer.launch({
      headless: true, // Mude para true para produção
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();

    const url = link;
    console.log(`Navigating to URL: ${url}`);
    await page.goto(url, { waitUntil: "networkidle2", timeout: 180000 });

    console.log("Waiting for CSS to load");
    await page.waitForSelector("body"); // Aguarde um elemento específico que garante que os estilos foram aplicados

    // Aguarde até que o conteúdo da página esteja completamente carregado
    await page.evaluate(() => {
      return new Promise((resolve) => {
        if (document.readyState === "complete") {
          resolve();
        } else {
          window.addEventListener("load", resolve);
        }
      });
    });

    const urlAdmBase64 = getBase64Image(
      path.join(__dirname, "img", "logomounthermonoriginal.png")
    );
    const urlPlanoBase64 = getBase64Image(path.join(__dirname, planoLogoSrc));

    const header = `
      <header style="width: 100%; position: fixed; top: 0; left: 0; right: 0; padding-top: 10px;">
        <div style="width: 100%; padding: 10px; display: flex; flex-direction: row; font-size: 12px;">
          <div style="width: 60%; padding: 10px; display: flex; flex-direction: column;">
            <div style="width: 100%; padding: 10px; display: flex; flex-direction: row;">
              <div style="width: 50%; padding: 10px; display: flex; flex-direction: column;">
              <strong> Administradora de Benefícios: </strong>
                <img style="max-width: 50%;" src="data:image/png;base64,${urlAdmBase64}">
                <div style="font-family: 'Times New Roman', Times, serif; background-color: black;padding: 2px; color: white; display: inline-block; width: fit-content;-webkit-print-color-adjust: exact">
                  <div style="border: 1px solid white">
                    ANS 42167-7
                  </div>
                </div>
              </div>
              <div style="width: 50%; padding: 10px; display: flex; flex-direction: column;">
              <strong> Operadora: </strong>
                <img style="max-width: 50%;" src="data:image/png;base64,${urlPlanoBase64}">
                <div style="font-family: 'Times New Roman', Times, serif; background-color: black;padding: 2px; color: white; display: inline-block; width: fit-content;-webkit-print-color-adjust: exact">
                  <div style="border: 1px solid white">
                    ANS ${ansOperadora}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div style="width: 40%; padding: 10px; display: flex; flex-direction: column;">
            <div style="width: 100%; padding: 10px; display: flex; flex-direction: row; background: #000080; color:#ffffff; -webkit-print-color-adjust: exact; border-radius: 11px 0px 0px 11px;">
              <div style="width: 50%; padding: 10px; display: flex; flex-direction: column;">
                Numero da Proposta <br>
                <span style="background: white; color: black; padding: 10px; border-radius: 5px;">${numeroProposta}</span>
              </div>
              <div style="width: 50%; padding: 10px; display: flex; flex-direction: column;">
                Data Proposta <br>
                <span style="background: white; color: black; padding: 10px; border-radius: 5px;">${dataVigencia}</span>
              </div>
            </div>
          </div>
        </div>
      </header>
    `;

    const footer = `
      <footer style="font-size:10px; text-align:center; width: 100%; padding: 10px 0; background-color: #000080; color: #ffffff; -webkit-print-color-adjust: exact; position: fixed; bottom: 0; left: 0; right: 0;">
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0 20px;">
          <span>Mount Hermon - Administradora de Beneficíos</span>
          <span>0800 480 1000 - mounthermon.com.br</span>
        </div>
        <div style="margin-top: 5px;">
          <span class="pageNumber"></span> / <span class="totalPages"></span>
        </div>
      </footer>
    `;

    console.log("Generating PDF");
    const pdf = await page.pdf({
      format: "A4",
      displayHeaderFooter: true,
      headerTemplate: header,
      footerTemplate: footer,
      printBackground: true,
    });

    await browser.close();
    console.log("PDF generated");

    const filePath = path.join(__dirname, "arquivospdf", "modeloProposta2.pdf");
    fs.writeFileSync(filePath, pdf);
    console.log(`PDF saved to ${filePath}`);

    res.contentType("application/pdf");
    res.send(pdf);
  } catch (error) {
    logger.error({
      message: "Erro geração de pdf da proposta",
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    console.error("Error generating PDF:", error);
    res.status(500).send("Erro ao gerar PDF");
  }
});

app.get('/entidades-parametros', verificaAutenticacao, async (req, res) => {
  const db = await mysql.createPool(config);
  db.query("SELECT * FROM entidades_parametros", (error, resultsEntidades) => {
    if (error) throw error;
      res.render("entidades-parametros", {
        entidades: resultsEntidades,
        rotaAtual: "entidades-parametros",
      });
    });
});

app.get('/get-entidades', verificaAutenticacao, async (req, res) => {
  const db = await mysql.createPool(config);
  db.query('SELECT id, nome FROM entidades', (err, results) => {
    if (err) throw err;
    res.json({ entidades: results });
  });
});

app.get('/get-operadoras', verificaAutenticacao, async (req, res) => {
  const db = await mysql.createPool(config);
  db.query('SELECT id, nome FROM operadoras', (err, results) => {
    if (err) throw err;
    res.json({ operadoras: results });
  });
});

// Rota para obter os parâmetros existentes
app.get('/get-entidades-parametros', verificaAutenticacao, async (req, res) => {
  const db = await mysql.createPool(config);
  db.query('SELECT * FROM entidades_parametros', (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

// Rota para cadastrar novos parâmetros
app.post('/cadastrar-entidade-parametro', verificaAutenticacao, async (req, res) => {
  const db = await mysql.createPool(config);
  const { id_entidade, nome_entidade, forma_pagamento, codigo_ds, id_operadora } = req.body;
  const query = 'INSERT INTO entidades_parametros (id_entidade, nome_entidade, forma_pagamento, codigo_ds, operadora) VALUES (?, ?, ?, ?, ?)';
  db.query(query, [id_entidade, nome_entidade, forma_pagamento, codigo_ds, id_operadora], (err, result) => {
    if (err) throw err;
    res.json({ success: true });
  });
});

// Rota para editar parâmetros
app.put('/editar-entidade-parametro/:id', verificaAutenticacao, async (req, res) => {
  const db = await mysql.createPool(config);
  console.log('chegou aqui')
  const { id } = req.params;
  const { id_entidade_edit, nome_entidade_edit, forma_pagamento_edit, codigo_ds_edit, id_operadora_edit} = req.body;
  const query = 'UPDATE entidades_parametros SET id_entidade = ?,forma_pagamento = ?, nome_entidade = ?, codigo_ds = ?, operadora = ? WHERE id = ?';
  console.log({
    id_entidade_edit, 
    forma_pagamento_edit, 
    nome_entidade_edit, 
    codigo_ds_edit, 
    id_operadora_edit,
    id
  })
  db.query(query, [id_entidade_edit, forma_pagamento_edit, nome_entidade_edit, codigo_ds_edit, id_operadora_edit, id], (err, result) => {
    if (err) {
      console.log(err);
      throw err;
    }
    res.json({ success: true });
  });
});

// Rota para deletar parâmetros
app.delete('/deletar-entidade-parametro/:id', verificaAutenticacao, async (req, res) => {
  const db = await mysql.createPool(config);
  const { id } = req.params;
  const query = 'DELETE FROM entidades_parametros WHERE id = ?';
  db.query(query, [id], (err, result) => {
    if (err) throw err;
    res.json({ success: true });
  });
});

/* TESTES  */

app.get('/testeMensagem', async (req, res) => {
  const { mensagem, tipo } = req.query;
  const result = await enviarMensagemDiscord(mensagem, tipo);
  res.send(result);

})

app.get('/teste001', async (req, res) => {
  const db = await mysql.createPool(config);
  const planoId = 1
  const query = "SELECT * FROM planos WHERE id = ?";
  const queryProfissoes = "SELECT * FROM profissoes";
  const queryFormasPagamento = "SELECT * FROM formas_pagamento WHERE id_plano = ?";
  const queryVencimentosDatas = "SELECT * FROM datasVencimento"
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
        db.query(queryFormasPagamento, [planoId],  (err, resultPagamentos) => {
          if (err) {
            console.error("Erro ao resgatar formas de pagamento do BD");
          }
          const planoSelecionado = result[0];
          db.query(queryVencimentosDatas, (err, resultVencimentos) => {
              if(err) {
                console.error('Erro ao buscar datas de vencimento')
              }
              console.log(resultVencimentos);
              res.render("formulario8", {
                planoSelecionado: planoSelecionado,
                profissoes: resultProfissoes,
                pagamentos: resultPagamentos,
                vencimentos: resultVencimentos
              });
            }
          )
      })
      });
    }
  });
})

app.get('/testecodigodsgrupo', async (req, res) => {
  const { idEntidade, idPagamento } = req.query;
  try {
    let result = await pegarCodigoDSGrupo(idPagamento, idEntidade);
    console.log(result)
    res.send({
      'Código DS referente aos parametros ': result
    });
  } catch (error) {
    console.error('Erro ao obter o código DS:', error);
    res.status(500).send('Erro ao obter o código DS');
  }
});


/* FIM TESTES */

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
