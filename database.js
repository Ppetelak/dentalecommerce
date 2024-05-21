const mysql = require("mysql2");

/* const db = mysql.createPool({
  host: "localhost",
  user: "root",
  port: "3306",
  password: "pmp078917",
  database: "mhdentalvendas",
  waitForConnections: true,
  connectionLimit: 10, // Ajuste conforme necessário
  queueLimit: 0,
}); */

/* const db = mysql.createConnection({
    host: "pablopetelak.com",
    user: "u654656997_dev",
    port: "3306",
    password: "0Uc0d53^w",
    database: "u654656997_mhvendasdev",
}) */

const db = mysql.createPool({
    host: "pablopetelak.com",
    user: "u654656997_dev",
    port: "3306",
    password: "0Uc0d53^w",
    database: "u654656997_mhvendasdev",
    waitForConnections: true,
    connectionLimit: 10, // Ajuste conforme necessário
    queueLimit: 0
});

/* const db = mysql.createConnection({
    host: "localhost",
    user: "mhdentalvendas_user",
    password: "6_64idh9V",
    database: "mhdentalvendas2",
    port: "3306",
}); */

function connectToDatabase() {
    db.getConnection((error, connection) => {
        if (error) {
            console.error('Erro ao conectar ao banco de dados:', error);
        } else {
            console.log('Conexão bem-sucedida ao banco de dados');
            // Libera a conexão quando não estiver mais em uso
            //connection.release();
            //resolve();
        }
    });
}

/* Inserir dados da implantação */
const qInsImplantacao = `
    INSERT INTO implantacoes (
        nomecompleto,
        datadenascimento,
        cpftitular,
        nomemaetitular,
        rgtitular,
        orgaoexpedidor,
        dataexpedicaorgtitular,
        sexotitular,
        estadociviltitular,
        telefonetitular,
        emailtitular,
        profissaotitular,
        titularresponsavelfinanceiro,
        cpffinanceiro,
        nomefinanceiro,
        datadenascimentofinanceiro,
        sexotitularfinanceiro,
        estadociviltitularfinanceiro,
        telefonetitularfinanceiro,
        emailtitularfinanceiro,
        grauparentesco,
        cep,
        enderecoresidencial,
        numeroendereco,
        complementoendereco,
        bairro,
        cidade,
        estados,
        cpfcorretor,
        nomecorretor,
        corretora,
        celularcorretor,
        formaPagamento,
        AceitoTermos,
        AceitoPrestacaoServicos,
        planoSelecionado,
        numeroProposta
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

async function insertData(query, values) {
    return new Promise((resolve, reject) => {
        db.getConnection(function (err, connection) {
            if (err) throw err;
            connection.query(query, values, (err, result) => {
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
                    connection.release();
                }
            });
        });
    });
}

module.exports = {
  db,
  connectToDatabase,
  insertData,
  qInsImplantacao,
};
