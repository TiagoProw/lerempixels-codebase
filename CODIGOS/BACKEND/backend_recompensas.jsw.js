// backend/recompensas.jsw
import wixData from 'wix-data';
import { currentMember } from 'wix-members-backend';

const TAXA_CONVERSAO = 20;
const LIMITE_POR_VALOR = 10;
const MAX_QUERY_LIMIT = 1000;

async function getCurrentUserId() {
    const member = await currentMember.getMember();
    if (!member?._id) {
        throw new Error('Usuário não autenticado.');
    }
    return member._id;
}

/**
 * Garante que exista um registro de ProgressoUsuarios para o mês atual.
 * Se não houver, clona o mais recente ou cria um zerado.
 */
async function ensureProgressDoc(userId) {
    const hoje = new Date();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const ano = hoje.getFullYear();
    const mesAno = `${mes}/${ano}`;

    // 1) tenta achar o registro do mês atual
    const atualRes = await wixData.query('ProgressoUsuarios')
        .eq('userId', userId)
        .eq('mesAno', mesAno)
        .limit(1)
        .find();

    if (atualRes.items.length > 0) {
        return atualRes.items[0];
    }

    // 2) tenta clonar o documento mais recente
    const ultimoRes = await wixData.query('ProgressoUsuarios')
        .eq('userId', userId)
        .descending('_createdDate')
        .limit(1)
        .find();

    if (ultimoRes.items.length > 0) {
        const u = ultimoRes.items[0];
        const clone = {
            userId,
            mesAno,
            pontosAtuais: Number(u.pontosAtuais) || 0,
            pontosTotaisAcumulados: Number(u.pontosTotaisAcumulados) || 0,
            totalCompras: Number(u.totalCompras) || 0
        };
        return await wixData.insert('ProgressoUsuarios', clone);
    }

    // 3) nenhum histórico: novo registro zerado
    const inicial = {
        userId,
        mesAno,
        pontosAtuais: 0,
        pontosTotaisAcumulados: 0,
        totalCompras: 0
    };
    return await wixData.insert('ProgressoUsuarios', inicial);
}

export async function obterQuantidadesDeCuponsDisponiveis() {
    const userId = await getCurrentUserId();
    const usadosRes = await wixData.query('UsoDePontos')
        .eq('userId', userId)
        .limit(MAX_QUERY_LIMIT)
        .find();

    const contagem = {};
    for (let i = 1; i <= 10; i++) {
        contagem[i] = LIMITE_POR_VALOR;
    }

    usadosRes.items.forEach(item => {
        const v = Number(item.valorDescontado);
        if (!isNaN(v) && contagem[v] !== undefined) {
            contagem[v] = Math.max(0, contagem[v] - 1);
        }
    });

    return contagem;
}

export async function resgatarCupom(valorReais) {
    // 1) validação do parâmetro
    if (
        typeof valorReais !== 'number' ||
        !Number.isInteger(valorReais) ||
        valorReais < 1 ||
        valorReais > 10
    ) {
        throw new Error('Valor inválido.');
    }

    const userId = await getCurrentUserId();

    // 2) garante documento de progresso para o mês atual
    const progressoDoc = await ensureProgressDoc(userId);
    const pontosAtuais = Number(progressoDoc.pontosAtuais) || 0;
    const pontosNecessarios = valorReais * TAXA_CONVERSAO;

    if (pontosAtuais < pontosNecessarios) {
        throw new Error('Você não tem pontos suficientes.');
    }

    // 3) verifica limite de resgates desse valor
    const usadosCount = await wixData.query('UsoDePontos')
        .eq('userId', userId)
        .eq('valorDescontado', valorReais)
        .count();

    if (usadosCount >= LIMITE_POR_VALOR) {
        throw new Error(`Você já resgatou ${LIMITE_POR_VALOR} cupons de R$${valorReais}.`);
    }

    // 4) busca um cupom disponível
    const cuponsRes = await wixData.query('Import946')
        .eq('valorReais', valorReais)
        .limit(MAX_QUERY_LIMIT)
        .find();

    if (cuponsRes.items.length === 0) {
        throw new Error('Não há cupons disponíveis para esse valor.');
    }

    const cupomSelecionado = cuponsRes.items[
        Math.floor(Math.random() * cuponsRes.items.length)
    ];

    // 5) debita pontos e persiste no progresso
    progressoDoc.pontosAtuais = pontosAtuais - pontosNecessarios;
    await wixData.update('ProgressoUsuarios', progressoDoc);

    // 6) registra uso de pontos na coleção UsoDePontos
    await wixData.insert('UsoDePontos', {
        userId,
        pontosUsados: pontosNecessarios,
        valorDescontado: valorReais,
        codigoCupom: cupomSelecionado.codigo || '',
        dataUso: new Date(),
        pedidoId: ''
    });

    return {
        codigo: cupomSelecionado.codigo,
        valorReais
    };
}