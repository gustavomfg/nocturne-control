---
name: Nocturne
product: Nocturne Control Center
description: Premium dark product interface shared across the Nocturne ecosystem.
colors:
  bg: "#09090B"
  bg-deep: "#070708"
  surface: "#111217"
  card: "#18181C"
  border: "#2A2A33"
  text: "#F4F4F5"
  muted: "#71717A"
  muted-strong: "#A1A1AA"
  primary: "#8B5CF6"
  primary-bright: "#A78BFA"
  primary-dim: "#6D4BC3"
  warning: "#D6AD60"
  danger: "#E45D62"
  success: "#45B883"
typography:
  display:
    fontFamily: '"IBM Plex Mono", "Cascadia Code", "Courier New", monospace'
    fontWeight: 700
  body:
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontWeight: 400
---

# Design System: Nocturne

## 1. Direção visual

Nocturne é uma interface de produto escura, precisa e discreta. Control e Codex compartilham a mesma atmosfera, paleta, hierarquia e linguagem de interação. A experiência deve parecer premium e tecnológica, sem recorrer a neon excessivo, estética gamer ou cyberpunk.

Princípios:

- Escuridão tonal, nunca preto puro.
- Violeta como assinatura de interação e navegação.
- Cor semântica usada com disciplina.
- Profundidade construída com contraste, bordas frias e sombras suaves.
- Movimento curto e funcional, sempre respeitando redução de movimento.
- Tipografia existente preservada: mono para sistema, sans-serif para leitura.

## 2. Paleta

### Base

- Background — #09090B: fundo principal.
- Deep background — #070708: áreas mais profundas e vinheta.
- Surface — #111217: controles e superfícies secundárias.
- Card — #18181C: cards e painéis elevados.
- Border — #2A2A33: separação padrão, sem tonalidade amarela.
- Text — #F4F4F5: conteúdo principal.
- Muted — #71717A: metadados e conteúdo auxiliar.
- Muted strong — #A1A1AA: textos secundários de maior importância.

### Assinatura

- Nocturne Violet — #8B5CF6: ação principal, item ativo, seleção, links, gráficos e sinais.
- Bright Violet — #A78BFA: texto ativo, ícones e realce de contraste.
- Dim Violet — #6D4BC3: início de gradientes e elementos inativos relacionados à marca.

### Semântica

- Gold — #D6AD60: prioridade alta, warning, manutenção e informação excepcional.
- Danger — #E45D62: falha, perigo, alvo hostil e estado crítico.
- Success — #45B883: conectado, operacional, concluído e estável.

O dourado nunca representa interação genérica. Vermelho e verde não são decorativos.

## 3. Superfícies e elevação

Painéis usam superfícies sólidas com gradientes radiais de baixa opacidade. A separação entre níveis deve continuar visível mesmo sem cor de destaque.

- Bordas em #2A2A33.
- Estado ativo pode usar violeta com alpha entre 0.22 e 0.42.
- Sombras principais entre 18px e 70px, sempre escuras e suaves.
- Glow violeta limitado a alpha baixo, geralmente abaixo de 0.10.
- Glow semântico só aparece no elemento que comunica o estado.

## 4. Componentes

### Botões

- Primário: fundo violeta discreto, borda violeta e texto claro.
- Hover: aumento pequeno de contraste, glow mínimo e elevação curta.
- Active: redução sutil de brilho, preservando feedback tátil existente.
- Disabled: opacidade reduzida e cursor bloqueado.
- Danger: vermelho somente em ações destrutivas.

### Inputs

- Fundo profundo e neutro.
- Borda fria no repouso.
- Placeholder cinza discreto.
- Focus violeta com anel de baixa opacidade.
- Estados disabled preservam legibilidade e semântica.

### Sidebar

- Superfície #111217 sobre fundo profundo.
- Item ativo em violeta, com rail e glow discretos.
- Hover usa preenchimento violeta de baixa opacidade.
- Badges de alerta continuam vermelhos; status operacional continua verde.

### Cards

- Fundo #18181C.
- Borda neutra no repouso.
- Hover violeta discreto para cards interativos.
- Conteúdo e espaçamento estrutural permanecem definidos pelo produto.
- Cards de prioridade podem usar dourado; cards de ameaça mantêm vermelho.

### Radar e mapas

- Grade e linhas estruturais em cinza escuro.
- Varredura, contatos e missões em violeta.
- Alvos/perigo em vermelho.
- Pressão e risco usam escala verde → dourado → vermelho.
- Controles ativos e marcadores de distrito selecionado usam violeta.

### Progresso e gráficos

- Progresso padrão e energia principal usam gradiente violeta.
- Risco usa apenas a escala semântica.
- Vermelho nunca representa progresso normal.

## 5. Acessibilidade e movimento

- Todo foco de teclado deve permanecer claramente visível.
- O modo de alto contraste deve reforçar bordas e textos neutros.
- Animações decorativas devem ser removidas com prefers-reduced-motion.
- Cor nunca deve ser o único indicador de um estado crítico.

## 6. Regras de consistência

### Fazer

- Aplicar melhorias pequenas e coerentes em toda a interface.
- Usar violeta para interação, seleção e dados principais.
- Preservar a atmosfera escura com contraste entre superfícies.
- Manter dourado raro para que informações excepcionais tenham peso.
- Compartilhar os mesmos tokens entre todas as telas.

### Evitar

- Não usar amarelo ou dourado como cor dominante.
- Não adicionar neon intenso, gradientes de texto ou glassmorphism decorativo.
- Não transformar a interface em estética gamer, militar ou cyberpunk.
- Não usar preto puro como superfície principal.
- Não alterar layout, comportamento ou hierarquia para resolver uma questão apenas visual.
