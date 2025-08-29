import wixData from 'wix-data';
import { currentMember } from 'wix-members';
import { session } from 'wix-storage';

let ultimoSaldoPontos = 0;
const POLLING_INTERVAL_MS = 5000;

$w.onReady(async () => {
  const member = await currentMember.getMember();
  if (!member) return;

  const userId = member._id;
  ultimoSaldoPontos = await fetchSaldoAtual(userId) || 0;

  // Salva o saldo inicial no session
  session.setItem("saldoPontosAtual", String(ultimoSaldoPontos));

  setInterval(async () => {
    const saldoAtual = await fetchSaldoAtual(userId);
    if (saldoAtual === undefined) return;

    if (saldoAtual !== ultimoSaldoPontos) {
      const delta = saldoAtual - ultimoSaldoPontos;

      if (delta > 0) {
        mostrarNotificacaoMais(`+${delta} Pixel Points!`);
      } else {
        mostrarNotificacaoMenos(`-${Math.abs(delta)} Pixel Points!`);
      }

      // 🔹 Atualiza o sessionStorage
      session.setItem("saldoPontosAtual", String(saldoAtual));

      ultimoSaldoPontos = saldoAtual;
    }
  }, POLLING_INTERVAL_MS);
});

async function fetchSaldoAtual(userId) {
  try {
    const result = await wixData.query("ProgressoUsuarios")
      .eq("userId", userId)
      .descending("dataRegistro")
      .limit(1)
      .find();

    if (result.items.length === 0) return 0;
    return result.items[0].pontosAtuais || 0;
  } catch (e) {
    console.error("Erro ao buscar saldo:", e);
    return 0;
  }
}

function mostrarNotificacaoMais(msg) {
  if ($w('#boxNotificacaoMais') && $w('#textNotificacaoMais')) {
    $w('#textNotificacaoMais').text = msg;
    $w('#boxNotificacaoMais').show("slide", { duration: 500, direction: "right" });
    setTimeout(() => $w('#boxNotificacaoMais').hide("slide", { duration: 500, direction: "right" }), 3000);
  }
}

function mostrarNotificacaoMenos(msg) {
  if ($w('#boxNotificacaoMenos') && $w('#textNotificacaoMenos')) {
    $w('#textNotificacaoMenos').text = msg;
    $w('#boxNotificacaoMenos').show("slide", { duration: 500, direction: "right" });
    setTimeout(() => $w('#boxNotificacaoMenos').hide("slide", { duration: 500, direction: "right" }), 3000);
  }
}
