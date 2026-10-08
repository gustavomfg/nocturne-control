# OVRA

> **Status: laboratório pessoal em evolução.** OVRA é um espaço para experimentos independentes de creative development: arte generativa, animações cinematográficas, WebGL, Three.js e interações experimentais. Não é um site institucional, um portfólio nem um produto.

<p align="center">
  <a href="https://gustavomfg.github.io/ovra/">Experiência publicada</a>
  ·
  <a href="#executar-localmente">Executar localmente</a>
  ·
  <a href="DESIGN.md">Sistema visual</a>
  ·
  <a href="docs/entity-001.md">ENTITY 001</a>
</p>

<p align="center">
  <img alt="Three.js" src="https://img.shields.io/badge/Three.js-0.186-1f2937?logo=threedotjs&logoColor=white" />
  <img alt="React" src="https://img.shields.io/badge/React-19-20232a?logo=react&logoColor=61dafb" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-6-1f2937?logo=typescript&logoColor=3178c6" />
  <img alt="GSAP" src="https://img.shields.io/badge/GSAP-3-6b6b68" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-8-1f1b2d?logo=vite&logoColor=ffd166" />
</p>

<p align="center">
  <img src="images/ovra-entity-001.png" alt="ENTITY 001: uma casca de estilhaços metálicos em torno de um núcleo âmbar, com um anel orbital de luz" width="1440" />
</p>

## Experimentos

| Código | Nome | Ideia |
| --- | --- | --- |
| 001 | ENTITY 001 | Uma entidade digital feita de estilhaços. Ela surge da escuridão, observa o cursor com atraso e inércia, recua, se vira de costas e se transforma com um duplo toque. |

Cada experimento é uma pasta independente em `src/experiments/`. A lista fica em `src/experiments/registry.ts` e é carregada sob demanda: um experimento só é baixado quando aberto.

## Executar localmente

```bash
npm ci
npm run dev
```

O servidor de desenvolvimento usa o caminho de publicação do GitHub Pages:

```text
/ovra/
```

Para outro caminho de publicação, defina `VITE_BASE_PATH` antes de compilar.

## Scripts

```bash
npm run dev       # servidor de desenvolvimento
npm run lint      # ESLint
npm run test      # testes unitários e de componentes (Vitest)
npm run build     # verificação de tipos e build de produção
npm run test:pwa  # build e teste do PWA no Chromium (Playwright)
npm run preview   # serve o build de produção
```

## Arquitetura

```text
src/
  main.tsx                    inicialização e registro do service worker
  app/                        shell: cabeçalho discreto, roteamento por hash e cortina entre experimentos
  core/                       base reutilizável para qualquer experimento
    camera.ts                 câmera orbital com movimento amortecido e objetivos tweenáveis
    lighting.ts               ambiente HDR procedural (softboxes) para reflexos de metal
    postprocessing.ts         bloom, acabamento (vinheta, grão, lente, ondulação) em um passe
    frameLoop.ts              loop de quadros que pausa com a aba oculta ou fora da tela
    assets.ts                 carregamento de GLTF/GLB com cache e descarte de recursos
    audio.ts                  ambiência opcional em Web Audio, desligada por padrão
    spring.ts, math.ts, noise.ts, transitions.ts, capabilities.ts
  experiments/
    registry.ts               lista de experimentos (carregamento preguiçoso)
    entity-001/               ENTITY 001: cena, comportamento, coreografia, fallback 2D
public/                       manifesto, service worker, ícone e página 404 do GitHub Pages
tests/                        teste de offline do PWA e teste de navegador
docs/entity-001.md            direção artística e especificação de comportamento
```

### Como criar um experimento

1. Crie `src/experiments/<nome>/` com um componente padrão exportado (o componente é o ponto de entrada).
2. Use `core/` para câmera, luz, pós-processamento, loop e recursos. Mantenha a lógica do experimento dentro da pasta.
3. Registre em `src/experiments/registry.ts` com um `slug` (usado em `#/slug`), um `code` curto e o `lazy(() => import(...))`.
4. Escreva testes para a lógica pura (sem WebGL) e um teste de montagem com `getContext` simulado, como em `Entity001.test.tsx`.

### Modelos 3D

ENTITY 001 é procedural: não depende de arquivos binários. Para um experimento com modelo pronto, exporte um GLB/GLTF pelo Blender e carregue com `loadGltf` (`src/core/assets.ts`), que já faz cache e tenta de novo após uma falha. Descarte o objeto com `disposeObject` ao desmontar.

## Qualidade e acessibilidade

- **Movimento reduzido**: sem intro, sem deriva, sem o olhar seguindo o cursor, sem movimento de câmera e sem empurrões nos estilhaços. A reação ao toque continua apenas como brilho; a metamorfose vira um pulso de luz.
- **Sem WebGL2**: o mesmo experimento é desenhado em um canvas 2D com a mesma silhueta e os mesmos controles.
- **Recursos**: o loop para com a aba oculta ou fora da tela; geometrias, materiais, texturas e o contexto WebGL são liberados ao desmontar.
- **Áudio**: silencioso por padrão e só começa após ação explícita.
- **Teclado**: os controles são botões nativos; a metamorfose também está disponível pelo botão, além do duplo toque.
- **Publicação**: GitHub Pages em [`/ovra/`](https://gustavomfg.github.io/ovra/). `VITE_BASE_PATH` e `base` em `vite.config.ts` usam o caminho atual do repositório.

## Publicação

Pushes para `main` executam `.github/workflows/deploy.yml`: lint, testes, build, teste do PWA no Chromium e publicação de `dist/` no GitHub Pages.

## Licença e uso

Projeto pessoal de experimentação. Todo o código e as formas são originais. Mantenha os experimentos fiéis à ideia central: o visitante descobre o comportamento pela curiosidade, sem precisar ler explicações.
