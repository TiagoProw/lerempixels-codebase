// frontend geral_masterPages.js
// Versão corrigida e compatível com Wix Frontend
// - polling para detectar aumento e diminuição de pontos
// - inicialização segura do saldo inicial
// - pausa do polling quando a aba está oculta (economia de recursos)
// - agregação de notificações rápidas
// - fallback quando os elementos de toast não existem

import wixData from 'wix-data';
import wixWindow from 'wix-window';
import wixUsers from 'wix-users';

const POLLING_INTERVAL_MS = 10000; // intervalo recomendado (ms). Ajuste se quiser mais responsividade.
const AGGREGATION_WINDOW_MS = 2000; // junta alterações rápidas em 2s

let ultimoSaldoPontos = 0;
let pollingTimer = null;
let aggregationTimer = null;
let pendingDelta = 0;

$w.onReady(async () => {
  // inicia só para usuários logados
  const user = wixUsers.currentUser;
  if (!user || !user.loggedIn) {
    // usuário não logado — nada a fazer
    return;
  }

  // busca saldo inicial (evita notificação falsa no primeiro load)
  await initSaldoPontos(user.id);

  // start polling
  startPolling(user.id);

  // pausa polling quando a aba estiver oculta para economizar recursos
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopPolling();
    } else {
      startPolling(user.id);
    }
  });

  // limpa timers ao sair (boa prática)
  wixWindow.getBoundingRect() // apenas para garantir que wixWindow foi carregado; não usado
    .catch(() => { /* noop */ });

  // optional: quando a janela for fechada, limpamos timers
  window.addEventListener('beforeunload', () => {
    stopPolling();
    clearAggregationTimer();
  });
});

/* ---------- Polling control ---------- */
function startPolling(userId) {
  if (pollingTimer) return; // já rodando
  pollingTimer = setInterval(() => {
    checarPontosUsuario(userId).catch(err => console.error('checarPontosUsuario erro:', err));
  }, POLLING_INTERVAL_MS);
}

function stopPolling() {
  if (!pollingTimer) return;
  clearInterval(pollingTimer);
  pollingTimer = null;
}

/* ---------- Inicialização do saldo ---------- */
async function initSaldoPontos(userId) {
  try {
    const result = await wixData.query('ProgressoUsuarios')
      .eq('userId', userId)
      .descending('dataRegistro') // pega o registro mais recente
      .limit(1)
      .find();

    if (result.items.length > 0) {
      ultimoSaldoPontos = Number(result.items[0].pontosAtuais || 0);
    } else {
      ultimoSaldoPontos = 0;
    }
  } catch (err) {
    console.error('Erro ao inicializar saldo de pontos:', err);
    ultimoSaldoPontos = 0;
  }
}

/* ---------- Checagem periódica ---------- */
async function checarPontosUsuario(userId) {
  try {
    const result = await wixData.query('ProgressoUsuarios')
      .eq('userId', userId)
      .descending('dataRegistro')
      .limit(1)
      .find();

    if (!result || result.items.length === 0) return;

    const item = result.items[0];
    const pontosAtuais = Number(item.pontosAtuais || 0);

    if (pontosAtuais !== ultimoSaldoPontos) {
      const delta = pontosAtuais - ultimoSaldoPontos;
      // agregação para não floodar toasts
      aggregateDelta(delta);

      // atualiza imediatamente para não duplicar contagens
      ultimoSaldoPontos = pontosAtuais;
    }
  } catch (err) {
    console.error('Erro ao checar pontos do usuário:', err);
  }
}

/* ---------- Agregação / Throttle de notificações ---------- */
function aggregateDelta(delta) {
  pendingDelta += delta;

  // reinicia timer de agregação
  clearAggregationTimer();
  aggregationTimer = setTimeout(() => {
    const total = pendingDelta;
    pendingDelta = 0;
    aggregationTimer = null;
    mostrarNotificacaoDelta(total);
  }, AGGREGATION_WINDOW_MS);
}

function clearAggregationTimer() {
  if (aggregationTimer) {
    clearTimeout(aggregationTimer);
    aggregationTimer = null;
  }
}

/* ---------- Exibição de notificação (UI) ---------- */
function mostrarNotificacaoDelta(delta) {
  if (!delta) return;

  const texto = delta > 0
    ? `+${delta} Pixel Point${Math.abs(delta) > 1 ? 's' : ''}!`
    : `-${Math.abs(delta)} Pixel Point${Math.abs(delta) > 1 ? 's' : ''}!`;

  mostrarNotificacao(texto);
}

function mostrarNotificacao(mensagem) {
  try {
    // Preferência: usar elementos da Master Page se existirem
    if ($w('#boxNotificacaoMais') && $w('#textNotificacaoMais')) {
      $w('#textNotificacaoMais').text = mensagem;
      // mostra com slide da direita
      $w('#boxNotificacaoMais').show('slide', { duration: 400, direction: 'right' })
        .then(() => {
          setTimeout(() => {
            $w('#boxNotificacaoMais').hide('slide', { duration: 400, direction: 'right' });
          }, 3000);
        });
      return;
    }
  } catch (e) {
    // se algo der errado com $w, cairemos para fallback
    console.warn('Erro ao usar elementos de notificação:', e);
  }

  // Fallback: lightbox se existir, caso contrário console
  try {
    wixWindow.openLightbox('Notificacao', { mensagem })
      .catch(() => console.log('NOTIF (lightbox fallback):', mensagem));
  } catch (e) {
    console.log('NOTIF:', mensagem);
  }
}
