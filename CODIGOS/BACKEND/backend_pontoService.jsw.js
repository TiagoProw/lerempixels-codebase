//backend- pontoService.jsw
import wixData from 'wix-data';
import { currentUser } from 'wix-users-backend';

/**
 * Atualiza pontos de um usuário de forma centralizada
 * @param {string} userId - ID do usuário
 * @param {number} quantidade - Pontos a adicionar/remover (negativo para remover)
 * @param {string} descricao - Motivo da alteração
 * @param {boolean} afetaAcumulado - Se true, também altera pontosTotaisAcumulados
 * @returns {Promise<object>} - Novo saldo do usuário
 */
export async function atualizarPontos(userId, quantidade, descricao, afetaAcumulado = true) {
    if (!userId) throw new Error("userId é obrigatório");

    // Busca registro do usuário na coleção ProgressoUsuarios
    let [registro] = await wixData.query("ProgressoUsuarios")
        .eq("userId", userId)
        .limit(1)
        .find()
        .then(res => res.items);

    if (!registro) {
        // Se não existir, cria um novo
        registro = {
            userId,
            pontosAtuais: 0,
            pontosTotaisAcumulados: 0
        };
    }

    // Atualiza pontos atuais
    registro.pontosAtuais = (registro.pontosAtuais || 0) + quantidade;

    // Atualiza acumulado apenas se for ganho
    if (quantidade > 0) {
        registro.pontosTotaisAcumulados = (registro.pontosTotaisAcumulados || 0) + quantidade;
    }

    // Garante que não fique negativo
    if (registro.pontosAtuais < 0) registro.pontosAtuais = 0;

    // Salva no banco
    await wixData.save("ProgressoUsuarios", registro);

    // Registra no histórico (passo 2 já embutido)
    await wixData.insert("UsoDePontos", {
        userId,
        data: new Date(),
        tipo: quantidade >= 0 ? "Crédito" : "Débito",
        pontos: quantidade,
        descricao
    });

    return {
        pontosAtuais: registro.pontosAtuais,
        pontosTotaisAcumulados: registro.pontosTotaisAcumulados
    };
}