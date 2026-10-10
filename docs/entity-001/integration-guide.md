# ENTITY 001 — AWAKENING · Guia de integração (Three.js)

Este guia é o contrato entre os recursos do Blender e a experiência web. A integração está em `src/experiments/entity-001/character.ts` (carregamento, escolha de clipes, olhar, pálpebras e emissão) e é ligada em `scene.ts`. A abertura espera o GLB antes de começar. Se o carregamento falhar ou exceder seis segundos do relógio visível, a entidade procedural assume o plano sem troca tardia de modelo; o canvas expõe `data-character` = `loading`, `ready` ou `procedural`.

## Arquivos

| Arquivo | Uso |
| --- | --- |
| `public/3d/entity-001/entity-cinematic.glb` | Desktop / GPUs fortes |
| `public/3d/entity-001/entity-optimized.glb` | Celulares e GPUs intermediárias; mesma hierarquia, nomes e clipes |
| `assets/source/entity-001/entity-001.blend` | Fonte em qualidade cinematic, com os clipes em faixas NLA (as luzes de preview são criadas pelo script de render, não ficam salvas) |
| `assets/source/entity-001/textures/brushed_normal_{512,256}.png` | Normal map gerado; já embutido nos GLB |
| `tools/blender/entity-001/*.py` | Pipeline reprodutível (ver "Regenerar") |
| `docs/entity-001/previews/` | Renders de referência |

Os GLB são autossuficientes: textura embutida, **sem Draco nem meshopt** (o `GLTFLoader` padrão basta) e sem dependências externas.

## Orçamento medido

| | Cinematic | Optimized | Teto definido |
| --- | --- | --- | --- |
| Arquivo | 4,75 MB | 1,37 MB | 7 MB / 2,5 MB |
| Triângulos | 158 824 | 34 628 | 260 k / 80 k |
| Primitivas (draw calls máximas) | 67 | 67 | 90 |
| Draw calls medidas no Three.js 0.186 | 56–59 | 57 | — |
| Materiais | 9 | 9 | — |
| Texturas | 1 × 512² PNG | 1 × 256² PNG | — |
| Animação | 0,88 MB (30 fps) | 0,44 MB (15 fps amostrados) | — |

A versão optimized reduz a densidade das placas, os chanfros (3 → 1 segmento), a resolução das primitivas redondas e a taxa de amostragem das animações. A silhueta, os nomes e os clipes são idênticos.

## Escala, origem e eixos

- 1 unidade = 1 metro. Busto de ~1,2 m, do peito (y ≈ 0,87) ao topo do halo (y ≈ 2,1).
- `ENTITY_ROOT` fica na origem; os pés estão abaixo do enquadramento. O centro do crânio está em **(0, 1,70, 0)**; a pupila, em z ≈ +0,19.
- O personagem olha para **+Z** (em direção a uma câmera padrão do Three.js), com +Y para cima. A cena web usa um raio de ~2,1 unidades: a integração atual escala `ENTITY_ROOT` em 9,5× e transladá-lo em −1,70 × escala no Y centraliza a cabeça na origem.

## Hierarquia

```text
ENTITY_ROOT                      livre para o código (escala, posição, virar o corpo)
└─ CTRL_BODY                     respiração, recuo, inclinação do corpo
   ├─ CTRL_FLOAT → FRAG_01..04   fragmentos soltos
   └─ CTRL_TORSO                 peito
      ├─ CTRL_CORE → GYRO_A, GYRO_B, geo_core
      ├─ CTRL_HALO → HALO_SHARD_01..07
      ├─ CTRL_SHOULDER_L|R → PLATE_PAULDRON_*, PLATE_LAME_*
      ├─ PLATE_STERNUM_L|R, PLATE_FLANK_L|R, PLATE_YOKE_L|R, PLATE_BACK
      └─ CTRL_NECK_01 → CTRL_NECK_02 → CTRL_NECK_03
         └─ CTRL_LOOK            ★ mira da cabeça em tempo real (nenhum clipe anima)
            └─ CTRL_HEAD         gestos autorais da cabeça
               └─ CTRL_SKULL     pivô no eixo de dobradiça (centro do crânio)
                  ├─ PLATE_BROW, PLATE_MUZZLE, PLATE_CREST_A|B, PLATE_CROWN_A|B_L|R,
                  │  PLATE_TEMPLE_L|R, PLATE_OCCIPUT_L|R, PLATE_REAR_FRAME_L|R,
                  │  PLATE_NAPE, PLATE_JAW (→ geo_jaw_vents)
                  ├─ LID_UPPER, LID_LOWER
                  ├─ geo_hubs, geo_inner_skull
                  └─ CTRL_GAZE           ★ mira do olho em tempo real (nenhum clipe anima)
                     └─ CTRL_EYE         sacadas autorais, geo_eye
                        └─ CTRL_IRIS     rotação no eixo da lente = foco
                           └─ CTRL_PUPIL escala = dilatação (geo_pupil)
```

Nós `geo_*` são geometria estática presa ao pai. Cada nó traz `userData.ovra_role`: `root`, `control`, `runtime`, `plate`, `lid`, `jaw`, `mechanism`, `float` ou `static`.

## Pontos de controle em tempo real

| Nó | Canal | Faixa útil | Efeito |
| --- | --- | --- | --- |
| `CTRL_LOOK` | `rotation.y` / `.x` / `.z` | ±0,6 / ±0,35 / ±0,3 rad | Vira, inclina e rola a cabeça sobre qualquer clipe |
| `CTRL_GAZE` | `rotation.y` / `.x` | ±0,45 / ±0,12 rad | Desliza o olho na fenda (além disso, a lente some atrás da máscara) |
| `ENTITY_ROOT` | qualquer | — | Posição e escala na cena; virar o corpo inteiro |
| `LID_UPPER` / `LID_LOWER` | `rotation.x` | repouso −0,17 / +0,17 → fechado 0 | Piscar, estreitar o olhar |
| `CTRL_PUPIL` | `scale.x`, `scale.y` | 0,1–1,5 | Dilatação (o eixo Z é o da lente) |
| `CTRL_IRIS` | `rotation.z` (eixo da lente) | livre | Ajuste de foco |
| `PLATE_*` | posição e rotação | ver "Abertura procedural" | Expansão e contração |

`CTRL_LOOK`, `CTRL_GAZE` e `ENTITY_ROOT` não são animados por nenhum clipe, então podem ser escritos a qualquer momento. Os demais nós são animados por clipes: para mexer neles por código, aplique o deslocamento **depois** de `mixer.update()` em cada quadro.

## Abertura procedural (expansão / contração)

Cada placa traz em `userData` sua pose aberta no espaço do Three.js, relativa ao repouso:

```json
{ "ovra_open_position": [0, 0.0117, 0.0276], "ovra_open_rotation": [-0.38, 0, 0], "ovra_open_rotation_order": "YXZ" }
```

`amount` = 1 abre como no pico da TRANSFORM, 0 é repouso e valores negativos contraem (−0,2 ≈ o aperto do RECOIL). As placas de repouso têm rotação zero.

```js
const rest = new Map();
gltf.scene.traverse((node) => {
  if (node.userData.ovra_open_position) rest.set(node, node.position.clone());
});

function setOpening(amount) {
  for (const [plate, base] of rest) {
    const [x, y, z] = plate.userData.ovra_open_position;
    const [rx, ry, rz] = plate.userData.ovra_open_rotation;
    plate.position.set(base.x + x * amount, base.y + y * amount, base.z + z * amount);
    plate.rotation.set(rx * amount, ry * amount, rz * amount, plate.userData.ovra_open_rotation_order);
  }
}
```

Combinar com as partículas: as placas abrem ao longo da normal do crânio, então emitir partículas de `plate.getWorldPosition()` na direção `ovra_open_position` mantém a matéria procedural coerente com o modelo.

## Política de movimento na web

A geometria e os cinco clipes exportados permanecem preservados. O runtime usa somente `AWAKEN` e `IDLE`. `OBSERVE`, `RECOIL` e `TRANSFORM` estão disponíveis no arquivo para estudo, mas não são disparados pelas mudanças de estado.

O idle não reinicia durante a ressonância. A passagem de abertura para idle usa mistura suave de 1,2 s. Pálpebras, olho, íris, pupila, mandíbula e giroscópios têm canais próprios, filtrados dos clipes usados na web para evitar controles concorrentes.

A ressonância web dura 8,8 s: abre as placas até 14% da pose registrada em `ovra_open_*`, modula luz e câmera e volta ao repouso. Não há emissão de enxame de fragmentos nem uso da `TRANSFORM` na sequência atual.

A camada de integração também limita emissão por material e clona materiais e geometrias por montagem. As texturas continuam compartilhadas pelo cache; `Character.dispose()` libera somente os recursos daquela instância. O GLB não é modificado.

## Carregar, animar e mirar

O exemplo abaixo demonstra os clipes disponíveis no asset em uma cena isolada. A experiência OVRA aplica a política acima pelo wrapper `Character`.

```js
import { AnimationClip, AnimationMixer, LoopOnce } from "three";
import { loadGltf, disposeObject } from "../../core/assets";

const url = `${import.meta.env.BASE_URL}3d/entity-001/entity-${compact ? "optimized" : "cinematic"}.glb`;
const gltf = await loadGltf(url);
const entity = gltf.scene;
scene.add(entity);

const look = entity.getObjectByName("CTRL_LOOK");
const gaze = entity.getObjectByName("CTRL_GAZE");
const mixer = new AnimationMixer(entity);
const clip = (name) => mixer.clipAction(AnimationClip.findByName(gltf.animations, name));

const idle = clip("IDLE").play();
const awaken = clip("AWAKEN");
awaken.setLoop(LoopOnce, 1);
awaken.clampWhenFinished = true;

// A cada quadro:
mixer.update(dt);
look.rotation.set(pitch, yaw, roll);     // mira suave calculada pela percepção web
gaze.rotation.set(0, eyeYaw, 0);

// Reações:
clip("OBSERVE").reset().setLoop(LoopOnce, 1).crossFadeFrom(idle, 0.4, false).play();
```

**Sincronia original do clipe exportado**: crie a `TRANSFORM` como ação pausada e acompanhe a linha do tempo GSAP com `action.time = timeline.time()`. Na versão original, as marcas eram idênticas (1,2 / 3,8 / 7,0 / 8,4 / 12,6 s). O mesmo vale para `AWAKEN` × abertura de 11,8 s.

**Descarte em uma cena isolada com recursos próprios**: `mixer.stopAllAction(); mixer.uncacheRoot(entity); disposeObject(entity);`. Na integração OVRA, use `Character.dispose()`; não descarte a cena armazenada pelo cache.

## Materiais e emissão

- Use `scene.environment` (o ambiente de softboxes do `core/lighting.ts`). O metal depende de reflexos.
- Para modular a intensidade dos emissivos (olho que acende, núcleo pulsando), localize os materiais pelo nome e ajuste `emissiveIntensity`:
  `M_SensorGlow` (pupila), `M_CoreEmber` (anel da pupila, núcleo do peito e brilho do crânio, compartilhado) e `M_FrostSignal` (anéis dos cubos).
  Clone o material antes, se a pupila e o núcleo precisarem variar separadamente.
- O glTF usa `KHR_materials_clearcoat`, `KHR_materials_emissive_strength` e `KHR_materials_specular`, todos suportados pelo `GLTFLoader`.
- Não há anisotropia: o Three.js deriva a direção dela das UVs, e as primitivas mecânicas não têm UVs (o metal estourava em branco no teste).

## Validação feita

- `validate_glb.py`: contrato de nós, clipes, materiais, orçamento e garantia de que `CTRL_LOOK`, `CTRL_GAZE` e `ENTITY_ROOT` não são animados. Os dois arquivos passam.
- Carregamento real no **Three.js 0.186.1** (`GLTFLoader` + `AnimationMixer`) em Chromium headless: as duas qualidades carregaram sem erros nem avisos no console, com os cinco clipes nas durações corretas e `userData` presente. IDLE, TRANSFORM aos 5 s e OBSERVE com `CTRL_LOOK` girado renderizaram corretamente com duas luzes direcionais, sem pós-processamento.

## Regenerar

```bash
# Constrói as duas qualidades, anima, salva o .blend e exporta os GLB (~10 s)
blender -b --factory-startup --python tools/blender/entity-001/export_web.py
python3 tools/blender/entity-001/validate_glb.py public/3d/entity-001/*.glb

# Previews (Eevee, sem pós)
blender -b assets/source/entity-001/entity-001.blend --python tools/blender/entity-001/render_previews.py -- hero front profile rear eye bust
blender -b assets/source/entity-001/entity-001.blend --python tools/blender/entity-001/render_previews.py -- --clip TRANSFORM hero 0 2 5 12.6
```

Feito com Blender 5.2.2. O aviso `MeshOptimizer is not available` na exportação é inofensivo: a compressão meshopt não é usada.

## Limitações e próximos refinamentos

1. **Tronco**: ombreiras e peito ainda são volumes simples. É o próximo passe de modelagem, se a câmera web abrir o plano.
2. **Rig por hierarquia de nós, sem skinning**: o personagem é rígido e mecânico, então não há deformação. Se surgirem cabos ou tendões entre cabeça e peito, eles vão precisar de bones com skinning.
3. **Emissão não animada no arquivo**: a intensidade dos emissivos é controlada pelo código (o `GLTFLoader` não lê `KHR_animation_pointer`). Os clipes animam pupila e pálpebras por transformação.
4. **Sem texturas de cor ou rugosidade**: a superfície usa só o normal map de micro-detalhe. Um passe de bake (desgaste nas bordas, variação de rugosidade) daria mais realismo de perto.
5. **OBSERVE e RECOIL têm direção fixa**: a inclinação e o desvio são autorais. A direção relativa ao visitante vem de `CTRL_LOOK`.
6. **Validação visual em navegador** foi feita com renderização por software (SwiftShader); o desempenho em GPU real não foi medido.
