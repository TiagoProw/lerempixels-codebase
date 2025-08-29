// backend/testSimulacao.jsw
import wixData from 'wix-data';
import { wixStores_onOrderPaid, wixStores_onOrderPaid_money } from 'backend/events';

export async function simulaCompraPaga(orderId) {
  const result = await wixData.query('Stores/Orders')
    .eq('_id', orderId)
    .find({ suppressAuth: true });

  if (!result.items.length) {
    throw new Error(`Pedido ${orderId} não encontrado.`);
  }

  const order = result.items[0];
  // Simula o evento como se fosse pago
  await wixStores_onOrderPaid({ buyerInfo: order.buyerInfo });
  return `Simulação feita para orderId: ${orderId}`;
}

/**
 * Simula uma compra paga para testes
 * @param {string} userId - ID do membro
 * @param {number} valor - Valor do pedido em R$
 */
export async function simularCompra(userId, valor) {
  const fakeEvent = {
    buyerInfo: { memberId: userId },
    totals: { total: valor }
  };

  return await wixStores_onOrderPaid_money(fakeEvent);
}