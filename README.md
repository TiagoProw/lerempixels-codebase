📌 Resumo Geral do Projeto – Pixel Points

👉 Site: https://lerempixels.com.br/

👉 Repositório: https://github.com/TiagoProw/lerempixels-codebase

📖 O que já foi feito recentemente
🔹 Refatorações e Correções

Backend recompensas.jsw:

Contagem correta de cupons disponíveis (coleção Import946).

Paginação implementada (antes só retornava 50 registros).

Cada usuário tem seus próprios cupons (não mais globais).

Desconto de pontos corrigido para subtrair apenas o valor do cupom resgatado.

Frontend "Minhas Recompensas":

Exibição dos pontos do usuário e progresso.

Repeater #repeaterCupom com opções de cupons R$1–R$10 (cada até 10 usos).

Botão #btnCriarCupom para carregar cupons disponíveis.

Exibição de “Restam X resgates” corrigida.

Repeater #repeaterMeusCupons mostrando cupons do usuário + botão de copiar.

AdminFidelidade (visor administrativo):

Backend adminFidelidade.jsw: listar membros, atualizar pontos, resetar progresso.

Frontend: interface de controle com inputs, botões e tabelas para ajustes manuais.

📌 Onde os pontos são atualizados

Administração (manual)

Arquivo: backend/adminFidelidade.jsw

Funções: addPontoManual, removePontoManual

Atualiza: pontosAtuais (saldo do mês) e pontosTotaisAcumulados (histórico).

Resgate de cupons (automático)

Arquivo: backend/recompensas.jsw → função resgatarCupom(valorReais)

Atualiza apenas pontosAtuais.

Comprador frequente (automático)

Arquivo: backend/events.js → função wixStores_onOrderPaid(event)

Se fizer 2 compras no mês: +25 pontos em pontosAtuais e pontosTotaisAcumulados.

Meta 200 pontos acumulados

Base: pontosTotaisAcumulados.

Libera acesso automático à página de e-books grátis.

✅ Recompensas já implementadas

Resgate de cupons (R$1–R$10, até 10 usos cada).

Comprador frequente (+25 pontos no mês ao atingir 2 compras).

Meta de 200 pontos acumulados → acesso a e-books grátis.

📦 Coleções envolvidas

Import946 (CuponsDisponiveis) → cupons fixos (sem userId).

UsoDePontos → registros de resgates.

ProgressoUsuarios → saldo e progresso do usuário.

⚙️ Problemas corrigidos

Contagem errada de cupons.

Zerar pontos indevidamente.

Cupom sumindo globalmente ao ser resgatado.

Limitação de 50 registros do Wix Data.
