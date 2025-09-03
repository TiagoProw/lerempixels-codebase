// backend_pontoService.jsw.js

import wixData from 'wix-data';

/**
 * Obtém ou cria um registro de progresso mensal para o usuário.
 * @param {string} userId
 * @param {string} mesAno — formato "YYYY-MM"
 * @returns {Promise<Object>}
 */
export async function obterOuCriarProgresso(userId, mesAno) {
  const queryResult = await wixData
    .query('ProgressoUsuarios')
    .eq('userId', userId)
    .eq('mesAno', mesAno)
    .find();

  if (queryResult.items.length) {
    return queryResult.items[0];
  }

  const novoRegistro = {
    userId,
    mesAno,
    pontosAtuais: 0
  };

  return wixData.insert('ProgressoUsuarios', novoRegistro);
}

/**
 * Atualiza o saldo de pontos do usuário para o mês específico.
 * Faz validação de saldo e lança erro se insuficiente.
 * @param {string} userId
 * @param {number} pontos — positivo (crédito) ou negativo (débito)
 * @param {string} mesAno — formato "YYYY-MM"
 * @returns {Promise<Object>}
 */
export async function atualizarPontos(userId, pontos, mesAno) {
  if (!Number.isInteger(pontos) || pontos === 0) {
    throw new Error('Quantidade de pontos deve ser um inteiro diferente de zero.');
  }

  const registro = await obterOuCriarProgresso(userId, mesAno);
  const novoSaldo = registro.pontosAtuais + pontos;

  if (novoSaldo < 0) {
    throw new Error('Saldo de pontos insuficiente para essa operação.');
  }

  registro.pontosAtuais = novoSaldo;
  return wixData.update('ProgressoUsuarios', registro);
}

/**
 * Retorna o resumo de pontos do usuário em todos os meses.
 * @param {string} userId
 * @returns {Promise<{ total: number, detalhes: Object[] }>}
 */
export async function obterResumoPontos(userId) {
  const result = await wixData
    .query('ProgressoUsuarios')
    .eq('userId', userId)
    .find();

  const total = result.items.reduce((acc, rec) => acc + rec.pontosAtuais, 0);

  return {
    total,
    detalhes: result.items
  };
}

/**
 * Registra o uso de pontos convertendo em desconto e já debita do saldo.
 * @param {Object} params
 * @param {string} params.userId
 * @param {number} params.pontos — pontos a debitar (inteiro positivo)
 * @param {number} params.valorDescontado — valor em reais
 * @param {string} [params.codigoCupom]
 * @param {string} [params.pedidoId]
 * @returns {Promise<Object>}
 */
export async function registrarUsoDePontos({
  userId,
  pontos,
  valorDescontado,
  codigoCupom = '',
  pedidoId = ''
}) {
  if (!Number.isInteger(pontos) || pontos <= 0) {
    throw new Error('Pontos para uso devem ser um inteiro positivo.');
  }

  // Mês corrente para débito
  const agora = new Date();
  const mesAno = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;

  // Debita do saldo
  await atualizarPontos(userId, -pontos, mesAno);

  // Insere registro de uso
  const uso = {
    userId,
    pontosUsados: pontos,
    valorDescontado,
    codigoCupom,
    pedidoId,
    dataUso: new Date()
  };

  return wixData.insert('UsoDePontos', uso);
}