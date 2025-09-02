// Frontend - Minhas Recompensas

import wixUsers from 'wix-users';
import wixData from 'wix-data';
import wixLocation from 'wix-location';
import wixWindow from 'wix-window';
import { obterQuantidadesDeCuponsDisponiveis, resgatarCupom } from 'backend/recompensas';
import { getResumoPontos } from 'backend/infoPontos';

let pontosUsuario = 0;
let totalComprasUsuario = 0;
let pontosTotaisAcumulados = 0;

/**
 * Converte e valida o valor do cupom antes de enviar ao backend.
 * Garante inteiro entre 1 e 10. Evita "Valor inválido" no backend.
 */
async function safeResgatarCupom(rawValor) {
  const valor = Number(rawValor);
  if (!Number.isInteger(valor) || valor < 1 || valor > 10) {
    console.warn('safeResgatarCupom: valor inválido recebido:', rawValor);
    throw new Error('VALOR_INVALIDO');
  }
  return resgatarCupom(valor);
}

$w.onReady(async function () {
  const user = wixUsers.currentUser;

  if (!user.loggedIn) {
    console.log('Usuário não está logado.');
    // Opcional: redirecionar ou mostrar mensagem
    return;
  }

  console.log('Usuário logado, ID:', user.id);

  // --- Funções internas ---

  // Atualiza os pontos e total de compras do usuário
  async function atualizarPontosUsuario() {
    const userId = wixUsers.currentUser.id;

    // Monta mês/ano atual no formato MM/YYYY
    const hoje = new Date();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const ano = hoje.getFullYear();
    const mesAnoAtual = `${mes}/${ano}`;

    // Busca via backend, com fallback automático para o registro mais recente
    const resumo = await getResumoPontos(userId, mesAnoAtual);

    pontosUsuario = resumo.pontosAtuais || 0;
    totalComprasUsuario = resumo.totalCompras || 0;
    pontosTotaisAcumulados = resumo.pontosTotaisAcumulados || 0;

    $w('#textPontosUsuario').text = `${pontosUsuario}`;

    console.log('Resumo pontos:', resumo);
  }

  // Atualiza o repeater de cupons disponíveis para resgate
  async function atualizarRepeaterCupons() {
    const contagem = await obterQuantidadesDeCuponsDisponiveis();

    const opcoes = Array.from({ length: 10 }, (_, i) => {
      const valor = i + 1;
      return {
        _id: `cupom-${valor}`,
        valorReais: valor,
        pontosNecessarios: valor * 20,
        resgatesDisponiveis: contagem[valor] || 0,
      };
    });

    $w('#repeaterCupom').data = opcoes;
  }

  // Carrega o repeater de recompensas baseado nos pontos do usuário
  async function carregarRecompensas() {
    const { items: recompensas } = await wixData
      .query('RecompensasDisponiveis')
      .eq('ativo', true)
      .find();

    $w('#repeaterRecompensas').data = recompensas;

    $w('#repeaterRecompensas').onItemReady(($item, itemData) => {
      const pontosNecessarios = itemData.pontosNecessarios || 0;
      const tipoResgate = itemData.tipoResgate || 'cupom';
      const titulo = itemData.userId || 'Sem título';
      const descricao = itemData.descricao || 'Sem descrição';

      $item('#textTitulo').text = titulo;
      $item('#textDescricao').text = descricao;

      $item('#textCupom').collapse();
      $item('#btnObterCupom').hide();
      $item('#barraProgresso').hide();

      if (tipoResgate === 'cupom') {
        $item('#textPontosNecessarios').text = `${pontosNecessarios} Pixel Points`;

        const podeResgatar = pontosUsuario >= pontosNecessarios;
        $item('#btnObterCupom').label = podeResgatar ? 'Obter Cupom' : 'Pontos Insuficientes';
        podeResgatar ? $item('#btnObterCupom').enable() : $item('#btnObterCupom').disable();
        $item('#btnObterCupom').show();

        $item('#btnObterCupom').onClick(() => {
          if (podeResgatar) {
            $item('#textCupom').text = itemData.codigoDesconto || 'Cupom não disponível';
            $item('#textCupom').expand();
            $item('#btnObterCupom').label = 'Cupom Exibido';
            $item('#btnObterCupom').disable();
          }
        });
      } else if (tipoResgate === 'progresso') {
        if (titulo.toLowerCase().includes('compra')) {
          const comprasNecessarias = 2;
          const progresso = Math.min(totalComprasUsuario / comprasNecessarias, 1);
          $item('#textPontosNecessarios').text =
            `${totalComprasUsuario} de ${comprasNecessarias} compras` + (progresso >= 1 ? ' ✔️' : '');
          $item('#barraProgresso').value = progresso * 100;
          $item('#barraProgresso').show();
        } else if ((itemData.pontosTotais || 0) > 0) {
          // usa pontosTotaisAcumulados com o requisito 'pontosTotais' da recompensa
          const requisito = Number(itemData.pontosTotais) || 0;
          const atingido = Math.min(pontosTotaisAcumulados, requisito);
          const progresso = requisito > 0 ? Math.min(pontosTotaisAcumulados / requisito, 1) : 0;
          $item('#textPontosNecessarios').text =
            `${atingido} de ${requisito} Pixel Points` + (pontosTotaisAcumulados >= requisito ? ' ✔️' : '');
          $item('#barraProgresso').value = progresso * 100;
          $item('#barraProgresso').show();
        } else if (pontosNecessarios > 0) {
          // fallback: usa saldo atual (pontosAtuais)
          const pontosMostrados = Math.min(pontosUsuario, pontosNecessarios);
          $item('#textPontosNecessarios').text =
            `${pontosMostrados} de ${pontosNecessarios} Pixel Points` +
            (pontosUsuario >= pontosNecessarios ? ' ✔️' : '');
          $item('#barraProgresso').value = (pontosMostrados / pontosNecessarios) * 100;
          $item('#barraProgresso').show();
        } else {
          $item('#textPontosNecessarios').text = `Concluído ✔️`;
        }
      } else if (tipoResgate === 'externo' && itemData.codigoDesconto) {
        $item('#textPontosNecessarios').text = `Clique para acessar`;
        $item('#btnObterCupom').label = 'Acessar';
        $item('#btnObterCupom').enable();
        $item('#btnObterCupom').onClick(() => {
          wixLocation.to(itemData.codigoDesconto);
        });
        $item('#btnObterCupom').show();
      }
    });
  }

  // Vincula o onItemReady do repeater de cupons (registrar uma vez)
  function bindRepeaterCupons() {
    $w('#repeaterCupom').onItemReady(($item, itemData) => {
      const valorReais = Number(itemData.valorReais);
      const pontosNecessarios = Number(itemData.pontosNecessarios) || 0;
      const resgatesDisponiveis = Number(itemData.resgatesDisponiveis) || 0;

      $item('#textValorCupom').text = `R$${valorReais}`;
      $item('#textValorPontos').text = `${pontosNecessarios} Pixel Points`;
      $item('#textRestamCupom').text = `${resgatesDisponiveis}/10 resgates`;

      const podeResgatar = pontosUsuario >= pontosNecessarios && resgatesDisponiveis > 0;

      const $btn = $item('#btnResgatarCupom');
      $btn.label = podeResgatar ? 'Resgatar' : 'Indisponível';
      podeResgatar ? $btn.enable() : $btn.disable();

      $btn.onClick(async () => {
        // reforça a validação e melhora UX
        $btn.disable();
        $btn.label = 'Processando...';

        try {
          await safeResgatarCupom(valorReais);

          // Atualiza pontos do usuário
          await atualizarPontosUsuario();

          // Atualiza contagem de cupons e UI do item atual
          const contagemAtualizada = await obterQuantidadesDeCuponsDisponiveis();
          const restamAtual = Number(contagemAtualizada[valorReais]) || 0;
          $item('#textRestamCupom').text = `${restamAtual}/10 resgates`;

          // Atualiza lista de cupons do usuário
          await carregarCuponsUsuario();

          $btn.label = 'Resgatado!';
        } catch (erro) {
          console.error('Erro ao resgatar cupom:', erro);
          const msg = (erro && erro.message ? String(erro.message) : '').toLowerCase();
          if (msg.includes('pontos') || msg.includes('insuf')) {
            $btn.label = 'Pontos insuficientes';
          } else if (msg.includes('valor_invalido') || msg.includes('valor inválido') || msg.includes('valor_invalido')) {
            $btn.label = 'Valor inválido';
          } else {
            $btn.label = 'Erro ao resgatar';
          }

          setTimeout(() => {
            $btn.label = 'Tentar novamente';
            $btn.enable();
          }, 2000);
        }
      });

      console.log('Repetidor carregando cupom:', {
        valorReais,
        pontosNecessarios,
        resgatesDisponiveis,
        pontosUsuario,
      });
    });
  }

  // Função para carregar os cupons usados pelo usuário
  async function carregarCuponsUsuario() {
    const userId = user.id;

    const { items } = await wixData
      .query('UsoDePontos')
      .eq('userId', userId)
      .descending('_createdDate')
      .find();

    if (!items.length) {
      $w('#meusCuponsContainer').collapse();
      $w('#textSemCupons').text = 'Você não tem cupons';
      $w('#textSemCupons').expand();
      return;
    }

    $w('#textSemCupons').collapse();
    $w('#meusCuponsContainer').expand();

    $w('#repeaterMeusCupons').data = items;
    $w('#repeaterMeusCupons').onItemReady(($item, itemData) => {
      $item('#textValorCupomUsado').text = `R$${itemData.valorDescontado}`;
      $item('#textCodigoCupomUsado').text = itemData.codigoCupom;

      $item('#btnCopiarCupom').onClick(() => {
        wixWindow.copyToClipboard(itemData.codigoCupom).then(() => {
          $item('#btnCopiarCupom').label = 'Copiado!';
          $item('#btnCopiarCupom').style.color = 'green'; // altera a cor para verde
          setTimeout(() => {
            $item('#btnCopiarCupom').label = 'Copiar';
            $item('#btnCopiarCupom').style.color = ''; // reseta a cor para padrão
          }, 1500);
        });
      });
    });
  }

  // Atualiza tudo que depende de pontos
  async function atualizarTudo() {
    await atualizarPontosUsuario();
    await carregarRecompensas();
    await atualizarRepeaterCupons();
  }

  // --- Inicialização principal ---
  await atualizarTudo();
  await carregarCuponsUsuario();
  bindRepeaterCupons();

  // --- Eventos de UI ---

  // Abre a aba dos cupons para resgatar
  $w('#btnCriarCupom').onClick(async () => {
    // Se estava escondida (hide), expand() sozinho não mostra. Por isso fazemos ambos:
    $w('#abaRepeaterCupom').show();
    $w('#abaRepeaterCupom').expand();

    await atualizarRepeaterCupons();
  });

  // Fecha a aba dos cupons
  $w('#btnFecharCaixaCupom').onClick(() => {
    $w('#abaRepeaterCupom').collapse();
    $w('#abaRepeaterCupom').hide();
  });

  $w('#btnFecharCaixaCupom2').onClick(() => {
    $w('#abaRepeaterCupom').collapse();
    $w('#abaRepeaterCupom').hide();
  });
});