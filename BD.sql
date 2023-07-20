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

