// backend/events.js
import { atualizarPontos } from 'backend/pontoService';
import { checkAndGrantEbooksAccess } from "backend/grantEbooksAccess";

/**
 * Evento disparado quando um pedido é pago
 */
export async function wixStores_onOrderPaid(event) {
    try {
        const userId = event.buyerInfo?.id || event.buyerInfo?.memberId;
        if (!userId) return;

        const hoje = new Date();
        const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0');
        const anoAtual = hoje.getFullYear();
        const mesAnoAtual = `${mesAtual}/${anoAtual}`;

        // Exemplo: bônus por segunda compra no mês
        // (essa lógica pode ser adaptada para chamar atualizarPontos também)
        const pontosCompra = Math.floor(event.totals.total); // 1 ponto por R$1
        await atualizarPontos(userId, pontosCompra, "compra", `Compra #${event._id}`);

        await checkAndGrantEbooksAccess(userId);
    } catch (err) {
        console.error("Erro no processamento de pontos na compra:", err);
    }
}

/**
 * Evento disparado quando um membro é criado
 */
export async function wixMembers_onMemberCreated(event) {
    try {
        const memberId = event?.entity?._id || event?.member?._id;
        if (!memberId) return;

        await atualizarPontos(memberId, 50, "cadastro", "Bônus de cadastro");
    } catch (err) {
        console.error("Erro no bônus de cadastro:", err);
    }
}