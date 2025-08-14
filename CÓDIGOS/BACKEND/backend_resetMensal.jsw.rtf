// backend/resetMensal.jsw
import wixData from 'wix-data';

export async function resetProgressoMensal() {
    try {
        // Pega o mês e ano atuais
        const hoje = new Date();
        const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0');
        const anoAtual = hoje.getFullYear();
        const mesAnoAtual = `${mesAtual}/${anoAtual}`;

        let itensParaAtualizar = [];
        let resultados = await wixData.query("ProgressoUsuarios").limit(1000).find();

        while (resultados.items.length > 0) {
            resultados.items.forEach(item => {
                item.totalCompras = 0;
                item.bonusConcedido = false;
                item.mesAno = mesAnoAtual;
                itensParaAtualizar.push(item);
            });

            // Atualiza em lote
            await Promise.all(itensParaAtualizar.map(i => wixData.update("ProgressoUsuarios", i)));
            itensParaAtualizar = [];

            if (resultados.hasNext()) {
                resultados = await resultados.next();
            } else {
                break;
            }
        }

        console.log("✅ Reset mensal concluído com sucesso!");
        return { sucesso: true };
    } catch (err) {
        console.error("❌ Erro ao fazer reset mensal:", err);
        return { sucesso: false, erro: err };
    }
}
