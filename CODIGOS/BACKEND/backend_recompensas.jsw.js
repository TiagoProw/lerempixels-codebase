// backend/recompensas.jsw
//Frontend-Minhas Recompensas
import wixUsers from 'wix-users';
import wixData from 'wix-data';
import wixLocation from 'wix-location';
import wixWindow from 'wix-window';
import { obterQuantidadesDeCuponsDisponiveis, resgatarCupom } from 'backend/recompensas';

let pontosUsuario = 0;
let totalComprasUsuario = 0;
let pontosTotaisAcumulados = 0;

$w.onReady(async function () {
    const user = wixUsers.currentUser;

    if (!user.loggedIn) {
        console.log("Usuário não está logado.");
        // Opcional: redirecionar ou mostrar mensagem
        return;
    }

    console.log("Usuário logado, ID:", user.id);

    // Atualiza os pontos e total de compras do usuário
    async function atualizarPontosUsuario() {
        const userId = user.id;
        const hoje = new Date();
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        const ano = hoje.getFullYear();
        const mesAnoAtual = `${mes}/${ano}`;

        const { items: progresso } = await wixData.query("ProgressoUsuarios")
            .eq("userId", userId)
            .eq("mesAno", mesAnoAtual)
            .limit(1)
            .find();

        if (progresso.length > 0) {
            pontosUsuario = progresso[0].pontosAtuais || 0;
            totalComprasUsuario = progresso[0].totalCompras || 0;
            pontosTotaisAcumulados = progresso[0].pontosTotaisAcumulados || 0;
        } else {
            pontosUsuario = 0;
            totalComprasUsuario = 0;
            pontosTotaisAcumulados = 0;
        }

        console.log("Pontos do usuário atualizados:", pontosUsuario, "Total compras:", totalComprasUsuario);

        $w('#textPontosUsuario').text = `${pontosUsuario}`;
    }

    // Atualiza o repeater de cupons disponíveis para resgate
    async function atualizarRepeaterCupons() {
        const contagem = await obterQuantidadesDeCuponsDisponiveis();

        const opcoes = Array.from({ length: 10 }, (_, i) => {
            const valor = i + 1;
            return {
                _id: `cupom-${valor}`,
                valorReais: valor,
                pontosNecessarios: valor * 20,
                resgatesDisponiveis: contagem[valor] || 0
            };
        });

        $w('#repeaterCupom').data = opcoes;
    }

    // Carrega o repeater de recompensas baseado nos pontos do usuário
    async function carregarRecompensas() {
        const { items: recompensas } = await wixData.query("RecompensasDisponiveis")
            .eq("ativo", true)
            .find();

        $w("#repeaterRecompensas").data = recompensas;

        $w("#repeaterRecompensas").onItemReady(($item, itemData) => {
            const pontosNecessarios = itemData.pontosNecessarios || 0;
            const tipoResgate = itemData.tipoResgate || "cupom";
            const titulo = itemData.userId || "Sem título";
            const descricao = itemData.descricao || "Sem descrição";

            $item('#textTitulo').text = titulo;
            $item('#textDescricao').text = descricao;
            $item('#textCupom').collapse();
            $item('#btnObterCupom').hide();
            $item('#barraProgresso').hide();

            if (tipoResgate === "cupom") {
                $item('#textPontosNecessarios').text = `${pontosNecessarios} Pixel Points`;
                const podeResgatar = pontosUsuario >= pontosNecessarios;

                $item('#btnObterCupom').label = podeResgatar ? "Obter Cupom" : "Pontos Insuficientes";
                podeResgatar ? $item('#btnObterCupom').enable() : $item('#btnObterCupom').disable();
                $item('#btnObterCupom').show();

                $item('#btnObterCupom').onClick(() => {
                    if (podeResgatar) {
                        $item('#textCupom').text = itemData.codigoDesconto || "Cupom não disponível";
                        $item('#textCupom').expand();
                        $item('#btnObterCupom').label = "Cupom Exibido";
                        $item('#btnObterCupom').disable();
                    }
                });
            } else if (tipoResgate === "progresso") {
                if (titulo.toLowerCase().includes("compra")) {
                    const comprasNecessarias = 2;
                    const progresso = Math.min(totalComprasUsuario / comprasNecessarias, 1);

                    $item('#textPontosNecessarios').text = `${totalComprasUsuario} de ${comprasNecessarias} compras` + (progresso >= 1 ? " ✔️" : "");
                    $item('#barraProgresso').value = progresso * 100;
                    $item('#barraProgresso').show();

                } else if ((itemData.pontosTotais || 0) > 0) {
                    //usa pontosTotaisAcumulados com o requisito 'pontosTotais' da recompensa
                    const requisito = Number(itemData.pontosTotais) || 0;
                    const atingido = Math.min(pontosTotaisAcumulados, requisito);
                    const progresso = Math.min(pontosTotaisAcumulados / requisito, 1);

                    $item('#textPontosNecessarios').text = `${atingido} de ${requisito} Pixel Points` + (pontosTotaisAcumulados >= requisito ? " ✔️" : "");
                    $item('#barraProgresso').value = progresso * 100;
                    $item('#barraProgresso').show();

                } else if (pontosNecessarios > 0) {
                    // fallback: usa saldo atual (pontosAtuais)
                    const pontosMostrados = Math.min(pontosUsuario, pontosNecessarios);
                    $item('#textPontosNecessarios').text = `${pontosMostrados} de ${pontosNecessarios} Pixel Points` + (pontosUsuario >= pontosNecessarios ? " ✔️" : "");
                    $item('#barraProgresso').value = (pontosMostrados / pontosNecessarios) * 100;
                    $item('#barraProgresso').show();

                } else {
                    $item('#textPontosNecessarios').text = `Concluído ✔️`;
                }
            } else if (tipoResgate === "externo" && itemData.codigoDesconto) {
                $item('#textPontosNecessarios').text = `Clique para acessar`;
                $item('#btnObterCupom').label = "Acessar";
                $item('#btnObterCupom').enable();
                $item('#btnObterCupom').onClick(() => {
                    wixLocation.to(itemData.codigoDesconto);
                });
                $item('#btnObterCupom').show();
            }
        });
    }

    // Função para carregar os cupons usados pelo usuário
    async function carregarCuponsUsuario() {
        const userId = user.id;

        const { items } = await wixData.query("UsoDePontos")
            .eq("userId", userId)
            .descending("_createdDate")
            .find();

        if (!items.length) {
            $w('#meusCuponsContainer').collapse();
            $w('#textSemCupons').text = "Você não tem cupons";
            $w('#textSemCupons').expand();
            return;
        }

        $w('#textSemCupons').collapse();
        $w('#meusCuponsContainer').expand();
        $w('#repeaterMeusCupons').data = items;

        $w('#repeaterMeusCupons').onItemReady(($item, itemData) => {
            $item('#textValorCupomUsado').text = `R$${itemData.valorDescontado}`;
            $item('#textCodigoCupomUsado').text = itemData.codigoCupom;

            $item('#btnCopiarCupom').onClick(() => {
                wixWindow.copyToClipboard(itemData.codigoCupom)
                    .then(() => {
                        $item('#btnCopiarCupom').label = "Copiado!";
                        $item('#btnCopiarCupom').style.color = "green"; // altera a cor para verde
                        setTimeout(() => {
                            $item('#btnCopiarCupom').label = "Copiar";
                            $item('#btnCopiarCupom').style.color = ""; // reseta a cor para padrão
                        }, 1500);
                    });
            });
        });
    }

    // Função para atualizar tudo que depende de pontos
    async function atualizarTudo() {
        await atualizarPontosUsuario();
        await carregarRecompensas();
        await atualizarRepeaterCupons();
    }

    // Inicialização principal
    await atualizarTudo();
    await carregarCuponsUsuario();

    // Evento botão para abrir a aba dos cupons para resgatar
    $w('#btnCriarCupom').onClick(async () => {
        $w('#abaRepeaterCupom').expand();
        await atualizarRepeaterCupons();

        $w('#repeaterCupom').onItemReady(($item, itemData) => {
            const { valorReais, pontosNecessarios, resgatesDisponiveis } = itemData;

            $item('#textValorCupom').text = `R$${valorReais}`;
            $item('#textValorPontos').text = `${pontosNecessarios} Pixel Points`;
            $item('#textRestamCupom').text = `${resgatesDisponiveis}/10 resgates`;

            const podeResgatar = pontosUsuario >= pontosNecessarios && resgatesDisponiveis > 0;

            $item('#btnResgatarCupom').label = podeResgatar ? "Resgatar" : "Indisponível";
            podeResgatar ? $item('#btnResgatarCupom').enable() : $item('#btnResgatarCupom').disable();

            $item('#btnResgatarCupom').onClick(async () => {
                $item('#btnResgatarCupom').label = "Processando...";
                $item('#btnResgatarCupom').disable();

                try {
                    const resultado = await resgatarCupom(valorReais);

                    // Atualiza os pontos do usuário
                    await atualizarPontosUsuario();
                    

                    // Atualiza cupons disponíveis do repeater
                    const contagemAtualizada = await obterQuantidadesDeCuponsDisponiveis();
                    $item('#textRestamCupom').text = `${contagemAtualizada[valorReais]}/10 resgates`;

                    // Atualiza cupons do usuário
                    await carregarCuponsUsuario();

                    $item('#btnResgatarCupom').label = `Resgatado!`;
                } catch (erro) {
                    console.error("Erro ao resgatar cupom:", erro);
                    $item('#btnResgatarCupom').label = "Erro ao resgatar";
                    setTimeout(() => {
                        $item('#btnResgatarCupom').label = "Tentar novamente";
                        $item('#btnResgatarCupom').enable();
                    }, 3000);
                }
            });

            console.log("Repetidor carregando cupom:", {
                valorReais,
                pontosNecessarios,
                resgatesDisponiveis,
                pontosUsuario
            });
        });
    });

    // Evento para fechar aba de cupons
    $w('#btnFecharCaixaCupom').onClick(() => {
        $w('#abaRepeaterCupom').collapse();
    });
    $w('#btnFecharCaixaCupom2').onClick((event) => {
        $w('#abaRepeaterCupom').collapse();
    })
});