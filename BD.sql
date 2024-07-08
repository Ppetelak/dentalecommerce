/* Criação banco de dados */

CREATE DATABASE mhdentalvendas

/* Tabela geral com as implantações */

CREATE TABLE implantacoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    data_implantacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    nomecompleto VARCHAR(100) NOT NULL,
    datadenascimento DATE NOT NULL,
    cpftitular VARCHAR(20) NOT NULL,
    nomemaetitular VARCHAR(200) NOT NULL,
    rgtitular VARCHAR(20) NOT NULL,
    orgaoexpedidor VARCHAR(50) NOT NULL,
    dataexpedicaorgtitular DATE NOT NULL,
    sexotitular ENUM('Masculino', 'Feminino') NOT NULL,
    estadociviltitular ENUM('Solteiro','Casado','Divorciado','Viúvo','Outro') NOT NULL,
    telefonetitular VARCHAR(20) NOT NULL,
    celulartitular VARCHAR(20) NOT NULL,
    emailtitular VARCHAR(50) NOT NULL,
    profissaotitular ENUM('Comerciário','Estudante','Profissional Liberal','Funcionário Público','Funcionário Correios','Profissional de Salão de Beleza') NOT NULL,
    titularresponsavelfinanceiro ENUM('Sim','Não'),
    cpffinanceiro VARCHAR(20),
    nomefinanceiro VARCHAR(100),
    datadenascimentofinanceiro DATE,
    sexotitularfinanceiro ENUM('Masculino', 'Feminino'),
    estadociviltitularfinanceiro ENUM('Solteiro','Casado','Divorciado','Viúvo','Outro'),
    telefonetitularfinanceiro VARCHAR(20),
    emailtitularfinanceiro VARCHAR(50),
    grauparentesco ENUM('Conjugê','Filho','Mãe','Filha','Enteado(a)','Pai','Irmão/Irmã','Sogro/Sogra','Bisavô/Bisavó','Neto','Bisneto','Avô/Avó','Padrasto/Madastra','Tio/Tia','Sobrinho/Sobrinha','Genro/Nora','Cunhado/Cunhada'),
    cep VARCHAR(20) NOT NULL,
    enderecoresidencial VARCHAR(120) NOT NULL,
    numeroendereco VARCHAR(20) NOT NULL,
    complementoendereco VARCHAR(100),
    bairro VARCHAR(50) NOT NULL,
    cidade VARCHAR(50) NOT NULL,
    estados ENUM('AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO') NOT NULL,
    cpfcorretor VARCHAR(20) NOT NULL,
    nomecorretor VARCHAR(100) NOT NULL,
    corretora VARCHAR(100) NOT NULL,
    celularcorretor VARCHAR(20) NOT NULL,
    formaPagamento VARCHAR(50) NOT NULL,
    aceitoTermos ENUM('Sim','Não') NOT NULL,
    aceitoPrestacaoServicos ENUM('Sim','Não')   
)

/* Tabela com os dados dos dependentes */

CREATE TABLE dependentes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  cpfdependente VARCHAR(20) NOT NULL,
  nomecompletodependente VARCHAR(100) NOT NULL,
  nomemaedependente VARCHAR(100) NOT NULL,
  nascimentodependente DATE NOT NULL,
  sexodependente ENUM('Masculino','Feminino') NOT NULL,
  estadocivildependente ENUM('Solteiro','Casado','Divorciado','Viúvo','Outro') NOT NULL,
  grauparentesco ENUM('Conjugê','Filhos','Pai/Mãe','Avô/Avó','Tio/Tia','Outros') NOT NULL,
  id_implantacoes INT,
  FOREIGN KEY (id_implantacoes) REFERENCES implantacoes(id)
);


/* TABELA DE PLANOS */

CREATE TABLE planos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome_do_plano VARCHAR(100) NOT NULL,
    logo VARCHAR(255),
    descricao TEXT,
    ans VARCHAR(20),
    observacoes TEXT
);

/* TABELA DE CORRETORES */

CREATE TABLE corretores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    cpf VARCHAR(14) NOT NULL,
    email VARCHAR(255),
    telefone VARCHAR(20) NOT NULL,
    corretora VARCHAR(255)
);

CREATE TABLE corretoras (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nomefantasia VARCHAR(100),
    razaosocial VARCHAR(100),
    cnpj NUMBER, 
)

CREATE TABLE entidades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(30),
    descricao VARCHAR(40),
    publico VARCHAR(60),
    documentos VARCHAR (100),
    taxa DECIMAL(10, 2) NOT NULL,
)

CREATE TABLE profissoes_entidades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(30),
    id_entidade INT
)

CREATE TABLE formularios_entidades (
    
)

CREATE TABLE IF NOT EXISTS assinatura_implantacao (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_implantacao INT, -- Substitua pelo ID da implantação relacionada
    assinatura_base64 TEXT,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE anexos_implantacoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_implantacao INT,
    nome_arquivo VARCHAR(255),
    caminho_arquivo VARCHAR(255),
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Propostas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numeroProposta INT NOT NULL,
    caminhoArquivoPDF VARCHAR(255) NOT NULL,
    dataCriacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE propostas_codigods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numeroProposta INT NOT NULL,
    codigo_ds VARCHAR(255) NOT NULL,
    dataCriacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)

ALTER TABLE anexos_implantacoes MODIFY COLUMN id_implantacao VARCHAR(255);
