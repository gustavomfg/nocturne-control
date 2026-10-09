# ENTITY 001 — AWAKENING

## Ideia

Uma presença de metal frio desperta no vazio, reconhece o visitante e guarda uma memória breve de seus gestos. É uma performance audiovisual em código: anatomia, luz, câmera e comportamento conduzem a experiência. A interface mostra apenas o nome, o estado e dois controles; a descoberta acontece pelo movimento e pelo tempo de permanência.

A obra está em [`/ovra/#/entity-001`](https://gustavomfg.github.io/ovra/#/entity-001). A abertura revela a entidade em 11,8 s. Depois, aproximar-se com calma desperta curiosidade; aproximações rápidas e toques acumulam tensão. Uma ressonância de 12,6 s abre a máscara em órbitas, aproxima a câmera do núcleo e devolve uma anatomia alterada.

## Anatomia e luz

- **Máscara**: casca alongada com coroa, têmporas e mandíbula afunilada. A distribuição parte de uma amostragem de Fibonacci deformada; cada placa acompanha a normal e um fluxo tangencial da superfície. A abertura frontal é amendoada.
- **Matéria**: octaedros achatados em pequenas placas facetadas, com variação de tamanho e tom. No WebGL, cada peça tem rigidez, amortecimento e rotação próprios; os deslocamentos voltam em ritmos diferentes.
- **Olho**: núcleo comprimido, íris com fibras procedurais, pupila escura e arcos sólidos que ancoram a abertura. A atenção altera a abertura, o olhar e a passagem entre âmbar e frio.
- **Luz**: ambiente HDR procedural com softboxes, luz principal e recorte frio. O grafite mantém sua massa; o calor se concentra no olho e nas reações locais. A atmosfera é discreta, com poeira e faixas de luz durante a ressonância.
- **Acabamento**: bloom contido, vinheta, grão, separação cromática leve e ondulação no ponto de toque do renderizador WebGL.

Os perfis iniciais usam 1 800 placas e 980 partículas de poeira em telas largas; até 700 px, 820 placas e 430 partículas. O modo 2D usa 560 facetas, ou 320 no perfil compacto. A densidade é escolhida ao criar a cena; a resolução renderizada também se adapta à duração medida dos quadros.

## Temperamento

O comportamento tem sete estados. Eles conduzem pose, abertura do olho, respiração, luz, reação dos fragmentos e enquadramento no WebGL. O modo 2D compartilha os estados e a percepção, com uma interpretação visual mais simples.

| Leitura na tela | Estado interno | Quando acontece | Resposta visual |
| --- | --- | --- | --- |
| `sonhando` | `dreaming` | Sem presença por 9 s, quando não está em uma resposta defensiva | Olho quase fechado, luz baixa, olhar que vagueia, respiração lenta e câmera mais afastada. |
| `observando` | `observing` | Presença sem uma aproximação calma prolongada nem uma invasão | Atenção parcial, abertura intermediária, luz âmbar e pose estável. |
| `curiosa` | `curious` | Presença próxima e calma por 2,3 s | Inclina-se para perto, abre o olho, acompanha com mais atenção e aproxima o enquadramento. |
| `recuando` | `wary` | Aproximação rápida ou toque, com pouca tensão acumulada | Recua, estreita o olho, esfria a luz e espalha a matéria com um tremor breve. |
| `alerta` | `alert` | A memória de tensão ultrapassa 1,45 | Atenção mais intensa, respiração acelerada, luz fria e fragmentos mais reativos. |
| `perturbada` | `disturbed` | A tensão ultrapassa 2,6 | Recuo maior, olho estreito, tremor mais forte e câmera mais distante. |
| `indiferente` | `ignoring` | Após a resposta de recuo, alerta ou perturbação | Vira de costas, reduz luz e abertura e responde pouco à presença. |

A tensão cresce com invasões e decai com o tempo; não desaparece na troca de estado. A curiosidade exige proximidade e velocidade abaixo de 0,65 unidade da cena por segundo; uma aproximação próxima acima de 6 unidades por segundo é considerada rápida. A proximidade é calculada em relação à silhueta.

Sem escalar para alerta, o recuo permanece por 1,35 s antes da indiferença. O alerta espera pelo menos 2,2 s e a aproximação deixar de ser rápida; pode escalar para perturbação. A perturbação dura 2,8 s. A indiferença dura 4,8 s após recuo, 3,36 s após alerta ou 6,6 s após perturbação. Esses intervalos evitam mudanças repetidas em um único gesto.

O olhar usa amostras atrasadas em 0,22 s na curiosidade e 0,34 s nos demais estados. Uma previsão curta e limitada acompanha a direção do movimento; mudanças de estado introduzem hesitação. Há pequenos movimentos autônomos e piscadas suaves em um ciclo de 8,7 s. A entidade acompanha o visitante com inércia.

## Gestos e controles

| Ação | Resultado |
| --- | --- |
| Mover perto da entidade | Alimenta atenção e tensão conforme velocidade e permanência. No WebGL, empurra e gira as placas próximas com atraso. |
| Tocar ou clicar | No WebGL, provoca um impulso local, ondulação e breve contato que alimenta a tensão. No modo 2D, alimenta o mesmo temperamento. |
| Segurar perto da entidade por 1,25 s | Carrega e inicia a ressonância, após a abertura. Soltar, sair da cena ou cancelar o gesto encerra a carga. |
| Duplo toque ou duplo clique | Inicia a mesma ressonância. Os dois contatos precisam ocorrer próximos, dentro de 380 ms. |
| Botão `metamorfose` | Inicia a ressonância por um controle nativo, também acessível pelo teclado. Fica desativado durante a abertura e a própria sequência. |
| Botão `som` | Liga ou desliga a ambiência procedural. A experiência começa silenciosa. |

Após 18 s sem atividade, surge a dica discreta `Segure para despertar`. Ela desaparece com a interação ou durante a sequência.

Os botões têm foco visível. O som expõe seu estado por `aria-pressed`; mudanças de estado da obra são anunciadas em `aria-live="polite"`. O canvas tem uma descrição acessível. As mesmas ações estão disponíveis nos renderizadores WebGL e 2D.

## Abertura — 11,8 s

| Passagem | Intervalo | Composição |
| --- | --- | --- |
| Contorno — `trace` | 0–3,4 s | Recorte frio e atmosfera insinuam a máscara. A matéria e o núcleo começam a aparecer; uma faixa de luz percorre a casca. |
| Matéria — `material` | 3,4–8 s | As placas ganham presença e luz principal. A abertura começa a se revelar enquanto a câmera se aproxima e muda suavemente de posição. |
| Reconhecimento — `recognition` | 8–11,8 s | O olho abre, o núcleo ganha intensidade e a câmera encontra o enquadramento de repouso. A entidade passa a responder ao visitante. |

As passagens se sobrepõem: os tempos definem a direção da composição, e cada placa tem seu limiar de materialização. Câmera e luz avançam na mesma performance.

## Ressonância — 12,6 s

| Passagem | Intervalo | Composição |
| --- | --- | --- |
| Tensão — `anticipation` | 0–1,2 s | A matéria contrai, o olho estreita e a câmera recua. A luz prepara a ruptura. |
| Dispersão e órbitas — `rupture` | 1,2–4,8 s | A casca se abre; a partir de 2 s, as placas começam a ocupar três faixas orbitais orientadas. |
| Limiar — `threshold` | 3,8–7 s | A câmera se aproxima do núcleo, abre a lente e atravessa o enquadramento das faixas. |
| Interior — `inside` | 7–8,4 s | Uma pausa próxima ao núcleo dá tempo para a alteração da entidade. |
| Retorno — `return` | 8,4–12,6 s | Câmera e matéria retornam. No WebGL, a máscara fica mais estreita e alta, com placas ajustadas e sinais residuais de órbita e calor. |

A dispersão, a organização das faixas e a aproximação se sobrepõem. O retorno preserva a evolução durante a visita. Quando o som está ligado, a energia da cena conduz a ambiência e sinais sonoros acompanham a ruptura e o retorno.

## Movimento reduzido

Com `prefers-reduced-motion`, a entidade começa assentada: sem abertura espacial, deriva, perseguição do cursor, respiração, tremor, câmera móvel ou impulsos nas placas. O temperamento ainda pode alterar a luz e a leitura de estado. No WebGL, tocar produz apenas um brilho breve; a ação `metamorfose` vira um pulso suave de luz de 2,2 s.

A preferência é observada durante a visita. Ativá-la interrompe uma abertura ou ressonância em andamento, elimina o deslocamento residual das placas e assenta a câmera. Desativá-la permite movimento nas interações seguintes, sem reiniciar a abertura.

## Tempo, render e recursos

- **Relógio da cena**: o loop separa o passo físico, limitado a 0,05 s, do tempo de cada quadro visível, limitado a 0,25 s. Molas e placas usam o passo físico; temperamento, percepção e performance usam o tempo visível. Isso evita que uma GPU lenta alongue a narrativa na mesma proporção que a física.
- **Sequências**: as linhas do tempo GSAP ficam pausadas e só avançam pelo relógio da cena. São descartadas ao terminar, ao assentar a entidade ou ao desmontar.
- **Visibilidade**: render e narrativa param com a aba oculta, fora da tela ou com a área da cena zerada. A retomada não incorpora o tempo passado fora da experiência. Uma carga por gesto também é solta ao ocultar a aba.
- **Qualidade**: o WebGL limita a resolução inicial por densidade de pixels e área renderizada. Quadros lentos detectados podem reduzir progressivamente a resolução. O enquadramento se adapta à proporção da tela.
- **Modo essencial**: ausência de WebGL2, falha na criação da cena ou perda de contexto levam ao canvas 2D. Ele desenha uma máscara de facetas orientadas, com olho, temperamento, percepção, abertura, ressonância e os mesmos controles; a iluminação e a dinâmica espacial são simplificadas.
- **Descarte**: desmontar cancela loop e linhas do tempo, remove listeners e observadores e libera geometrias, materiais, pós-processamento, texturas, alvo de render do ambiente e contexto WebGL. A ambiência também é encerrada.

## Organização

Os arquivos do experimento ficam em `src/experiments/entity-001/`:

| Arquivo | Responsabilidade |
| --- | --- |
| `Entity001.tsx` / `entity-001.css` | Montagem, gestos, controles, dica, acessibilidade, visibilidade e composição mínima da interface. |
| `config.ts` | Anatomia, paleta local, câmeras iniciais, carga por gesto e perfis de qualidade. |
| `geometry.ts` / `shards.ts` | Formações da máscara e das três faixas; orientação, molas, calor, materialização e evolução das placas. |
| `kernel.ts` | Íris procedural, pupila, arcos e abertura do olho. |
| `behavior.ts` / `perception.ts` | Temperamento, memória de tensão, intenções, olhar atrasado, antecipação, hesitação e piscadas. |
| `choreography.ts` / `performance.ts` | Linhas do tempo, fases, carga, avanço pelo relógio da cena e interrupção por movimento reduzido. |
| `scene.ts` / `atmosphere.ts` / `dust.ts` | Cena WebGL, luz, câmera, atmosfera, poeira, pós-processamento, qualidade e recursos. |
| `EntityFallback.tsx` | Interpretação em canvas 2D com comportamento e performance compartilhados. |

`src/core/` mantém câmera, ambiente HDR, pós-processamento, relógio, áudio, capacidades e carregamento de recursos reutilizáveis. O registro usa o slug `entity-001`; o caminho de publicação permanece `/ovra/`.

## Limites atuais

A anatomia é procedural e não depende de um modelo binário. A base para carregar GLB/GLTF continua em `src/core/assets.ts`, disponível para futuras entidades. A evolução não é salva entre visitas: remontar a cena inicia uma nova performance.
