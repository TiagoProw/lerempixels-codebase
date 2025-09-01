// Backend/adminFidelidade.jsw
import wixData from 'wix-data';
import { atualizarPontos } from 'backend/pontoService.jsw';
import { checkAndGrantEbooksAccess } from "backend/grantEbooksAccess";

/* ---------- LISTAR MEMBROS ---------- */
export async function getDadosUsuariosFidelidade(mesAno) {
    const [progRes, memRes] = await Promise.all([
        wixData.query('ProgressoUsuarios').limit(1000).find(),
        wixData.query('Members/PrivateMembersData').limit(1000).find()
    ]);

    const progresso = progRes.items;
    const members = memRes.items;

    return members.map((member) => {
        const userId = member._id;
        const historico = progresso.filter(p => p.userId === userId);

        let itemProgresso = null;

        if (mesAno === "todos") {
            if (historico.length) {
                itemProgresso = historico.sort(
                    (a, b) => new Date(b._createdDate).getTime() - new Date(a._createdDate).getTime()
                )[0];
            }
        } else {
            itemProgresso = historico.find(p => p.mesAno === mesAno);
            if (!itemProgresso && historico.length) {
                // Fallback: pega o mais recente do usuário
                itemProgresso = historico.sort(
                    (a, b) => new Date(b._createdDate).getTime() - new Date(a._createdDate).getTime()
                )[0];
            }
        }

        const nome = `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Sem nome';
        const email = member.loginEmail || member.email || 'Sem e-mail';
        const foto = (member.photo && member.photo.url) || member.picture || null;

        return {
            _id: userId,
            userId,
            mesAno: mesAno === "todos" ? (itemProgresso?.mesAno || "") : (itemProgresso?.mesAno || mesAno),
            nome,
            email,
            foto,
            comprasMes: itemProgresso?.totalCompras || 0,
            pontosMes: itemProgresso?.pontosAtuais || 0,
            pontosTotaisAcumulados: itemProgresso?.pontosTotaisAcumulados || 0
        };
    });
}

/* ---------- AJUSTE MANUAL ---------- */
export async function addPontoManual(userId, mesAno, quantidade) {
    const resultado = await atualizarPontos(userId, quantidade, `Ajuste manual (${mesAno})`, true);
    await checkAndGrantEbooksAccess(userId);
    return { pontosGanhos: quantidade, ...resultado };
}

export async function removePontoManual(userId, mesAno, quantidade) {
    const resultado = await atualizarPontos(userId, -Math.abs(quantidade), `Remoção manual (${mesAno})`, false);
    return { pontosGanhos: 0, ...resultado };
}

/* ---------- RECOMPENSAS ---------- */
export async function listarRecompensas() {
    const { items } = await wixData.query("RecompensasDisponiveis")
        .limit(1000)
        .find();
    return items;
}

export async function salvarRecompensa(dados) {
    if (dados._id) {
        return wixData.update("RecompensasDisponiveis", dados);
    } else {
        return wixData.insert("RecompensasDisponiveis", dados);
    }
}

export async function excluirRecompensa(id) {
    return wixData.remove("RecompensasDisponiveis", id);
}