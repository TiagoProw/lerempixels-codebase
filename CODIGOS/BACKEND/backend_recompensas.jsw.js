// backend/recompensas.jsw
import wixData from 'wix-data';
import { currentMember } from 'wix-members-backend';
import { atualizarPontos } from 'backend/pontoService.jsw';

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

export async function resgatarCupom(valorReais) {
    // Validação de valor
    if (
        typeof valorReais !== 'number' ||
        !Number.isInteger(valorReais) ||
        valorReais < 1 ||
        valorReais > 10
    ) {
        throw new Error('Valor inválido.');
    }

    const userId = await getCurrentUserId();

    // Checa saldo mensal
    const hoje = new Date();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const ano = hoje.getFullYear();
    const mesAno = `${mes}/${ano}`;
    const progRes = await wixData
        .query('ProgressoUsuarios')
        .eq('userId', userId)
        .eq('mesAno', mesAno)
        .limit(1)
        .find();

    if (!progRes.items.length) {
        throw new Error('Registro de pontos não encontrado.');
    }

    const progressoDoc = progRes.items[0];
    const pontosAtuais = Number(progressoDoc.pontosAtuais) || 0;
    const pontosNecessarios = valorReais * TAXA_CONVERSAO;

    if (pontosAtuais < pontosNecessarios) {
        throw new Error('Você não tem pontos suficientes.');
    }

    // Limite de resgates do mesmo valor
    const usadosCount = await wixData
        .query('UsoDePontos')
        .eq('userId', userId)
        .eq('valorDescontado', valorReais)
        .count();

    if (usadosCount >= LIMITE_POR_VALOR) {
        throw new Error(`Você já resgatou ${LIMITE_POR_VALOR} cupons de R$${valorReais}.`);
    }

    // Seleciona cupom disponível
    const cuponsRes = await wixData
        .query('Import946')
        .eq('valorReais', valorReais)
        .limit(MAX_QUERY_LIMIT)
        .find();

    if (!cuponsRes.items.length) {
        throw new Error('Não há cupons disponíveis para esse valor.');
    }

    const cupomSelecionado = cuponsRes.items[
        Math.floor(Math.random() * cuponsRes.items.length)
    ];

    // Atualiza saldo e registra no uso de pontos
    await atualizarPontos()
    await wixData.insert("UsoDePontos", {
      userId,
      valorDescontado: valorReais,
      pontosUsados: pontosNecessarios,
      codigoCupom: cupomSelecionado.codigo,
      dataResgate: new Date()
  });

    return {
        codigo: cupomSelecionado.codigo,
        valorReais: valorReais
    };
}