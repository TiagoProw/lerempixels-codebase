// frontend/TestePúblico
import { simulaCompraPaga } from 'backend/testSimulacao.jsw';
import { simularCompra } from 'backend/testSimulacao';

// ---------------------------------------------------
// SIMULA UMA COMPRA
// ---------------------------------------------------
$w.onReady(function () {
  $w('#botaoSimular').onClick(() => {
    simulaCompraPaga("17040e12-a4c0-462e-b9ac-9437317a8ea1")
      .then(msg => console.log("✅", msg))
      .catch(err => console.error("❌", err));
  });
  

  // ---------------------------------------------------
  // A CADA R$1 = 1 PIXEL POINT
  // ---------------------------------------------------

  $w('#btnSimularCompra').onClick(async () => {
    try {
      const userId = $w('#inputUserId').value;
      const valor = Number($w('#inputValor').value);

      if (!userId || !valor) {
        $w('#txtResultado').text = "Preencha UserId e Valor.";
        return;
      }

      await simularCompra(userId, valor);
      $w('#txtResultado').text = `Simulação concluída!✔️ (+${valor} pontos)`;
    } catch (err) {
      console.error(err);
      $w('#txtResultado').text = "Erro na simulação❌. Veja console.";
    }
  });
});
