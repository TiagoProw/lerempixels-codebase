// Backend/adminFidelidade.jsw
import wixData from 'wix-data';
import { atualizarPontos } from 'backend/pontoService.jsw';
import { checkAndGrantEbooksAccess } from "backend/grantEbooksAccess";

/* ---------- LISTAR MEMBROS ---------- */
export async function getDadosUsuariosFidelidade(mesAno) {
    const { items: progresso } = await wixData.query('ProgressoUsuarios')
        .limit(1000)
        .find();

    const { items: members } = await wixData.query('Members/PrivateMembersData')
        .limit(1000)
        .find();

    return members.map((member) => {
        const userId = member._id;
        let itemProgresso;

        if (mesAno === "todos") {
            const historico = progresso.filter(p => p.userId === userId);
            if (historico.length) {
                itemProgresso = historico.sort(
                    (a, b) => new Date(b.dataRegistro).getTime() - new Date(a.dataRegistro).getTime()
                )[0];
            }
        } else {
            itemProgresso = progresso.find(p => p.userId === userId && p.mesAno === mesAno);
        }

        const nome = `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Sem nome';
        const email = member.email || 'Sem e-mail';
        const foto = member.picture || 'https://static.wixstatic.com/media/ba53bb_e27872e2c3b2401b872cd1ee7e38a0de~mv2.png';

        return {
            _id: userId,
            userId,
            mesAno: mesAno === "todos" ? "" : (itemProgresso?.mesAno || mesAno),
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