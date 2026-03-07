// =====================================================================
// joguinhos-modal.js — Sistema de Navegacao v2.0
// =====================================================================
// Gerencia 3 telas: Splash → Hub → Jogo
// Desenha personagens animados no splash (garotinho Jose + fundo)
// Monta grid de jogos no hub
// =====================================================================

(function () {
    'use strict';

    // ---- Registro de jogos ----
    const JOGOS = [
        {
            id: 'penaltis',
            nome: 'Penaltis',
            icon: 'sports_soccer',
            cor: 'linear-gradient(135deg,#10b981,#059669)',
            abrir: function () {
                if (!window.PenaltisGame) return;
                const container = document.getElementById('jogo-container');
                container.innerHTML = '';
                const inner = document.createElement('div');
                inner.id = 'penaltis-inner';
                inner.style.cssText = 'max-width:420px;width:100%;';
                container.appendChild(inner);
                window.PenaltisGame.abrir('penaltis-inner');
            },
            fechar: function () {
                if (window.PenaltisGame) window.PenaltisGame.fechar();
            }
        },
        {
            id: 'escorpiao',
            nome: 'Escorpiao',
            icon: 'pest_control',
            cor: 'linear-gradient(135deg,#f59e0b,#b45309)',
            abrir: function () {
                if (window.EscorpiaoGame) window.EscorpiaoGame.abrir();
            },
            fechar: function () {
                if (window.EscorpiaoGame) window.EscorpiaoGame.fechar();
            }
        },
        {
            id: 'reptil',
            nome: 'Reptil',
            icon: 'gesture',
            cor: 'linear-gradient(135deg,#10b981,#047857)',
            abrir: function () {
                if (window.ReptilGame) window.ReptilGame.abrir();
            },
            fechar: function () {
                if (window.ReptilGame) window.ReptilGame.fechar();
            }
        },
        {
            id: 'pacman',
            nome: 'Pac-Man',
            icon: 'adjust',
            cor: 'linear-gradient(135deg,#fbbf24,#f59e0b)',
            abrir: function () {
                if (window.PacmanGame) window.PacmanGame.abrir();
            },
            fechar: function () {
                if (window.PacmanGame) window.PacmanGame.fechar();
            }
        },
        {
            id: 'tamandua',
            nome: 'Tamandua',
            icon: 'pets',
            cor: 'linear-gradient(135deg,#8b5cf6,#6d28d9)',
            abrir: function () {
                if (window.TamanduaGame) window.TamanduaGame.abrir();
            },
            fechar: function () {
                if (window.TamanduaGame) window.TamanduaGame.fechar();
            }
        }
    ];

    // Atalhos de performance (window._PERF vem de perf-detect.js)
    var _P = function () { return window._PERF || {}; };
    var _low = function () { return _P().low; };

    let jogoAtual = null;
    let splashAnimFrame = null;
    let joseAnimFrame = null;
    var _splashResizeHandler = null;

    // ---- Música da Splash ----
    var _splashAC = null;
    var _splashMusicActive = false;
    var _splashNoteTimer = null;
    // Melodia pentatonica longa (~30s) [freq Hz, duração s]
    // Notas: C4=262, D4=294, E4=330, G4=392, A4=440, C5=523, D5=587, E5=659, G5=784, A5=880
    var _MELODY = [
        // Frase 1: Abertura suave ascendente
        [262, 0.3], [330, 0.3], [392, 0.3], [440, 0.4], [0, 0.2],
        [392, 0.25], [330, 0.25], [262, 0.5], [0, 0.3],
        // Frase 2: Saltitante
        [523, 0.15], [440, 0.15], [523, 0.15], [659, 0.3], [0, 0.15],
        [587, 0.2], [523, 0.2], [440, 0.3], [392, 0.4], [0, 0.25],
        // Frase 3: Melodia descendente calma
        [784, 0.35], [659, 0.25], [587, 0.25], [523, 0.35], [0, 0.2],
        [440, 0.3], [392, 0.3], [330, 0.4], [262, 0.5], [0, 0.4],
        // Frase 4: Brincalhona com notas rapidas
        [330, 0.12], [392, 0.12], [440, 0.12], [523, 0.12], [587, 0.2],
        [523, 0.12], [440, 0.12], [392, 0.12], [330, 0.25], [0, 0.2],
        [294, 0.15], [330, 0.15], [392, 0.3], [440, 0.4], [0, 0.3],
        // Frase 5: Ponte tranquila
        [262, 0.4], [0, 0.15], [330, 0.4], [0, 0.15], [392, 0.5], [0, 0.3],
        [440, 0.35], [392, 0.35], [330, 0.5], [0, 0.4],
        // Frase 6: Subida animada
        [262, 0.2], [294, 0.2], [330, 0.2], [392, 0.2], [440, 0.25],
        [523, 0.25], [587, 0.25], [659, 0.35], [0, 0.25],
        [784, 0.2], [659, 0.2], [523, 0.3], [0, 0.2],
        // Frase 7: Eco suave
        [440, 0.3], [0, 0.1], [440, 0.2], [0, 0.15],
        [392, 0.3], [0, 0.1], [392, 0.2], [0, 0.15],
        [330, 0.4], [262, 0.5], [0, 0.4],
        // Frase 8: Variacao com oitava alta
        [523, 0.25], [659, 0.25], [784, 0.3], [880, 0.4], [0, 0.2],
        [784, 0.2], [659, 0.2], [523, 0.3], [440, 0.4], [0, 0.3],
        // Frase 9: Descida lenta e majestosa
        [880, 0.4], [784, 0.35], [659, 0.35], [587, 0.35],
        [523, 0.4], [440, 0.35], [392, 0.35], [330, 0.5], [0, 0.4],
        // Frase 10: Final suave antes de repetir
        [262, 0.3], [330, 0.25], [262, 0.4], [0, 0.2],
        [294, 0.3], [262, 0.5], [0, 0.6],
        // Pausa longa antes de reiniciar
        [0, 1.5]
    ];

    function _tocarNotaSplash(freq, dur) {
        if (!_splashAC || _splashAC.state !== 'running') return;
        if (freq <= 0) return;
        var osc = _splashAC.createOscillator();
        var gain = _splashAC.createGain();
        osc.connect(gain);
        gain.connect(_splashAC.destination);
        osc.type = 'triangle';
        osc.frequency.value = freq;
        var now = _splashAC.currentTime;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.07, now + 0.015);
        gain.gain.setValueAtTime(0.07, now + dur * 0.72);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur * 0.95);
        osc.start(now);
        osc.stop(now + dur);
    }

    function _agendarNota(idx) {
        if (!_splashMusicActive) return;
        var note = _MELODY[idx];
        _tocarNotaSplash(note[0], note[1]);
        var next = (idx + 1) % _MELODY.length;
        _splashNoteTimer = setTimeout(function () { _agendarNota(next); }, note[1] * 1000);
    }

    function iniciarMusicaSplash() {
        _splashMusicActive = true;
        if (!_splashAC) {
            try { _splashAC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
        }
        if (_splashAC.state === 'suspended') {
            _splashAC.resume().then(function () {
                if (_splashMusicActive && !_splashNoteTimer) _agendarNota(0);
            });
        } else {
            _agendarNota(0);
        }
    }

    function pararMusicaSplash() {
        _splashMusicActive = false;
        if (_splashNoteTimer) { clearTimeout(_splashNoteTimer); _splashNoteTimer = null; }
        if (_splashAC) { _splashAC.close().catch(function () {}); _splashAC = null; }
    }

    // ---- Navegacao entre telas ----

    function mostrarTela(id) {
        document.querySelectorAll('.tela').forEach(function (t) {
            t.classList.add('hidden');
        });
        var tela = document.getElementById(id);
        if (tela) tela.classList.remove('hidden');
    }

    function irParaHub() {
        pararSplashAnim();
        mostrarTela('tela-hub');
    }

    function irParaSplash() {
        if (jogoAtual) {
            jogoAtual.fechar();
            jogoAtual = null;
        }
        var container = document.getElementById('jogo-container');
        if (container) container.innerHTML = '';
        mostrarTela('tela-splash');
        iniciarSplashAnim();
    }

    function irParaJogo(jogo) {
        jogoAtual = jogo;
        mostrarTela('tela-jogo');
        // Jogos com overlay proprio (fullscreen) escondem a tela-jogo
        if (jogo.id === 'escorpiao' || jogo.id === 'reptil' || jogo.id === 'pacman' || jogo.id === 'tamandua') {
            document.getElementById('tela-jogo').classList.add('hidden');
        }
        jogo.abrir();
    }

    function voltarDoJogo() {
        if (jogoAtual) {
            jogoAtual.fechar();
            jogoAtual = null;
        }
        var container = document.getElementById('jogo-container');
        if (container) container.innerHTML = '';
        mostrarTela('tela-hub');
    }

    // ---- Montar grid do hub ----

    function montarHub() {
        var grid = document.getElementById('hub-grid');
        if (!grid) return;
        grid.innerHTML = '';

        JOGOS.forEach(function (jogo) {
            var card = document.createElement('button');
            card.className = 'hub-card';
            card.setAttribute('aria-label', jogo.nome);
            card.innerHTML =
                '<div class="hub-card-icon" style="background:' + jogo.cor + ';">' +
                    '<span class="material-icons">' + jogo.icon + '</span>' +
                '</div>' +
                '<div class="hub-card-name">' + jogo.nome + '</div>';

            card.addEventListener('click', function () {
                irParaJogo(jogo);
            });
            grid.appendChild(card);
        });

        // Card "em breve" placeholders
        for (var i = 0; i < 1; i++) {
            var placeholder = document.createElement('div');
            placeholder.className = 'hub-card locked';
            placeholder.innerHTML =
                '<div class="hub-card-icon" style="background:rgba(255,255,255,0.05);">' +
                    '<span class="material-icons" style="color:rgba(255,255,255,0.2);">lock</span>' +
                '</div>' +
                '<div class="hub-card-name" style="color:rgba(255,255,255,0.2);">Em breve</div>';
            grid.appendChild(placeholder);
        }
    }

    // ---- Splash: Desenhar rosto do Jose (estilo referencia) ----

    function desenharJose() {
        var canvas = document.getElementById('jose-canvas');
        if (!canvas) return;
        var ctx = canvas.getContext('2d');
        var W = canvas.width;
        var H = canvas.height;
        var t = 0;

        // Paleta de cores
        var skin = '#f5dfc5';
        var skinDark = '#e8c9a8';
        var hairColor = '#1a3f7a';
        var hairLight = '#2d5fa8';
        var hairDark = '#0f2a55';

        function frame() {
            t++;
            ctx.clearRect(0, 0, W, H);

            var cx = W / 2;
            var cy = H / 2 + 10;
            var bounce = Math.sin(t * 0.04) * 1.5;

            ctx.save();

            // Leve rotacao divertida
            ctx.translate(cx, cy);
            ctx.rotate(Math.sin(t * 0.02) * 0.02);
            ctx.translate(-cx, -cy);

            // ===== ORELHAS =====
            ctx.fillStyle = skin;
            ctx.beginPath();
            ctx.ellipse(cx - 52, cy + 5 + bounce, 12, 16, -0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cx + 52, cy + 5 + bounce, 12, 16, 0.2, 0, Math.PI * 2);
            ctx.fill();

            // ===== ROSTO =====
            // Sombra sutil
            ctx.fillStyle = skinDark;
            ctx.beginPath();
            ctx.ellipse(cx, cy + 6 + bounce, 52, 48, 0, 0, Math.PI * 2);
            ctx.fill();
            // Rosto principal
            ctx.fillStyle = skin;
            ctx.beginPath();
            ctx.ellipse(cx, cy + bounce, 50, 46, 0, 0, Math.PI * 2);
            ctx.fill();

            // ===== CABELO AZUL (mais volumoso) =====
            // Base do cabelo
            ctx.fillStyle = hairDark;
            ctx.beginPath();
            ctx.arc(cx, cy - 10 + bounce, 55, Math.PI, 0);
            ctx.fill();

            // Cachinhos maiores e mais organicos
            var curls = [
                { x: 0, y: -62, r: 18 },
                { x: -22, y: -58, r: 17 }, { x: 22, y: -58, r: 17 },
                { x: -42, y: -45, r: 16 }, { x: 42, y: -45, r: 16 },
                { x: -10, y: -68, r: 14 }, { x: 10, y: -68, r: 14 },
                { x: -32, y: -55, r: 15 }, { x: 32, y: -55, r: 15 },
                { x: -50, y: -30, r: 14 }, { x: 50, y: -30, r: 14 },
                { x: 0, y: -72, r: 12 },
                { x: -55, y: -15, r: 12 }, { x: 55, y: -15, r: 12 }
            ];

            curls.forEach(function(c, i) {
                var wobble = Math.sin(t * 0.02 + i * 0.4) * 1.5;
                ctx.fillStyle = hairColor;
                ctx.beginPath();
                ctx.arc(cx + c.x + wobble, cy + c.y + bounce, c.r, 0, Math.PI * 2);
                ctx.fill();
                // Brilho no cabelo
                ctx.fillStyle = hairLight;
                ctx.beginPath();
                ctx.arc(cx + c.x + wobble - 4, cy + c.y + bounce - 5, c.r * 0.3, 0, Math.PI * 2);
                ctx.fill();
            });

            // ===== OLHOS GRANDES E EXPRESSIVOS =====
            var blink = (t % 200 < 8) ? 0.1 : 1;
            var eyeY = cy + bounce;
            var eyeSpacing = 22;

            // Branco dos olhos
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.ellipse(cx - eyeSpacing, eyeY, 14, 16 * blink, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cx + eyeSpacing, eyeY, 14, 16 * blink, 0, 0, Math.PI * 2);
            ctx.fill();

            // Iris (marrom escuro)
            if (blink > 0.5) {
                ctx.fillStyle = '#3d2314';
                ctx.beginPath();
                ctx.ellipse(cx - eyeSpacing + 2, eyeY + 2, 9, 10, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.ellipse(cx + eyeSpacing + 2, eyeY + 2, 9, 10, 0, 0, Math.PI * 2);
                ctx.fill();

                // Pupila
                ctx.fillStyle = '#1a0f0a';
                ctx.beginPath();
                ctx.arc(cx - eyeSpacing + 2, eyeY + 3, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(cx + eyeSpacing + 2, eyeY + 3, 5, 0, Math.PI * 2);
                ctx.fill();

                // Brilhos grandes
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(cx - eyeSpacing + 5, eyeY - 2, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(cx + eyeSpacing + 5, eyeY - 2, 4, 0, Math.PI * 2);
                ctx.fill();
                // Brilhos pequenos
                ctx.beginPath();
                ctx.arc(cx - eyeSpacing - 1, eyeY + 5, 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(cx + eyeSpacing - 1, eyeY + 5, 2, 0, Math.PI * 2);
                ctx.fill();
            }

            // ===== SOBRANCELHAS SUAVES =====
            ctx.strokeStyle = hairDark;
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(cx - 34, cy - 18 + bounce);
            ctx.quadraticCurveTo(cx - 22, cy - 24 + bounce, cx - 10, cy - 20 + bounce);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx + 10, cy - 20 + bounce);
            ctx.quadraticCurveTo(cx + 22, cy - 24 + bounce, cx + 34, cy - 18 + bounce);
            ctx.stroke();

            // ===== NARIZ PEQUENO =====
            ctx.fillStyle = skinDark;
            ctx.beginPath();
            ctx.ellipse(cx, cy + 18 + bounce, 4, 3, 0, 0, Math.PI * 2);
            ctx.fill();

            // ===== BOCHECHAS ROSADAS =====
            ctx.fillStyle = 'rgba(255, 160, 140, 0.35)';
            ctx.beginPath();
            ctx.ellipse(cx - 36, cy + 18 + bounce, 12, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cx + 36, cy + 18 + bounce, 12, 8, 0, 0, Math.PI * 2);
            ctx.fill();

            // ===== SORRISO FELIZ =====
            // Boca aberta
            ctx.fillStyle = '#c45c5c';
            ctx.beginPath();
            ctx.ellipse(cx, cy + 32 + bounce, 18, 12, 0, 0, Math.PI);
            ctx.fill();

            // Dentes superiores
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(cx, cy + 32 + bounce, 14, 0.15, Math.PI - 0.15);
            ctx.lineTo(cx - 13, cy + 32 + bounce);
            ctx.fill();

            // Contorno do sorriso
            ctx.strokeStyle = '#803030';
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(cx, cy + 32 + bounce, 16, 0.1, Math.PI - 0.1);
            ctx.stroke();

            ctx.restore();

            joseAnimFrame = requestAnimationFrame(frame);
        }
        frame();
    }

    // ---- Splash: Fundo estilo arcade/games ----

    function desenharFundoSplash() {
        var canvas = document.getElementById('splash-bg-canvas');
        if (!canvas) return;

        var W, H;
        function resize() {
            W = window.innerWidth;
            H = window.innerHeight;
            canvas.width = W;
            canvas.height = H;
        }
        resize();
        if (_splashResizeHandler) window.removeEventListener('resize', _splashResizeHandler);
        _splashResizeHandler = resize;
        window.addEventListener('resize', resize);

        var ctx = canvas.getContext('2d');
        var t = 0;

        // Formas decorativas fixas (estilo Stitch design)
        var FORMAS_FIXAS = [
            // Estrelas
            { x: 0.08, y: 0.82, size: 18, shape: 'star',     color: '#fbbf24', phase: 0.0 },
            { x: 0.92, y: 0.72, size: 16, shape: 'star',     color: '#38bdf8', phase: 1.2 },
            { x: 0.18, y: 0.12, size: 14, shape: 'star',     color: '#f472b6', phase: 2.4 },
            { x: 0.82, y: 0.18, size: 15, shape: 'star',     color: '#a855f7', phase: 0.8 },
            // Triangulos
            { x: 0.06, y: 0.35, size: 14, shape: 'triangle', color: '#34d399', phase: 1.6 },
            { x: 0.94, y: 0.42, size: 13, shape: 'triangle', color: '#fbbf24', phase: 0.4 },
            { x: 0.25, y: 0.88, size: 12, shape: 'triangle', color: '#38bdf8', phase: 2.0 },
            { x: 0.75, y: 0.85, size: 13, shape: 'triangle', color: '#f472b6', phase: 1.0 },
            // Circulos
            { x: 0.88, y: 0.55, size: 10, shape: 'circle',   color: '#fbbf24', phase: 1.8 },
            { x: 0.12, y: 0.58, size: 11, shape: 'circle',   color: '#22d3ee', phase: 0.6 },
            { x: 0.55, y: 0.90, size: 9,  shape: 'circle',   color: '#a855f7', phase: 2.2 },
            { x: 0.45, y: 0.06, size: 10, shape: 'circle',   color: '#34d399', phase: 1.4 },
            { x: 0.78, y: 0.06, size: 8,  shape: 'circle',   color: '#fbbf24', phase: 0.2 },
            { x: 0.22, y: 0.06, size: 8,  shape: 'circle',   color: '#38bdf8', phase: 1.9 },
        ];

        // Funcao para desenhar formas
        function drawShape(x, y, size, shape, rotation) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rotation);
            ctx.beginPath();

            switch (shape) {
                case 'circle':
                    ctx.arc(0, 0, size, 0, Math.PI * 2);
                    break;
                case 'triangle':
                    ctx.moveTo(0, -size);
                    ctx.lineTo(size * 0.866, size * 0.5);
                    ctx.lineTo(-size * 0.866, size * 0.5);
                    ctx.closePath();
                    break;
                case 'square':
                    ctx.rect(-size * 0.7, -size * 0.7, size * 1.4, size * 1.4);
                    break;
                case 'diamond':
                    ctx.moveTo(0, -size);
                    ctx.lineTo(size * 0.6, 0);
                    ctx.lineTo(0, size);
                    ctx.lineTo(-size * 0.6, 0);
                    ctx.closePath();
                    break;
                case 'star':
                    for (var i = 0; i < 5; i++) {
                        var angle = (i * 4 * Math.PI / 5) - Math.PI / 2;
                        var px = Math.cos(angle) * size;
                        var py = Math.sin(angle) * size;
                        if (i === 0) ctx.moveTo(px, py);
                        else ctx.lineTo(px, py);
                    }
                    ctx.closePath();
                    break;
            }
            ctx.fill();
            ctx.restore();
        }

        function frame() {
            t++;
            ctx.clearRect(0, 0, W, H);

            // Grid de pontos (estilo Stitch design, skip em low-end)
            if (!_low()) {
                var gridSize = 48;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
                for (var gy = gridSize; gy < H; gy += gridSize) {
                    for (var gx = gridSize; gx < W; gx += gridSize) {
                        ctx.beginPath();
                        ctx.arc(gx, gy, 1.5, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }

            // Glow central suave (atras do mascote, skip em low-end)
            if (!_low()) {
                var glowPulse = 0.25 + Math.sin(t * 0.02) * 0.08;
                var centerGlow = ctx.createRadialGradient(W / 2, H * 0.38, 0, W / 2, H * 0.38, Math.min(W, H) * 0.55);
                centerGlow.addColorStop(0, 'rgba(109, 40, 217, ' + (glowPulse * 0.5) + ')');
                centerGlow.addColorStop(0.6, 'rgba(109, 40, 217, ' + (glowPulse * 0.15) + ')');
                centerGlow.addColorStop(1, 'rgba(109, 40, 217, 0)');
                ctx.fillStyle = centerGlow;
                ctx.fillRect(0, 0, W, H);
            }

            // Formas decorativas fixas com leve flutuacao
            FORMAS_FIXAS.forEach(function(f) {
                var fx = f.x * W;
                var fy = f.y * H + Math.sin(t * 0.025 + f.phase) * 6;
                var rot = Math.sin(t * 0.015 + f.phase) * 0.25;
                var pulse = 0.75 + Math.sin(t * 0.03 + f.phase) * 0.25;
                ctx.globalAlpha = pulse;
                ctx.fillStyle = f.color;
                drawShape(fx, fy, f.size, f.shape, rot);
            });

            ctx.globalAlpha = 1;
            splashAnimFrame = requestAnimationFrame(frame);
        }
        frame();
    }

    function iniciarSplashAnim() {
        desenharJose();
        desenharFundoSplash();
        // Musica inicia apenas apos gesto do usuario (ver tentarIniciarMusica)
    }

    function pararSplashAnim() {
        if (splashAnimFrame) {
            cancelAnimationFrame(splashAnimFrame);
            splashAnimFrame = null;
        }
        if (joseAnimFrame) {
            cancelAnimationFrame(joseAnimFrame);
            joseAnimFrame = null;
        }
        if (_splashResizeHandler) {
            window.removeEventListener('resize', _splashResizeHandler);
            _splashResizeHandler = null;
        }
        pararMusicaSplash();
    }

    // ---- Inicializacao ----

    function init() {
        // Montar hub
        montarHub();

        // Botao jogar no splash
        var btnJogar = document.getElementById('btn-jogar');
        if (btnJogar) {
            btnJogar.addEventListener('click', irParaHub);
        }

        // Botao voltar no hub
        var hubBack = document.getElementById('hub-back-btn');
        if (hubBack) {
            hubBack.addEventListener('click', irParaSplash);
        }

        // Botao voltar do jogo
        var jogoVoltar = document.getElementById('jogo-voltar-btn');
        if (jogoVoltar) {
            jogoVoltar.addEventListener('click', voltarDoJogo);
        }

        // Iniciar animacoes do splash
        iniciarSplashAnim();

        // Musica: inicia apenas apos primeira interacao do usuario
        var _musicaIniciada = false;
        function tentarIniciarMusica() {
            if (_musicaIniciada) return;
            _musicaIniciada = true;
            ['click', 'touchstart', 'keydown'].forEach(function (evt) {
                document.removeEventListener(evt, tentarIniciarMusica);
            });
            iniciarMusicaSplash();
        }
        ['click', 'touchstart', 'keydown'].forEach(function (evt) {
            document.addEventListener(evt, tentarIniciarMusica, { passive: true });
        });
    }

    // Exposicao global (retrocompatibilidade)
    window.abrirJoguinhos = irParaHub;
    window.fecharJoguinhos = voltarDoJogo;

    // Rodar ao carregar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
