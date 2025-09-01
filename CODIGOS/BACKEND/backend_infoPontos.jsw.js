// backend_infoPontos.jsw.js
import wixData from 'wix-data';

export async function getResumoPontos(userId, mesAno) {
  if (!userId) {
    throw new Error("getResumoPontos: userId é obrigatório");
  }

  const base = wixData.query("ProgressoUsuarios").eq("userId", userId);
  let item;

  // 1) Tenta pelo mês/ano informado, quando vier
  if (mesAno && mesAno !== "todos") {
    const res = await base.eq("mesAno", mesAno).limit(1).find();
    if (res.items.length) {
      item = res.items[0];
    }
  }

  // 2) Se não achou, pega o mais recente
  if (!item) {
    const resUlt = await base.descending("_createdDate").limit(1).find();
    item = resUlt.items[0];
  }

  return {
    mesAno: item?.mesAno || mesAno || "",
    pontosAtuais: item?.pontosAtuais || 0,
    totalCompras: item?.totalCompras || 0,
    pontosTotaisAcumulados: item?.pontosTotaisAcumulados || 0
  };
}