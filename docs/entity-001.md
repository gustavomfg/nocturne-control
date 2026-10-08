# ENTITY 001

## Ideia

Uma consciência visual formada por estilhaços de metal frio. Não tem rosto nem corpo. Tem um olho: uma abertura na casca onde um núcleo âmbar fica visível. A abertura se volta para o visitante, como quem presta atenção.

O visitante não recebe instruções. Ele percebe a entidade pelo que ela faz: se aproxima quando o cursor fica perto e calmo, recua quando o cursor chega depressa, vira as costas quando se sente invadida e sonha quando ninguém está por perto.

## Estrutura visual

- **Casca**: cerca de 2 400 estilhaços octaédricos achatados, distribuídos em uma esfera de Fibonacci, com um raio que varia suavemente. Uma abertura, com raio angular de cerca de 26°, fica voltada para a câmera.
- **Núcleo**: esfera âmbar com gradiente, aura por bloom e um anel de íris na borda da abertura.
- **Poeira**: partículas em uma camada ao redor, com órbitas próprias calculadas na GPU.
- **Luz**: ambiente HDR procedural com softboxes frios (um painel à frente da câmera dá o brilho das faces). A luz âmbar não ilumina a casca, para não tingir o grafite.
- **Acabamento**: bloom, vinheta, grão de filme, separação cromática leve e uma ondulação que parte do ponto tocado.

## Estados (temperamento)

| Estado | Quando | O que se vê |
| --- | --- | --- |
| `sonhando` | Sem visitante por 7 s | Olhar vagueia devagar; núcleo baixo, frio |
| `observando` | Visitante presente, à distância | Olhar acompanha o cursor com metade da intensidade; núcleo âmbar |
| `curiosidade` | Cursor perto e calmo por 1,6 s | Entidade se aproxima, olhar acompanha por inteiro, núcleo mais quente |
| `recuo` | Cursor perto e rápido (acima de 1,5 unidades/s) | Flash claro, entidade recua e a casca reage com força |
| `indiferença` | 1,1 s após o recuo | Vira de costas por 5 s; núcleo frio e baixo; reage pouco ao cursor |

Os estados são lidos no canto inferior como `estado · observando`, em caixa baixa.

## Interações

- **Passar o cursor**: os estilhaços próximos são empurrados e voltam em tempos diferentes, pela própria rigidez de cada peça. O empurrão segue o cursor com um atraso curto, o que dá inércia.
- **Toque**: dispersa os estilhaços em volta do ponto e cria uma ondulação na imagem.
- **Duplo toque (ou o botão `metamorfose`)**: inicia a sequência cinematográfica.

## Sequência de metamorfose (≈ 8 s)

1. **Tensão (0–0,9 s)**: o núcleo se acende; a câmera recua e fecha a lente.
2. **Dispersão (0,8–2,0 s)**: a casca se desfaz para fora.
3. **Anéis (2,1–4,3 s)**: a matéria se reorganiza em três anéis orbitais; a câmera gira cerca de 145°.
4. **Pausa (4,3–5,4 s)**: os anéis permanecem, com a câmera girando.
5. **Retorno (5,4–7,4 s)**: a matéria volta à casca e a câmera volta à posição de repouso.

Com movimento reduzido, apenas a luz pulsa.

## Intro (≈ 7 s)

O núcleo acende primeiro. A casca se materializa de baixo para cima, com um atraso aleatório por peça. A câmera parte de longe e se aproxima com um movimento de desaceleração suave.

## Parâmetros

Os números estão em `src/experiments/entity-001/`:

- `config.ts`: raio, abertura, paleta, câmera e contagens por qualidade (2 400 peças em desktop, 1 100 em celular).
- `behavior.ts`: limiares de proximidade, velocidade, tempo de encantamento, recuo e sono.
- `choreography.ts`: as duas linhas do tempo do GSAP (intro e metamorfose).
- `shards.ts`: rigidez, amortecimento, alcance do empurrão e calor.

## Fora do escopo

- Modelos GLB/GLTF: a entidade é procedural. A base para carregar um modelo existe em `core/assets.ts`.
- Estado salvo entre visitas: a entidade começa sempre da mesma escuridão.
