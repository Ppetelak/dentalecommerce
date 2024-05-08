const mysql = require("mysql2");

const db = mysql.createPool({
    host: "localhost",
    user: "root",
    port: "3306",
    password: "pmp078917",
    database: "mhdentalvendas",
    waitForConnections: true,
    connectionLimit: 1, // Ajuste conforme necessário
    queueLimit: 0
});

/* const db = mysql.createPool({
    host: "pablopetelak.com",
    user: "u654656997_dev",
    port: "3306",
    password: "0Uc0d53^w",
    database: "u654656997_mhvendasdev",
    waitForConnections: true,
    connectionLimit: 1, // Ajuste conforme necessário
    queueLimit: 0
}); */

/* const db = mysql.createConnection({
    host: "localhost",
    user: "mhdentalvendas_user",
    password: "6_64idh9V",
    database: "mhdentalvendas2",
    port: "3306",
}); */

function connectToDatabase() {
    return new Promise((resolve, reject) => {
        db.getConnection((error, connection) => {
            if (error) {
                console.error('Erro ao conectar ao banco de dados:', error);
                reject(error);
            } else {
                console.log('Conexão bem-sucedida ao banco de dados');
                // Libera a conexão quando não estiver mais em uso
                connection.release();
                resolve();
            }
        });
    });
}

/* Inserir dados da implantação */
const qInsImplantacao = `
    /* Inserir dados da implantação */
    INSERT INTO implantacoes SET ?
    `;


module.exports = { 
    db,
    connectToDatabase, 
    qInsImplantacao
};

