//const mysql = require('mysql2/promise');

const mysql = require('promise-mysql');


const config = {
    host: "localhost",
    user: "root",
    port: "3306",
    password: "pmp078917",
    database: "mhdentalvendas",
    waitForConnections: true,
    connectionLimit: 50, // Ajuste conforme necessário
    queueLimit: 0,
}

const configProd = {
    host: "localhost",
    user: "mhdentalvendas_user",
    password: "6_64idh9V",
    database: "mhdentalvendas2",
    port: "3306",
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
        celulartitular,
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
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

const qInsDependentes = `INSERT INTO dependentes (
    cpfdependente,
    nomecompletodependente,
    nomemaedependente,
    nascimentodependente,
    sexodependente,
    estadocivildependente,
    grauparentescodependente,
    id_implantacoes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`;

const  qInsEntidade =`
  UPDATE entidades SET nome=?, descricao=?, publico=?, documentos=?, taxa=? WHERE id=?
  `;

module.exports = {
    mysql,
    config,
    qInsImplantacao,
    qInsDependentes,
    qInsEntidade
};
