// frontend geral_masterPages.js
import wixData from 'wix-data';
import wixWindow from 'wix-window';
import wixUsers from 'wix-users';

const POLLING_INTERVAL_MS = 50000; // intervalo polling
const AGGREGATION_WINDOW_MS = 2000; // janela para agregar alterações rápidas

let ultimoSaldoPontos = 0;
let pollingTimer = null;
let aggregationTimer = null;
let pendingDelta = 0;

$w.onReady(async () => {
  const user = wixUsers.currentUser;
  if (!user || !user.loggedIn) return;

  // inicializa saldo inicial
  await initSaldoPontos(user.id);

  // inicia polling
  startPolling(user.id);
});

/* ---------- Polling ---------- */
function startPolling(userId) {
  if (pollingTimer) return;
  pollingTimer = setInterval(() => {
    checarPontosUsuario(userId).catch(err => console.error('Erro checarPontosUsuario:', err));
  }, POLLING_INTERVAL_MS);
}

function stopPolling() {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
}

/* ---------- Inicialização do saldo ---------- */
async function initSaldoPontos(userId) {
  try {
    const result = await wixData.query('ProgressoUsuarios')
      .eq('userId', userId)
      .descending('dataRegistro')
      .limit(1)
      .find();

    ultimoSaldoPontos = result.items.length > 0 ? Number(result.items[0].pontosAtuais || 0) : 0;
  } catch (err) {
    console.error('Erro initSaldoPontos:', err);
    ultimoSaldoPontos = 0;
  }
}

/* ---------- Checagem de alterações ---------- */
async function checarPontosUsuario(userId) {
  try {
    const result = await wixData.query('ProgressoUsuarios')
      .eq('userId', userId)
      .descending('dataRegistro')
      .limit(1)
      .find();

    if (!result.items.length) return;

    const pontosAtuais = Number(result.items[0].pontosAtuais || 0);

    if (pontosAtuais !== ultimoSaldoPontos) {
      aggregateDelta(pontosAtuais - ultimoSaldoPontos);
      ultimoSaldoPontos = pontosAtuais;
    }
  } catch (err) {
    console.error('Erro checarPontosUsuario:', err);
  }
}

/* ---------- Agregação ---------- */
function aggregateDelta(delta) {
  pendingDelta += delta;

  if (aggregationTimer) clearTimeout(aggregationTimer);
  aggregationTimer = setTimeout(() => {
    const total = pendingDelta;
    pendingDelta = 0;
    aggregationTimer = null;
    mostrarNotificacaoDelta(total);
  }, AGGREGATION_WINDOW_MS);
}

/* ---------- Exibição de notificações ---------- */
function mostrarNotificacaoDelta(delta) {
  if (!delta) return;

  if (delta > 0) {
    // pontos ganhos
    mostrarNotificacao('#boxNotificacaoMais', '#textNotificacaoMais', `+${delta} Pixel Point${delta > 1 ? 's' : ''}!`);
  } else {
    // pontos perdidos
    mostrarNotificacao('#boxNotificacaoMenos', '#textNotificacaoMenos', `-${Math.abs(delta)} Pixel Point${Math.abs(delta) > 1 ? 's' : ''}!`);
  }
}

function mostrarNotificacao(boxId, textId, mensagem) {
  try {
    if ($w(boxId) && $w(textId)) {
      $w(textId).text = mensagem;
      $w(boxId).show('slide', { duration: 400, direction: 'right' })
        .then(() => setTimeout(() => $w(boxId).hide('slide', { duration: 400, direction: 'right' }), 3000));
      return;
    }
  } catch (e) {
    console.warn('Erro mostrarNotificacao elementos:', e);
  }

  // fallback lightbox
  try {
    wixWindow.openLightbox('Notificacao', { mensagem }).catch(() => console.log('NOTIF lightbox:', mensagem));
  } catch (e) {
    console.log('NOTIF fallback:', mensagem);
  }
}

/* ---------- Atualização imediata após resgate ---------- */
export async function atualizarSaldoPontosImediatamente(userId) {
  try {
    const result = await wixData.query('ProgressoUsuarios')
      .eq('userId', userId)
      .descending('dataRegistro')
      .limit(1)
      .find();

    if (!result.items.length) return;

    const pontosAtuais = Number(result.items[0].pontosAtuais || 0);
    const delta = pontosAtuais - ultimoSaldoPontos;
    if (delta !== 0) {
      aggregateDelta(delta);
      ultimoSaldoPontos = pontosAtuais;
    }
  } catch (err) {
    console.error('Erro atualizarSaldoPontosImediatamente:', err);
  }
}
