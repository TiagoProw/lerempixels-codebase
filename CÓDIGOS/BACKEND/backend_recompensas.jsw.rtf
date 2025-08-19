// backend/recompensas.jsw
import wixData from 'wix-data';
import { currentMember } from 'wix-members-backend';

const TAXA_CONVERSAO = 20;
const LIMITE_POR_VALOR = 10;
const MAX_QUERY_LIMIT = 1000;

// ---------------------------------------------------
// CUPONS POR PONTOS (inalterado)
// ---------------------------------------------------
async function getCurrentUserId() {
  const member = await currentMember.getMember();
  if (!member || !member._id) throw new Error('Usuário não autenticado.');
  return member._id;
}

export async function obterQuantidadesDeCuponsDisponiveis() {
  const userId = await getCurrentUserId();
  const usadosRes = await wixData.query('UsoDePontos')
    .eq('userId', userId)
    .limit(MAX_QUERY_LIMIT)
    .find();

  const contagem = {};
  for (let i = 1; i <= 10; i++) contagem[i] = LIMITE_POR_VALOR;

  usadosRes.items.forEach(item => {
    const v = Number(item.valorDescontado);
    if (!isNaN(v) && contagem[v] !== undefined) contagem[v] = Math.max(0, contagem[v] - 1);
  });

  return contagem;
}

export async function resgatarCupom(valorReais) {
  if (typeof valorReais !== 'number' || !Number.isInteger(valorReais) || valorReais < 1 || valorReais > 10) {
    throw new Error('Valor inválido.');
  }

  const userId = await getCurrentUserId();

  const hoje = new Date();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const ano = hoje.getFullYear();
  const mesAno = `${mes}/${ano}`;

  const progressoRes = await wixData.query('ProgressoUsuarios')
    .eq("userId", userId)
    .eq('mesAno', mesAno)
    .limit(1)
    .find();

  if (progressoRes.items.length === 0) {
    throw new Error('Registro de pontos não encontrado.');
  }

  const progressoDoc = progressoRes.items[0];
  const pontosAtuais = Number(progressoDoc.pontosAtuais) || 0;
  const pontosNecessarios = valorReais * TAXA_CONVERSAO;

  if (pontosAtuais < pontosNecessarios) {
    throw new Error('Você não tem pontos suficientes.');
  }

  const novoPontos = pontosAtuais - pontosNecessarios;

  if (novoPontos < 0) {
    throw new Error('Saldo de pontos insuficiente.');
  }

  const usadosCount = await wixData.query('UsoDePontos')
    .eq('userId', userId)
    .eq('valorDescontado', valorReais)
    .count();

  if (usadosCount >= LIMITE_POR_VALOR) throw new Error(`Você já resgatou ${LIMITE_POR_VALOR} cupons de R$${valorReais}.`);

  const cuponsRes = await wixData.query('Import946')
    .eq('valorReais', valorReais)
    .limit(MAX_QUERY_LIMIT)
    .find();

  if (!cuponsRes.items || cuponsRes.items.length === 0) throw new Error('Não há cupons disponíveis para esse valor.');

  const cupomSelecionado = cuponsRes.items[Math.floor(Math.random() * cuponsRes.items.length)];

  const uso = {
    userId,
    pontosUsados: pontosNecessarios,
    valorDescontado: valorReais,
    codigoCupom: cupomSelecionado.codigo || '',
    dataUso: new Date(),
    pedidoId: '',
    dataResgate: new Date()
  };

  await wixData.insert('UsoDePontos', uso);

  progressoDoc.pontosAtuais = novoPontos;
  await wixData.update('ProgressoUsuarios', progressoDoc);

  return {
    codigo: cupomSelecionado.codigo,
    valorReais: valorReais
  }
}

export async function testarLeituraImport946() {
  const resultado = await wixData.query('Import946').limit(10).find();
  return resultado.items;
}
