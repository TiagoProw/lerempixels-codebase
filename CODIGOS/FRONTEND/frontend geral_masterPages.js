// masterPage.js
import wixData from 'wix-data';
import wixUsers from 'wix-users';
import { currentMember } from 'wix-members-frontend';

// polling config
const POLLING_INTERVAL_MS = 5000; // intervalo do polling em ms (5 segundos)
const AGGREGATION_WINDOW_MS = 2500; // junta várias alterações rápidas em 2.5s

// estado local
let ultimoSaldoPontos = Number(localStorage.getItem('ultimoSaldoPontos') || 0);
let aggregationTimer = null;
let pendingDelta = 0;

$w.onReady(() => {
    const user = wixUsers.currentUser;

    if (!user.loggedIn) return; // só para membros logados

    // consulta inicial para definir o saldo atual
    initSaldoPontos();

    // inicia o polling para verificar novos pontos
    setInterval(checkPontosUsuario, POLLING_INTERVAL_MS);
});

// consulta inicial do saldo atual
async function initSaldoPontos() {
    const user = wixUsers.currentUser;
    try {
        const result = await wixData.query("ProgressoUsuarios")
            .eq("userId", user.id)
            .descending("dataRegistro") // pega o registro mais recente
            .limit(1)
            .find();

        if (result.items.length > 0) {
            ultimoSaldoPontos = result.items[0].pontosAtuais || 0;
        }
    } catch (err) {
        console.error("Erro ao inicializar saldo de pontos:", err);
    }
}

// função que verifica se houve aumento de pontos
async function checkPontosUsuario() {
    const user = wixUsers.currentUser;
    if (!user.loggedIn) return;

    try {
        const result = await wixData.query("ProgressoUsuarios")
            .eq("userId", user.id)
            .descending("dataRegistro")
            .limit(1)
            .find();

        if (result.items.length === 0) return;

        const item = result.items[0];
        const pontosAtuais = item.pontosAtuais || 0;

        if (pontosAtuais > ultimoSaldoPontos) {
            const pontosGanhos = pontosAtuais - ultimoSaldoPontos;
            mostrarNotificacao(`+${pontosGanhos} Pixel Points!`);
        } else if (pontosAtuais < ultimoSaldoPontos) {
            const pontosPerdidos = ultimoSaldoPontos - pontosAtuais;
            mostrarNotificacao(`-${pontosPerdidos} Pixel Points!`);
        }

        // atualiza o saldo armazenado
        ultimoSaldoPontos = pontosAtuais;

    } catch (err) {
        console.error("Erro ao checar pontos do usuário:", err);
    }
}

// função que mostra a notificação
function mostrarNotificacao(mensagem) {
    try {
        if ($w('#boxNotificacaoMais') && $w('#textNotificacaoMais')) {
            $w('#textNotificacaoMais').text = mensagem;
            $w('#boxNotificacaoMais').show("slide", {
                duration: 500,
                direction: "right"
            });

            setTimeout(() => {
                // Some de novo com slide para a esquerda
                $w('#boxNotificacaoMais').hide("slide", {
                duration: 500,
                direction: "right"
                });
            }, 3000);

        } else {
            console.warn("mostrarNotificacao: #boxNotificacaoMais ou #textNotificacaoMais não encontrados no masterPage.");
        }
    } catch (e) {
        console.error("mostrarNotificacao erro:", e);
    }
}
