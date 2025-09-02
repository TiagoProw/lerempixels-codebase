import wixData from 'wix-data';
import { currentMember } from 'wix-members';
import { session } from 'wix-storage';

let ultimoSaldo = 0;
const POLLING_INTERVAL_MS = 5000;

$w.onReady(async () => {
  // 1) Esconde notificações ao carregar a página
  $w('#boxNotificacaoMais').hide();
  $w('#boxNotificacaoMenos').hide();

  // 2) Pega membro logado
  const member = await currentMember.getMember();
  if (!member) return;
  const userId = member._id;

  // 3) Fetch inicial e grava em memória (e opcionalmente em sessionStorage)
  ultimoSaldo = await fetchSaldoAtual(userId);
  session.setItem("saldoPontosAtual", String(ultimoSaldo));
  console.log("Saldo inicial:", ultimoSaldo);

  // 4) Inicia polling
  setInterval(async () => {
    const novoSaldo = await fetchSaldoAtual(userId);
    if (novoSaldo === undefined) return;

    if (novoSaldo !== ultimoSaldo) {
      const delta = novoSaldo - ultimoSaldo;
      console.log("Saldo mudou:", delta);

      if (delta > 0) {
        mostrarNotificacaoMais(`+${delta} Pixel Points!`);
      } else {
        mostrarNotificacaoMenos(`-${Math.abs(delta)} Pixel Points!`);
      }

      session.setItem("saldoPontosAtual", String(novoSaldo));
      ultimoSaldo = novoSaldo;
    }
  }, POLLING_INTERVAL_MS);
});

async function fetchSaldoAtual(userId) {
  try {
    const result = await wixData.query("ProgressoUsuarios")
      .eq("userId", userId)
      .descending("_updatedDate")   // usa campo válido
      .limit(1)
      .find();

    console.log("Query ProgressoUsuarios:", result);
    if (result.items.length === 0) return 0;
    return Number(result.items[0].pontosAtuais) || 0;

  } catch (e) {
    console.error("Erro ao buscar saldo:", e);
    return 0;
  }
}

function mostrarNotificacaoMais(msg) {
  $w('#textNotificacaoMais').text = msg;
  $w('#boxNotificacaoMais')
    .show("slide", { duration: 500, direction: "right" });
  setTimeout(() => {
    $w('#boxNotificacaoMais')
      .hide("slide", { duration: 500, direction: "right" });
  }, 3000);
}

function mostrarNotificacaoMenos(msg) {
  $w('#textNotificacaoMenos').text = msg;
  $w('#boxNotificacaoMenos')
    .show("slide", { duration: 500, direction: "right" });
  setTimeout(() => {
    $w('#boxNotificacaoMenos')
      .hide("slide", { duration: 500, direction: "right" });
  }, 3000);
}