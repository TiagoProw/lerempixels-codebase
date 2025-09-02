// backend/pontoService.jsw
import wixData from 'wix-data';
import { currentUser } from 'wix-users-backend';
import {valorReais, pontosNecessarios, cupomSelecionado, } from 'backend/recompensas';

/**
 * Atualiza pontos do usuário e registra histórico em UsoDePontos.
 *
 * @param {string}  userId         ID do usuário
 * @param {number}  quantidade     Pontos a adicionar/remover
 * @param {object}  extras         Campos extras para o registro em UsoDePontos
 * @returns {Promise<object>}      Novos saldos (atual e total acumulado)
 */
export async function atualizarPontos(
    userId,
    quantidade,
    extras = {}
) {
    if (!userId) {
        throw new Error("userId é obrigatório");
    }

    // 1. Recupera ou cria registro em ProgressoUsuarios
    let [registro] = await wixData.query("ProgressoUsuarios")
        .eq("userId", userId)
        .limit(1)
        .find()
        .then(res => res.items);

    if (!registro) {
        registro = {
            userId,
            pontosAtuais: 0,
            pontosTotaisAcumulados: 0,
            mesAno: null
        };
    }

    // 2. Atualiza saldo
    registro.pontosAtuais = (registro.pontosAtuais || 0) + quantidade;
    if (quantidade > 0) {
        registro.pontosTotaisAcumulados = (registro.pontosTotaisAcumulados || 0) + quantidade;
    }
    if (registro.pontosAtuais < 0) {
        registro.pontosAtuais = 0;
    }

    // 3. Persiste ProgressoUsuarios
    await wixData.save("ProgressoUsuarios", registro);

    // 4. Insere histórico em UsoDePontos
    await wixData.insert("UsoDePontos", {
      userId,
      valorDescontado: valorReais,
      pontosUsados: pontosNecessarios,
      codigoCupom: cupomSelecionado.codigo,
      dataResgate: new Date()
  });

    return {
        codigo: cupomSelecionado.codigo,
        valorReais: valorReais
    };
}