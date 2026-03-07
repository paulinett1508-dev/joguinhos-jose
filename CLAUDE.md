# JOGUINHOS - PROJECT RULES

## Publico-Alvo

Criancas pequenas (~2-5 anos), muitas ainda nao sabem ler.

- Texto pode existir, mas **curto e simples** (1-3 palavras por elemento)
- **Nunca verboso** — frases longas ou instrucoes complexas
- Priorizar comunicacao visual: icones, cores, formas, animacoes

## Tech Stack
- **Runtime:** Browser (Vanilla JS, zero dependencias)
- **Rendering:** Canvas 2D API
- **Styling:** Inline styles + Google Fonts (Russo One, Inter, JetBrains Mono)
- **Icons:** Material Icons (via CDN)
- **Audio:** Web Audio API (sons gerados programaticamente, zero arquivos)
- **Deploy:** Vercel (site estatico, sem build step)

## Deploy (Vercel)

- Site 100% estatico — sem servidor, sem build step
- `index.html` na raiz do projeto
- Framework preset: "Other" no Vercel
- Output directory: `.` (raiz)
- Config em `vercel.json` (headers de cache para assets)
- Cada push no GitHub = deploy automatico

## Arquitetura

### Estrutura de Arquivos
```
index.html              # Pagina principal
vercel.json             # Config Vercel
jogos/
  penaltis.js           # Jogo de Penaltis (standalone)
  escorpiao.js          # Jogo Escorpiao (standalone)
  joguinhos-modal.js    # Modal de selecao (orquestra os jogos)
assets/
  sons/                 # Futuros arquivos de audio (se necessario)
docs/
  ORIGEM.md             # Referencia do codigo original
```

### Padrao de Cada Jogo
Cada jogo e um IIFE que expoe um objeto global:
- `window.PenaltisGame` — com metodos `abrir(container)` e `fechar()`
- `window.EscorpiaoGame` — com metodos `abrir()` e `fechar()`
- `window.abrirJoguinhos()` / `window.fecharJoguinhos()` — modal de selecao

### Fluxo
```
abrirJoguinhos() → Modal de selecao
  ├── Penaltis → PenaltisGame.abrir(container)
  │     ├── Selecao de modo (Cobrador / Goleiro)
  │     ├── Selecao de dificuldade (4 niveis)
  │     └── Game loop (canvas 360x240)
  └── Escorpiao → EscorpiaoGame.abrir()
        └── Canvas fullscreen (mouse-driven)
```

## Coding Standards

### Regras Gerais
- **Zero dependencias** — Nao usar frameworks, libs, bundlers
- **Vanilla JS puro** — Sem React, Vue, jQuery, etc.
- **IIFE pattern** — Cada jogo encapsulado em IIFE
- **Exposicao global** — APIs expostas via `window.NomeDoJogo`

### UI/UX
- **Dark mode** — Fundo escuro (#0f172a, #1e293b)
- **Fontes:** Russo One (titulos/stats), JetBrains Mono (numeros), Inter (corpo)
- **Icons:** Material Icons (NUNCA emojis no codigo)
- **Responsivo:** Suporte a mouse + touch
- **Acessibilidade:** Suporte a teclado (atalhos)

### Design para Criancas
- **Alvos de toque grandes** — Minimo 64x64px, ideal 80px+
- **Espacamento generoso** — Minimo 20px entre elementos clicaveis
- **Interacao simples** — Tap/clique basico. Evitar drag, pinch, swipe, gestos complexos
- **Sem feedback negativo** — NUNCA "voce perdeu", "errou", insultos. Toda interacao = resposta positiva
- **Sessoes curtas** — 2-3 minutos por rodada no maximo
- **Texto curto** — Ok ter texto, mas 1-3 palavras. Nunca frases longas
- **Feedback imediato** — Todo toque deve produzir som + animacao visual
- **Cores vibrantes** — Alto contraste, cores alegres

### Audio (Web Audio API)
- Sons gerados **programaticamente** via `AudioContext` + `OscillatorNode`
- Zero dependencia de arquivos de audio externos
- Todo jogo deve ter feedback sonoro em interacoes (clique, acerto, erro, fim)
- **Cleanup obrigatorio** — fechar/suspender `AudioContext` ao fechar jogo
- Padrao: criar helper de som dentro de cada IIFE, nao como global

### Canvas
- **requestAnimationFrame** para game loops
- **Cleanup obrigatorio** — cancelAnimationFrame + removeEventListener ao fechar
- **Responsive** — Listener de resize para ajustar canvas

### Novo Jogo — Checklist
Ao adicionar um novo jogo:
1. Criar `jogos/nome-do-jogo.js` seguindo o padrao IIFE
2. Expor `window.NomeDoJogoGame` com `abrir()` e `fechar()`
3. Adicionar botao no modal (`joguinhos-modal.js`)
4. Incluir `<script src="jogos/...">` na `index.html` (raiz)
5. Atualizar `README.md` com descricao do jogo
6. Documentar origem em `docs/ORIGEM.md` se aplicavel

## Protocolo de Planejamento

**ANTES de implementar qualquer mudanca:**
1. Criar planejamento com TodoWrite
2. Apresentar ao usuario
3. Aguardar aprovacao
4. Executar

## Jogos Existentes

### Penaltis (`penaltis.js`)
- Canvas 360x240, arcade 8-bit
- 2 modos: striker (cobrar) e keeper (defender)
- 4 dificuldades com IA progressiva
- Controles: mouse/touch + teclado (Q/W/E + A/S/D)
- 5 cobranças por partida

### Escorpiao (`escorpiao.js`)
- Canvas fullscreen
- 16 segmentos: cabeca + 8 corpo + 6 cauda
- Fisica: LERP na cabeca, chain following nos segmentos
- Efeitos: patas animadas, ferrao glow, olhos, garras
- Controles: mouse/touch, ESC para sair

## Ideias para Novos Jogos
- Snake (tema futebol)
- Memory (escudos de times)
- Quiz de futebol
- Dino runner (estilo Chrome offline)
- Flappy bird (tema cartola)
