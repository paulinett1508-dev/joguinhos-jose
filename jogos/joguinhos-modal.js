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
        }
    ];

    let jogoAtual = null;
    let splashAnimFrame = null;
    let joseAnimFrame = null;

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
        if (jogo.id === 'escorpiao' || jogo.id === 'reptil') {
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

    // ---- Splash: Desenhar rosto do Jose (baseado na foto real) ----

    function desenharJose() {
        var canvas = document.getElementById('jose-canvas');
        if (!canvas) return;
        var ctx = canvas.getContext('2d');
        var W = canvas.width;
        var H = canvas.height;
        var t = 0;

        // Cores baseadas na foto
        var skinBase = '#d4a574';
        var skinShadow = '#b8956a';
        var skinHighlight = '#e8c4a0';
        var hairBlue = '#1e6091';
        var hairBlueLight = '#3b82c4';
        var hairBlueDark = '#0f4c75';

        function frame() {
            t++;
            ctx.clearRect(0, 0, W, H);

            var cx = W / 2;
            var cy = H / 2 + 8;
            var bounce = Math.sin(t * 0.04) * 2;
            var tilt = Math.sin(t * 0.025) * 1.5;

            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(tilt * Math.PI / 180);
            ctx.translate(-cx, -cy);

            // Glow azul atras do cabelo
            var hairGlow = ctx.createRadialGradient(cx, cy - 40, 20, cx, cy - 40, 70);
            hairGlow.addColorStop(0, 'rgba(59, 130, 196, 0.3)');
            hairGlow.addColorStop(1, 'rgba(59, 130, 196, 0)');
            ctx.fillStyle = hairGlow;
            ctx.beginPath();
            ctx.arc(cx, cy - 40, 70, 0, Math.PI * 2);
            ctx.fill();

            // Orelhas
            ctx.fillStyle = skinBase;
            ctx.beginPath();
            ctx.ellipse(cx - 48, cy + 10 + bounce, 8, 12, -0.1, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cx + 48, cy + 10 + bounce, 8, 12, 0.1, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = skinShadow;
            ctx.beginPath();
            ctx.ellipse(cx - 48, cy + 12 + bounce, 4, 6, -0.1, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cx + 48, cy + 12 + bounce, 4, 6, 0.1, 0, Math.PI * 2);
            ctx.fill();

            // Cabeca - rosto redondo de crianca
            ctx.fillStyle = skinShadow;
            ctx.beginPath();
            ctx.ellipse(cx, cy + 4 + bounce, 45, 50, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = skinBase;
            ctx.beginPath();
            ctx.ellipse(cx, cy + bounce, 44, 49, 0, 0, Math.PI * 2);
            ctx.fill();

            // Highlight nas bochechas
            var cheekGlow = ctx.createRadialGradient(cx - 25, cy + 15 + bounce, 0, cx - 25, cy + 15 + bounce, 20);
            cheekGlow.addColorStop(0, skinHighlight);
            cheekGlow.addColorStop(1, 'rgba(232, 196, 160, 0)');
            ctx.fillStyle = cheekGlow;
            ctx.beginPath();
            ctx.arc(cx - 25, cy + 15 + bounce, 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(cx + 25, cy + 15 + bounce, 20, 0, Math.PI * 2);
            ctx.fill();

            // Cabelo azul - base volumosa cacheada
            ctx.fillStyle = hairBlueDark;
            ctx.beginPath();
            ctx.ellipse(cx, cy - 22 + bounce, 48, 40, 0, Math.PI, Math.PI * 2);
            ctx.fill();

            // Cachos azuis (curtos e volumosos como na foto)
            var curls = [
                { x: 0, y: -58, r: 14 },
                { x: -18, y: -55, r: 13 }, { x: 18, y: -55, r: 13 },
                { x: -32, y: -48, r: 12 }, { x: 32, y: -48, r: 12 },
                { x: -42, y: -35, r: 10 }, { x: 42, y: -35, r: 10 },
                { x: -10, y: -60, r: 11 }, { x: 10, y: -60, r: 11 },
                { x: -25, y: -58, r: 10 }, { x: 25, y: -58, r: 10 },
                { x: -38, y: -42, r: 11 }, { x: 38, y: -42, r: 11 },
                { x: 0, y: -65, r: 10 }
            ];
            curls.forEach(function(c, i) {
                var wobble = Math.sin(t * 0.03 + i * 0.6) * 1.5;
                // Sombra
                ctx.fillStyle = hairBlueDark;
                ctx.beginPath();
                ctx.arc(cx + c.x + wobble, cy + c.y + bounce + 2, c.r, 0, Math.PI * 2);
                ctx.fill();
                // Cacho principal
                ctx.fillStyle = hairBlue;
                ctx.beginPath();
                ctx.arc(cx + c.x + wobble, cy + c.y + bounce, c.r, 0, Math.PI * 2);
                ctx.fill();
                // Highlight
                ctx.fillStyle = hairBlueLight;
                ctx.beginPath();
                ctx.arc(cx + c.x + wobble - 2, cy + c.y + bounce - 3, c.r * 0.4, 0, Math.PI * 2);
                ctx.fill();
            });

            // Linha do cabelo na testa
            ctx.fillStyle = hairBlue;
            ctx.beginPath();
            ctx.ellipse(cx, cy - 28 + bounce, 40, 18, 0, Math.PI, Math.PI * 2);
            ctx.fill();

            // Sobrancelhas naturais escuras
            ctx.strokeStyle = '#3d2314';
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(cx - 26, cy - 12 + bounce);
            ctx.quadraticCurveTo(cx - 18, cy - 16 + bounce, cx - 10, cy - 12 + bounce);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx + 10, cy - 12 + bounce);
            ctx.quadraticCurveTo(cx + 18, cy - 16 + bounce, cx + 26, cy - 12 + bounce);
            ctx.stroke();

            // Olhos - formato amendoado como na foto
            var blink = (t % 200 < 8) ? 0.15 : 1;
            var eyeY = cy + 2 + bounce;

            // Branco dos olhos
            ctx.fillStyle = '#fefefe';
            ctx.beginPath();
            ctx.ellipse(cx - 16, eyeY, 9, 10 * blink, 0.1, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cx + 16, eyeY, 9, 10 * blink, -0.1, 0, Math.PI * 2);
            ctx.fill();

            if (blink > 0.5) {
                var lookX = Math.sin(t * 0.018) * 2;

                // Iris castanho escuro
                ctx.fillStyle = '#2d1810';
                ctx.beginPath();
                ctx.arc(cx - 16 + lookX, eyeY + 1, 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(cx + 16 + lookX, eyeY + 1, 6, 0, Math.PI * 2);
                ctx.fill();

                // Pupila
                ctx.fillStyle = '#0a0a0a';
                ctx.beginPath();
                ctx.arc(cx - 16 + lookX, eyeY + 1, 3.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(cx + 16 + lookX, eyeY + 1, 3.5, 0, Math.PI * 2);
                ctx.fill();

                // Brilho nos olhos
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(cx - 14 + lookX, eyeY - 1, 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(cx + 18 + lookX, eyeY - 1, 2, 0, Math.PI * 2);
                ctx.fill();
            }

            // Palpebras superiores sutis
            ctx.strokeStyle = '#5c4030';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(cx - 16, eyeY - 1, 9, Math.PI + 0.4, -0.4);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(cx + 16, eyeY - 1, 9, Math.PI + 0.4, -0.4);
            ctx.stroke();

            // Nariz - pequeno e arredondado
            ctx.fillStyle = skinShadow;
            ctx.beginPath();
            ctx.ellipse(cx, cy + 18 + bounce, 5, 4, 0, 0, Math.PI * 2);
            ctx.fill();
            // Narinas sutis
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.beginPath();
            ctx.ellipse(cx - 3, cy + 19 + bounce, 2, 1.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cx + 3, cy + 19 + bounce, 2, 1.5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Bochechas rosadas
            ctx.fillStyle = 'rgba(205, 92, 92, 0.2)';
            ctx.beginPath();
            ctx.ellipse(cx - 30, cy + 18 + bounce, 10, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cx + 30, cy + 18 + bounce, 10, 6, 0, 0, Math.PI * 2);
            ctx.fill();

            // SORRISO GRANDE - caracteristica principal!
            // Labios
            ctx.fillStyle = '#c4736c';
            ctx.beginPath();
            ctx.ellipse(cx, cy + 32 + bounce, 20, 12, 0, 0, Math.PI);
            ctx.fill();

            // Interior da boca (escuro)
            ctx.fillStyle = '#4a1c1c';
            ctx.beginPath();
            ctx.ellipse(cx, cy + 34 + bounce, 17, 9, 0, 0, Math.PI);
            ctx.fill();

            // Dentes superiores
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.roundRect(cx - 14, cy + 28 + bounce, 28, 10, 2);
            ctx.fill();

            // Linhas entre os dentes
            ctx.strokeStyle = 'rgba(0,0,0,0.08)';
            ctx.lineWidth = 0.5;
            for (var d = -10; d <= 10; d += 5) {
                ctx.beginPath();
                ctx.moveTo(cx + d, cy + 28 + bounce);
                ctx.lineTo(cx + d, cy + 37 + bounce);
                ctx.stroke();
            }

            // Labio superior
            ctx.strokeStyle = '#a85a55';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(cx - 18, cy + 28 + bounce);
            ctx.quadraticCurveTo(cx - 8, cy + 25 + bounce, cx, cy + 27 + bounce);
            ctx.quadraticCurveTo(cx + 8, cy + 25 + bounce, cx + 18, cy + 28 + bounce);
            ctx.stroke();

            // Covinhas
            ctx.strokeStyle = skinShadow;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(cx - 25, cy + 28 + bounce, 3, 0.3, 1.8);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(cx + 25, cy + 28 + bounce, 3, 1.3, 2.8);
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
        window.addEventListener('resize', resize);

        var ctx = canvas.getContext('2d');
        var t = 0;

        // Particulas geometricas (triangulos, quadrados, circulos)
        var particulas = [];
        var shapes = ['circle', 'triangle', 'square', 'diamond', 'star'];
        for (var i = 0; i < 35; i++) {
            particulas.push({
                x: Math.random() * W,
                y: Math.random() * H,
                size: 4 + Math.random() * 12,
                speedY: 0.3 + Math.random() * 0.8,
                speedX: (Math.random() - 0.5) * 0.5,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.03,
                phase: Math.random() * Math.PI * 2,
                shape: shapes[Math.floor(Math.random() * shapes.length)],
                color: ['#818cf8', '#34d399', '#fbbf24', '#f472b6', '#38bdf8', '#a855f7', '#22d3ee'][Math.floor(Math.random() * 7)],
                opacity: 0.15 + Math.random() * 0.35
            });
        }

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

            // Grid neon sutil no fundo
            ctx.strokeStyle = 'rgba(139, 92, 246, 0.06)';
            ctx.lineWidth = 1;
            var gridSize = 60;
            var gridOffset = (t * 0.3) % gridSize;

            // Linhas horizontais
            for (var gy = -gridSize + gridOffset; gy < H + gridSize; gy += gridSize) {
                ctx.beginPath();
                ctx.moveTo(0, gy);
                ctx.lineTo(W, gy);
                ctx.stroke();
            }
            // Linhas verticais
            for (var gx = 0; gx < W; gx += gridSize) {
                ctx.beginPath();
                ctx.moveTo(gx, 0);
                ctx.lineTo(gx, H);
                ctx.stroke();
            }

            // Glow central (atras do mascote)
            var glowPulse = 0.3 + Math.sin(t * 0.02) * 0.1;
            var centerGlow = ctx.createRadialGradient(W / 2, H * 0.32, 0, W / 2, H * 0.32, Math.min(W, H) * 0.5);
            centerGlow.addColorStop(0, 'rgba(139, 92, 246, ' + (glowPulse * 0.3) + ')');
            centerGlow.addColorStop(0.5, 'rgba(168, 85, 247, ' + (glowPulse * 0.15) + ')');
            centerGlow.addColorStop(1, 'rgba(168, 85, 247, 0)');
            ctx.fillStyle = centerGlow;
            ctx.fillRect(0, 0, W, H);

            // Particulas geometricas flutuando
            particulas.forEach(function (p) {
                // Mover particula
                p.y -= p.speedY;
                p.x += p.speedX + Math.sin(t * 0.01 + p.phase) * 0.3;
                p.rotation += p.rotSpeed;

                // Wrap around
                if (p.y < -p.size * 2) {
                    p.y = H + p.size * 2;
                    p.x = Math.random() * W;
                }
                if (p.x < -p.size * 2) p.x = W + p.size * 2;
                if (p.x > W + p.size * 2) p.x = -p.size * 2;

                // Pulsar opacidade
                var pulse = p.opacity * (0.7 + Math.sin(t * 0.03 + p.phase) * 0.3);
                ctx.globalAlpha = pulse;
                ctx.fillStyle = p.color;
                drawShape(p.x, p.y, p.size, p.shape, p.rotation);
            });

            // Icones de game nos cantos (gamepad silhuetas)
            ctx.globalAlpha = 0.08;

            // Gamepad canto inferior esquerdo
            var padX = W * 0.12;
            var padY = H * 0.88 + Math.sin(t * 0.025) * 8;
            ctx.fillStyle = '#a855f7';
            ctx.beginPath();
            ctx.roundRect(padX - 25, padY - 12, 50, 24, 8);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(padX - 12, padY, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(padX + 12, padY, 6, 0, Math.PI * 2);
            ctx.fill();

            // Gamepad canto inferior direito
            var pad2X = W * 0.88;
            var pad2Y = H * 0.85 + Math.sin(t * 0.025 + 2) * 8;
            ctx.fillStyle = '#22d3ee';
            ctx.beginPath();
            ctx.roundRect(pad2X - 25, pad2Y - 12, 50, 24, 8);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(pad2X - 12, pad2Y, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(pad2X + 12, pad2Y, 6, 0, Math.PI * 2);
            ctx.fill();

            // Estrelas brilhantes nos cantos
            ctx.fillStyle = '#fbbf24';
            var starPositions = [
                { x: 0.08, y: 0.12 }, { x: 0.92, y: 0.1 }, { x: 0.15, y: 0.25 },
                { x: 0.85, y: 0.28 }, { x: 0.05, y: 0.5 }, { x: 0.95, y: 0.45 }
            ];
            starPositions.forEach(function (sp, si) {
                var sx = sp.x * W;
                var sy = sp.y * H;
                var twinkle = 0.5 + Math.sin(t * 0.06 + si * 1.5) * 0.5;
                ctx.globalAlpha = 0.1 + twinkle * 0.15;

                // Estrela de 4 pontas
                ctx.save();
                ctx.translate(sx, sy);
                ctx.rotate(t * 0.01 + si);
                var starSize = 6 + twinkle * 8;
                ctx.beginPath();
                ctx.moveTo(0, -starSize);
                ctx.lineTo(starSize * 0.2, -starSize * 0.2);
                ctx.lineTo(starSize, 0);
                ctx.lineTo(starSize * 0.2, starSize * 0.2);
                ctx.lineTo(0, starSize);
                ctx.lineTo(-starSize * 0.2, starSize * 0.2);
                ctx.lineTo(-starSize, 0);
                ctx.lineTo(-starSize * 0.2, -starSize * 0.2);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            });

            ctx.globalAlpha = 1;

            splashAnimFrame = requestAnimationFrame(frame);
        }
        frame();
    }

    function iniciarSplashAnim() {
        desenharJose();
        desenharFundoSplash();
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
