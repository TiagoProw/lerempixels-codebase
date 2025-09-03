// backend_recompensas.jsw.js

import wixData from 'wix-data';
import { registrarUsoDePontos } from 'backend/pontoService';

/**
 * Retorna todos os cupons com quantidade > 0.
 * @returns {Promise<Object[]>}
 */
export async function obterQuantidadesDeCuponsDisponiveis() {
  const result = await wixData
    .query('CuponsDisponiveis')
    .gt('quantidade', 0)
    .find();

  return result.items;
}

/**
 * Valida se o usuário tem saldo suficiente para o valor em reais.
 * @param {string} userId
 * @param {number} valorReais
 * @returns {Promise<number>} — pontos necessários
 */
async function validarResgateCupom(userId, valorReais) {
  const progresso = await wixData
    .query('ProgressoUsuarios')
    .eq('userId', userId)
    .find();

  const saldoTotal = progresso.items.reduce((soma, rec) => soma + rec.pontosAtuais, 0);
  const pontosNecessarios = Math.ceil(valorReais);

  if (saldoTotal < pontosNecessarios) {
    throw new Error('Saldo de pontos insuficiente para resgate.');
  }

  return pontosNecessarios;
}

/**
 * Seleciona o cupom mais adequado com base no valor mínimo.
 * @param {number} valorReais
 * @returns {Promise<Object>} — cupom disponível
 */
async function selecionarCupomDisponivel(valorReais) {
  const result = await wixData
    .query('CuponsDisponiveis')
    .le('valorMinimo', valorReais)
    .gt('quantidade', 0)
    .ascending('valorDesconto')
    .find();

  if (!result.items.length) {
    throw new Error('Nenhum cupom disponível para esse valor de compra.');
  }

  return result.items[0];
}

/**
 * Atualiza o cupom selecionado e registra o uso de pontos.
 * @param {string} userId
 * @param {Object} cupom
 * @param {number} pontosNecessarios
 * @param {string} pedidoId
 * @returns {Promise<Object>}
 */
async function registrarResgateCupom(userId, cupom, pontosNecessarios, pedidoId) {
  // Decrementa quantidade do cupom
  cupom.quantidade -= 1;
  await wixData.update('CuponsDisponiveis', cupom);

  // Registra uso de pontos e desconto
  return registrarUsoDePontos({
    userId,
    pontos: pontosNecessarios,
    valorDescontado: cupom.valorDesconto,
    codigoCupom: cupom.codigo,
    pedidoId
  });
}

/**
 * Fluxo único para resgatar cupom:
 * 1. Valida saldo
 * 2. Seleciona cupom
 * 3. Atualiza cupom e registra uso de pontos
 * @param {string} userId
 * @param {number} valorReais
 * @param {string} pedidoId
 * @returns {Promise<Object>}
 */
export async function resgatarCupom(userId, valorReais, pedidoId) {
  const pontosNecessarios = await validarResgateCupom(userId, valorReais);
  const cupom = await selecionarCupomDisponivel(valorReais);
  return registrarResgateCupom(userId, cupom, pontosNecessarios, pedidoId);
}