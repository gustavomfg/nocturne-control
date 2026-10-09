---
name: OVRA
product: OVRA — laboratório de experimentos
description: Uma interface quase invisível. A obra é a única protagonista.
colors:
  void: "#030304"
  ink: "#ece8e1"
  muted: "#8d8a85"
  line: "#ece8e125"
  ember: "#ffa155"
  frost: "#a8c8ff"
  ivory: "#fff1dc"
  graphite: "#525764"
typography:
  wordmark:
    fontFamily: '"Inter Tight", sans-serif'
    fontWeight: 500
    letterSpacing: 0.42em
  label:
    fontFamily: '"IBM Plex Mono", monospace'
    fontWeight: 400
    letterSpacing: 0.12em
---

# Direção

OVRA é um laboratório, não uma vitrine. A tela é quase toda obra: escuridão, luz e matéria. A interface se resume a três elementos discretos: a marca no canto superior esquerdo, o índice dos experimentos no canto superior direito e uma leitura de estado no inferior. Os textos são em português.

## Cor

- **Vazio** (`void`): o fundo de todas as cenas. Quase preto, com um toque frio.
- **Tinta** (`ink`) e **silenciosa** (`muted`): textos de interface. Sempre sobre o vazio.
- **Âmbar** (`ember`): a única cor quente. Reservada ao núcleo, à íris e ao destaque de estado. Não tinge superfícies.
- **Gelo** (`frost`): o contraponto frio, usado quando a entidade se afasta ou fica indiferente.
- **Grafite** (`graphite`): a matéria em repouso. Metal frio, sem brilho próprio.

Regra: calor só onde há contato. Qualquer tinta quente espalhada pela superfície vira neblina marrom sobre o metal escuro, o que foi o principal erro estético da fase de ajuste.

## Tipografia

- **Inter Tight** (300 a 500) para a marca.
- **IBM Plex Mono** para o índice, o estado e os controles. Caixa baixa, espaçamento amplo, tamanho pequeno.

Texto nunca compete com a obra. Quando aparece, é uma leitura do que a obra está fazendo.

## Composição

- O experimento ocupa a tela inteira. A interface é só a marca no topo, o índice à direita e a leitura de estado embaixo.
- Os controles ficam nos cantos inferiores e somam no máximo duas palavras cada.
- Em celulares, a obra é enquadrada pela largura: a câmera recua para que a silhueta não seja cortada.

Em ENTITY 001 — AWAKENING, a massa é uma máscara alongada de grafite: coroa, têmporas e mandíbula afunilada, com placas orientadas pela superfície. A abertura amendoada sustenta uma íris âmbar e uma pupila escura; o recorte de luz fria revela o metal sem dissolver sua massa no vazio.

## Movimento

- Em ENTITY 001 — AWAKENING, a abertura dura 11,8 s: contorno, matéria e reconhecimento. A ressonância dura 12,6 s, passando por tensão, dispersão, faixas orbitais, aproximação do núcleo e retorno alterado. Câmera e luz sustentam juntas esse ritmo.
- Nada muda de forma abrupta sem intenção artística. A luz é o primeiro sinal, a forma vem depois.
- O temperamento de AWAKENING aparece na pose, na abertura do olho, na respiração, na luz, nos fragmentos e no enquadramento. O olhar tem memória curta, antecipação limitada, hesitação e piscadas suaves.
- Com movimento reduzido: sem intro, sem deriva, sem movimento em resposta ao cursor e sem movimento de câmera. Ativar a preferência interrompe a sequência espacial e assenta a entidade. Ao toque, a matéria só acende. A metamorfose vira um pulso suave de luz.

## Acessibilidade

- Foco visível em todos os controles (contorno de 1 px, deslocado).
- Botões com área mínima de 44 px e estado de pressionado (`aria-pressed`).
- O estado da obra é anunciado em região `aria-live="polite"`.
- A alternativa sem WebGL2 mantém a mesma silhueta, a mesma cor e os mesmos controles.
