// frontend geral_masterPages.js (versão com proteções para document/window)
import wixData from 'wix-data';
import wixWindow from 'wix-window';
import wixUsers from 'wix-users';

const POLLING_INTERVAL_MS = 10000;
const AGGREGATION_WINDOW_MS = 2000;

let ultimoSaldoPontos = 0;
let pollingTimer = null;
let aggregationTimer = null;
let pendingDelta = 0;

$w.onReady(async () => {
  const user = wixUsers.currentUser;
  if (!user || !user.loggedIn) return;

  await initSaldoPontos(user.id);
  startPolling(user.id);

  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopPolling();
      else startPolling(user.id);
    });
  }

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('beforeunload', () => {
      stopPolling();
      clearAggregationTimer();
    });
  }
});

function startPolling(userId) {
  if (pollingTimer) return;
  pollingTimer = setInterval(() => {
    checarPontosUsuario(userId).catch(err => console.error('checarPontosUsuario erro:', err));
  }, POLLING_INTERVAL_MS);
}
function stopPolling() {
  if (!pollingTimer) return;
  clearInterval(pollingTimer);
  pollingTimer = null;
}

async function initSaldoPontos(userId) {
  try {
    const result = await wixData.query('ProgressoUsuarios')
      .eq('userId', userId)
      .descending('dataRegistro')
      .limit(1)
      .find();
    ultimoSaldoPontos = result.items.length > 0 ? Number(result.items[0].pontosAtuais || 0) : 0;
  } catch (err) {
    console.error('Erro ao inicializar saldo de pontos:', err);
    ultimoSaldoPontos = 0;
  }
}

async function checarPontosUsuario(userId) {
  try {
    const result = await wixData.query('ProgressoUsuarios')
      .eq('userId', userId)
      .descending('dataRegistro')
      .limit(1)
      .find();
    if (!result || result.items.length === 0) return;
    const pontosAtuais = Number(result.items[0].pontosAtuais || 0);
    if (pontosAtuais !== ultimoSaldoPontos) {
      aggregateDelta(pontosAtuais - ultimoSaldoPontos);
      ultimoSaldoPontos = pontosAtuais;
    }
  } catch (err) {
    console.error('Erro ao checar pontos do usuário:', err);
  }
}

function aggregateDelta(delta) {
  pendingDelta += delta;
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
function mostrarNotificacaoDelta(delta) {
  if (!delta) return;
  const texto = delta > 0 ? `+${delta} Pixel Point${Math.abs(delta) > 1 ? 's' : ''}!`
                         : `-${Math.abs(delta)} Pixel Point${Math.abs(delta) > 1 ? 's' : ''}!`;
  mostrarNotificacao(texto);
}
function mostrarNotificacao(mensagem) {
  try {
    if ($w('#boxNotificacaoMais') && $w('#textNotificacaoMais')) {
      $w('#textNotificacaoMais').text = mensagem;
      $w('#boxNotificacaoMais').show('slide', { duration: 400, direction: 'right' })
        .then(() => setTimeout(() => $w('#boxNotificacaoMais').hide('slide', { duration: 400, direction: 'right' }), 3000));
      return;
    }
  } catch (e) {
    console.warn('Erro ao usar elementos de notificação:', e);
  }

  try {
    wixWindow.openLightbox('Notificacao', { mensagem }).catch(() => console.log('NOTIF (lightbox):', mensagem));
  } catch (e) {
    console.log('NOTIF:', mensagem);
  }
}
