// backend/pontoService.jsw
import wixData from 'wix-data';

/**
 * Atualiza pontos do usuário e registra histórico em UsoDePontos.
 * @param {string} userId
 * @param {number} quantidade   // (+ créditos, – débitos)
 * @param {object} extras       // { valorDescontado, codigoCupom, pedidoId }
 */
export async function atualizarPontos(
    userId,
    quantidade,
    extras = {}) 
    {
    if (!userId) {
        throw new Error("userId é obrigatório");
    }

    // 1) Busca ou cria registro em ProgressoUsuarios
    const queryRes = await wixData
        .query("ProgressoUsuarios")
        .eq("userId", userId)
        .limit(1)
        .find();

    let registro = queryRes.items[0] || {
        userId,
        pontosAtuais: 0,
        pontosTotaisAcumulados: 0,
        mesAno: null,
    };

    // 2) Atualiza saldo
    registro.pontosAtuais =
        (registro.pontosAtuais || 0) + quantidade;

    // sempre acumula total quando for crédito
    if (quantidade > 0) {
        registro.pontosTotaisAcumulados =
            (registro.pontosTotaisAcumulados || 0) + quantidade;
    }

    if (registro.pontosAtuais < 0) {
        registro.pontosAtuais = 0;
    }

    // 3) Persiste ProgressoUsuarios
    await wixData.save("ProgressoUsuarios", registro);

    // 4) Registra uso na coleção UsoDePontos, usando só os campos existentes
    await wixData.insert("UsoDePontos", {
        userId,
        pontosUsados: quantidade >= 0 ? quantidade : Math.abs(quantidade),
        valorDescontado: extras.valorDescontado || 0,
        codigoCupom: extras.codigoCupom || "",
        dataUso: new Date(),
        pedidoId: extras.pedidoId || ""
    });

    return {
        pontosAtuais: registro.pontosAtuais,
        pontosTotaisAcumulados: registro.pontosTotaisAcumulados,
    };
}