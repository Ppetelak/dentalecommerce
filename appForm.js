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

    let codigoGrupo = await pegaCodigoGrupo(
      formadePagamentoSelecionada,
      entidadeId
    );

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

    const codigoDsGrupo = await pegarCodigoDSGrupo(idFormaPagamento)

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
          await salvarAnexos(numeroProposta, anexos);
        } catch (error) {
          enviarErroDiscord(`Erro ao salvar Anexos ${error}`);
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
          enviarErroDiscord(
            `Erro ao enviar email para o titular do contrato ${error}`
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
          enviarErroDiscord(
            `Erro ao enviar dados para o DS da proposta ${error}`
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
            "Erro ao enviar proposta para o digital"
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
          enviarErroDiscord(
            `Erro ao mudar status da proposta para realizada com sucesso ${error}`
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
        enviarErroDiscord(`Erro durante a implantação ${error}`);
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
    enviarErroDiscord(`Erro geral ${error}`);
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
