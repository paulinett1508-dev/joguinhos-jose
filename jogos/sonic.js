// =====================================================================
// sonic.js — Jogo Sonic Runner v1.0
// =====================================================================
// Endless runner estilo Green Hill Zone, Sonic procedural (sem sprites)
// Coletar aneis dourados, pular obstaculos, sem game over
// Toque/Space para pular, ESC para sair
// =====================================================================

(function () {
    'use strict';

    // ---- Configuracao ----
    var CONF = {
        // Cores - Green Hill Zone
        SKY_TOP:        '#5ab9f5',
        SKY_BOTTOM:     '#87ceeb',
        HILL_COLOR:     '#5cc052',
        HILL_DARK:      '#4aa040',
        CHECKER_A:      '#7a4f2c',
        CHECKER_B:      '#9a6f3c',
        GROUND_TOP:     '#5cc052',
        GROUND_MID:     '#4aa040',
        GROUND_DIRT:    '#8B6914',
        CLOUD_COLOR:    'rgba(255,255,255,0.85)',

        // Sonic
        SONIC_BLUE:     '#1d4ed8',
        SONIC_BLUE2:    '#2563eb',
        SONIC_BELLY:    '#fde68a',
        SONIC_SHOE:     '#dc2626',
        SONIC_SKIN:     '#fbbf24',

        // Anel
        RING_GOLD:      '#fbbf24',
        RING_LIGHT:     '#fde68a',

        // Fisica
        GRAVITY:        0.55,
        JUMP_VEL:       -14,
        INITIAL_SPEED:  5,
        MAX_SPEED:      13,
        ACCELERATION:   0.003,

        // Gameplay
        STUMBLE_DUR:    50,
        INVINCIBLE_FR:  90,
        CELEBRATE_EVERY: 10,
        RING_SPAWN_INT: 80,
    };

    var overlay, canvas, ctx;
    var W, H, GROUND_Y;
    var animFrame = null;
    var ac = null;

    var _jumpHandler = null;
    var _keyHandler  = null;
    var _resizeHandler = null;

    var state = {};

    // ---- Estado do jogo ----

    function initState() {
        GROUND_Y = H * 0.58;
        state = {
            t:          0,
            speed:      CONF.INITIAL_SPEED,
            rings:      0,
            bgOffset:   0,
            hillOffset: 0,

            // Sonic
            x:          W * 0.2,
            y:          GROUND_Y - 32,
            vy:         0,
            onGround:   true,
            stumble:    0,
            invincible: 0,

            // Objetos
            ringItems:      [],
            obstacles:      [],
            scattered:      [],
            confetti:       [],
            celebrating:    0,

            // Clouds
            clouds: [
                { x: W * 0.2, y: H * 0.1, w: 80, speed: 0.4 },
                { x: W * 0.55, y: H * 0.07, w: 110, speed: 0.3 },
                { x: W * 0.8, y: H * 0.13, w: 70, speed: 0.5 },
            ],
        };
    }

    // ---- Audio ----

    function ensureAC() {
        if (!ac) {
            try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
        }
        if (ac && ac.state === 'suspended') ac.resume();
    }

    function playTone(freq1, freq2, dur, type, vol) {
        if (!ac) return;
        var o = ac.createOscillator();
        var g = ac.createGain();
        o.connect(g); g.connect(ac.destination);
        o.type = type || 'sine';
        o.frequency.setValueAtTime(freq1, ac.currentTime);
        if (freq2) o.frequency.exponentialRampToValueAtTime(freq2, ac.currentTime + dur * 0.8);
        g.gain.setValueAtTime(vol || 0.18, ac.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
        o.start(ac.currentTime);
        o.stop(ac.currentTime + dur);
    }

    function playRingSound() {
        playTone(880, 1760, 0.25, 'sine', 0.2);
    }

    function playJumpSound() {
        playTone(380, 760, 0.18, 'square', 0.14);
    }

    function playHitSound() {
        if (!ac) return;
        var o = ac.createOscillator();
        var g = ac.createGain();
        o.connect(g); g.connect(ac.destination);
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(220, ac.currentTime);
        o.frequency.exponentialRampToValueAtTime(90, ac.currentTime + 0.35);
        g.gain.setValueAtTime(0.18, ac.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.4);
        o.start(); o.stop(ac.currentTime + 0.4);
    }

    function playCelebration() {
        if (!ac) return;
        [523, 659, 784, 1047].forEach(function (freq, i) {
            var o = ac.createOscillator();
            var g = ac.createGain();
            o.connect(g); g.connect(ac.destination);
            o.type = 'triangle';
            o.frequency.value = freq;
            var t0 = ac.currentTime + i * 0.09;
            g.gain.setValueAtTime(0.15, t0);
            g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.28);
            o.start(t0); o.stop(t0 + 0.3);
        });
    }

    // ---- Spawn ----

    function spawnRings() {
        var count = 2 + Math.floor(Math.random() * 4);
        var sx = W + 50;
        for (var i = 0; i < count; i++) {
            state.ringItems.push({
                x: sx + i * 32,
                y: GROUND_Y - 25 - Math.random() * 55,
                phase: Math.random() * Math.PI * 2,
            });
        }
    }

    function spawnObstacle() {
        var type = Math.random() < 0.5 ? 'spike' : 'crab';
        state.obstacles.push({ x: W + 60, y: GROUND_Y, type: type, t: 0 });
    }

    function spawnConfetti() {
        var colors = ['#fbbf24', '#f472b6', '#38bdf8', '#34d399', '#a855f7', '#fb923c'];
        for (var i = 0; i < 32; i++) {
            state.confetti.push({
                x: state.x,
                y: state.y - 20,
                vx: (Math.random() - 0.5) * 11,
                vy: -4 - Math.random() * 8,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: 4 + Math.random() * 4,
                life: 55 + Math.floor(Math.random() * 25),
            });
        }
    }

    // ---- Update ----

    function update() {
        state.t++;

        // Velocidade progressiva
        state.speed = Math.min(CONF.MAX_SPEED, CONF.INITIAL_SPEED + state.t * CONF.ACCELERATION);
        state.bgOffset += state.speed;
        state.hillOffset += state.speed * 0.35;

        // Fisica do Sonic
        state.vy += CONF.GRAVITY;
        state.y  += state.vy;
        state.onGround = false;
        if (state.y >= GROUND_Y - 32) {
            state.y = GROUND_Y - 32;
            state.vy = 0;
            state.onGround = true;
        }

        if (state.stumble    > 0) state.stumble--;
        if (state.invincible > 0) state.invincible--;

        // Spawn ritmico
        if (state.t % CONF.RING_SPAWN_INT === 0) spawnRings();
        var obstInt = Math.max(55, 140 - Math.floor(state.t * 0.04));
        if (state.t % obstInt === 0) spawnObstacle();

        // Nuvens
        state.clouds.forEach(function (c) {
            c.x -= c.speed;
            if (c.x < -150) c.x = W + 100;
        });

        // Aneis
        state.ringItems = state.ringItems.filter(function (r) {
            r.x -= state.speed;
            var dx = r.x - state.x;
            var dy = r.y - state.y;
            if (dx * dx + dy * dy < 28 * 28) {
                state.rings++;
                playRingSound();
                if (state.rings % CONF.CELEBRATE_EVERY === 0) {
                    state.celebrating = 70;
                    playCelebration();
                    spawnConfetti();
                }
                return false;
            }
            return r.x > -30;
        });

        // Obstaculos
        state.obstacles = state.obstacles.filter(function (o) {
            o.x -= state.speed;
            o.t++;
            if (state.invincible === 0) {
                var dx = Math.abs(o.x - state.x);
                var dy = Math.abs((o.y - 25) - state.y);
                if (dx < 22 && dy < 32) {
                    state.stumble    = CONF.STUMBLE_DUR;
                    state.invincible = CONF.INVINCIBLE_FR;
                    // Espalhar aneis
                    var lost = Math.min(state.rings, 3 + Math.floor(Math.random() * 5));
                    for (var i = 0; i < lost; i++) {
                        state.scattered.push({
                            x: state.x, y: state.y - 10,
                            vx: (Math.random() - 0.5) * 9,
                            vy: -5 - Math.random() * 7,
                            life: 55,
                        });
                    }
                    state.rings = Math.max(0, state.rings - lost);
                    playHitSound();
                }
            }
            return o.x > -80;
        });

        // Aneis espalhados
        state.scattered = state.scattered.filter(function (r) {
            r.x += r.vx - state.speed * 0.4;
            r.vy += 0.3;
            r.y  += r.vy;
            r.life--;
            return r.life > 0;
        });

        // Confetti
        if (state.celebrating > 0) state.celebrating--;
        state.confetti = state.confetti.filter(function (c) {
            c.x  += c.vx;
            c.y  += c.vy;
            c.vy += 0.2;
            c.life--;
            return c.life > 0;
        });
    }

    // ---- Desenho do fundo ----

    function drawBackground() {
        // Ceu
        var sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
        sky.addColorStop(0, CONF.SKY_TOP);
        sky.addColorStop(1, CONF.SKY_BOTTOM);
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, GROUND_Y);

        // Nuvens
        state.clouds.forEach(function (c) {
            drawCloud(c.x, c.y, c.w);
        });

        // Colinas (parallax lento)
        var hOff = state.hillOffset % (W * 0.6);
        ctx.fillStyle = CONF.HILL_DARK;
        for (var i = -1; i < 4; i++) {
            var hx = i * W * 0.6 - hOff + W * 0.3;
            ctx.beginPath();
            ctx.arc(hx, GROUND_Y + 50, 140, 0, Math.PI * 2);
            ctx.fill();
        }

        // Tabuleiro de xadrez (cliff face - GHZ)
        var sz  = 22;
        var off = state.bgOffset % (sz * 2);
        var rows = 3;
        for (var row = 0; row < rows; row++) {
            for (var col = -2; col < Math.ceil(W / sz) + 3; col++) {
                var cx2 = col * sz - off;
                var cy2 = GROUND_Y + row * sz;
                ctx.fillStyle = (col + row) % 2 === 0 ? CONF.CHECKER_B : CONF.CHECKER_A;
                ctx.fillRect(cx2, cy2, sz, sz);
            }
        }

        // Chao verde
        ctx.fillStyle = CONF.GROUND_TOP;
        ctx.fillRect(0, GROUND_Y - 12, W, 14);

        // Faixa escura
        ctx.fillStyle = CONF.GROUND_MID;
        ctx.fillRect(0, GROUND_Y + 2, W, 8);

        // Terra
        ctx.fillStyle = CONF.GROUND_DIRT;
        ctx.fillRect(0, GROUND_Y + 10, W, H - GROUND_Y - 10);
    }

    function drawCloud(x, y, w) {
        ctx.fillStyle = CONF.CLOUD_COLOR;
        ctx.beginPath();
        ctx.arc(x,          y,      w * 0.28, 0, Math.PI * 2);
        ctx.arc(x + w * 0.22, y - 8, w * 0.22, 0, Math.PI * 2);
        ctx.arc(x + w * 0.5,  y,     w * 0.26, 0, Math.PI * 2);
        ctx.arc(x + w * 0.75, y + 5, w * 0.20, 0, Math.PI * 2);
        ctx.fill();
    }

    // ---- Desenho do Sonic ----

    function drawSonic(x, y, t, stumble, onGround, vy, speed) {
        ctx.save();
        ctx.translate(x, y);

        // Piscar quando invincivel
        if (stumble > 0 && Math.floor(t / 4) % 2 === 0) {
            ctx.globalAlpha = 0.45;
        }

        var isJumping = !onGround;
        var lean = Math.min(speed / CONF.MAX_SPEED * 0.3, 0.28);
        ctx.rotate(lean);

        if (isJumping) {
            // Pose de pulo — bolinha enrolada
            drawSonicBall(t);
        } else {
            // Pose de corrida
            drawSonicRun(t);
        }

        ctx.restore();
    }

    function drawSonicBall(t) {
        var spin = (t * 0.35) % (Math.PI * 2);
        ctx.save();
        ctx.rotate(spin);

        // Corpo azul
        ctx.fillStyle = CONF.SONIC_BLUE;
        ctx.beginPath();
        ctx.arc(0, 0, 22, 0, Math.PI * 2);
        ctx.fill();

        // Barriga
        ctx.fillStyle = CONF.SONIC_BELLY;
        ctx.beginPath();
        ctx.ellipse(-3, 3, 11, 9, -0.2, 0, Math.PI * 2);
        ctx.fill();

        // Espinho visivel
        ctx.fillStyle = CONF.SONIC_BLUE;
        ctx.beginPath();
        ctx.moveTo(-20, -5);
        ctx.lineTo(-30, -14);
        ctx.lineTo(-14, -18);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    function drawSonicRun(t) {
        var leg = Math.sin(t * 0.3) * 10;

        // --- Sombra no chao ---
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.beginPath();
        ctx.ellipse(2, 32, 18, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // --- Pernas ---
        drawSonicLeg(ctx,  -6 + leg * 0.3,  18,  leg * 0.06);
        drawSonicLeg(ctx,   4 - leg * 0.3,  18, -leg * 0.06);

        // --- Tenis ---
        drawShoe(ctx, -6 + leg * 0.5, 30);
        drawShoe(ctx,  6 - leg * 0.5, 30);

        // --- Corpo ---
        ctx.fillStyle = CONF.SONIC_BLUE;
        ctx.beginPath();
        ctx.ellipse(1, 3, 14, 19, 0, 0, Math.PI * 2);
        ctx.fill();

        // Barriga
        ctx.fillStyle = CONF.SONIC_BELLY;
        ctx.beginPath();
        ctx.ellipse(4, 7, 8, 13, 0.15, 0, Math.PI * 2);
        ctx.fill();

        // --- Espinhos (3) ---
        ctx.fillStyle = CONF.SONIC_BLUE;
        drawSpike(ctx, -4,  -12, -2.2, 22, 8);
        drawSpike(ctx, -9,  -5,  -2.0, 18, 7);
        drawSpike(ctx, -11,  3,  -1.8, 15, 6);

        // --- Cabeca ---
        ctx.fillStyle = CONF.SONIC_BLUE;
        ctx.beginPath();
        ctx.arc(4, -14, 18, 0, Math.PI * 2);
        ctx.fill();

        // Cara (area mais clara)
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.ellipse(9, -13, 11, 13, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Olho
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(13, -16, 8, 7, 0.1, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath();
        ctx.arc(15, -15, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // Brilho olho
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(17, -17, 2, 0, Math.PI * 2);
        ctx.fill();

        // Nariz
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath();
        ctx.arc(20, -10, 2, 0, Math.PI * 2);
        ctx.fill();

        // Boca (expressao determinada)
        ctx.strokeStyle = '#1a1a2e';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(14, -6);
        ctx.quadraticCurveTo(18, -4, 22, -7);
        ctx.stroke();

        // Braco
        ctx.strokeStyle = CONF.SONIC_BLUE;
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        ctx.beginPath();
        var armSwing = Math.sin(t * 0.3 + Math.PI) * 7;
        ctx.moveTo(2, -2);
        ctx.lineTo(12 + armSwing, 8);
        ctx.stroke();

        // Luva branca
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(12 + armSwing, 8, 5, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawSpike(ctx, bx, by, angle, length, width) {
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(-width / 2, 0);
        ctx.lineTo(0, -length);
        ctx.lineTo(width / 2, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    function drawSonicLeg(ctx, x, y, angle) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.fillStyle = CONF.SONIC_BLUE;
        ctx.beginPath();
        ctx.ellipse(0, 0, 5, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function drawShoe(ctx, x, y) {
        // Sola preta
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.ellipse(x, y + 2, 13, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        // Tenis vermelho
        ctx.fillStyle = CONF.SONIC_SHOE;
        ctx.beginPath();
        ctx.ellipse(x, y - 1, 13, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        // Faixa branca
        ctx.fillStyle = '#fff';
        ctx.fillRect(x - 11, y - 2, 22, 3);
        // Brilho
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.ellipse(x - 3, y - 4, 5, 2, -0.2, 0, Math.PI * 2);
        ctx.fill();
    }

    // ---- Desenho do anel ----

    function drawRing(x, y, phase, t) {
        ctx.save();
        ctx.translate(x, y);
        // Efeito 3D de rotacao
        var scaleX = Math.abs(Math.cos((t + phase) * 0.06)) * 0.55 + 0.45;
        ctx.scale(scaleX, 1);

        ctx.strokeStyle = CONF.RING_GOLD;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = CONF.RING_LIGHT;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(-2, -2, 5, Math.PI * 1.3, Math.PI * 2.1);
        ctx.stroke();

        ctx.restore();
    }

    // ---- Desenho dos obstaculos ----

    function drawObstacle(o) {
        ctx.save();
        ctx.translate(o.x, o.y);

        if (o.type === 'spike') {
            // Ferroes metalicos
            ctx.fillStyle = '#94a3b8';
            for (var i = -1; i <= 1; i++) {
                ctx.beginPath();
                ctx.moveTo(i * 16,      0);
                ctx.lineTo(i * 16 + 8, -32);
                ctx.lineTo(i * 16 + 16, 0);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = '#cbd5e1';
                ctx.beginPath();
                ctx.moveTo(i * 16 + 4, 0);
                ctx.lineTo(i * 16 + 8, -26);
                ctx.lineTo(i * 16 + 6, 0);
                ctx.fill();
                ctx.fillStyle = '#94a3b8';
            }
        } else {
            // Caranguejo inimigo (Crabmeat)
            var bob = Math.sin(o.t * 0.12) * 4;

            // Corpo
            ctx.fillStyle = '#dc2626';
            ctx.beginPath();
            ctx.ellipse(0, -22 + bob, 22, 14, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.ellipse(0, -24 + bob, 15, 9, 0, 0, Math.PI * 2);
            ctx.fill();

            // Garras
            ctx.fillStyle = '#dc2626';
            ctx.beginPath();
            ctx.ellipse(-30, -20 + bob, 11, 8, 0.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(30, -20 + bob, 11, 8, -0.4, 0, Math.PI * 2);
            ctx.fill();
            // Pingas das garras
            ctx.fillStyle = '#b91c1c';
            ctx.beginPath();
            ctx.moveTo(-37, -16 + bob);
            ctx.lineTo(-42, -10 + bob);
            ctx.lineTo(-36, -12 + bob);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(37, -16 + bob);
            ctx.lineTo(42, -10 + bob);
            ctx.lineTo(36, -12 + bob);
            ctx.fill();

            // Olhos
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(-8, -27 + bob, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(8, -27 + bob, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#1a1a1a';
            ctx.beginPath();
            ctx.arc(-7, -27 + bob, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(9, -27 + bob, 3, 0, Math.PI * 2);
            ctx.fill();

            // Pernas
            ctx.strokeStyle = '#b91c1c';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            for (var l = -2; l <= 2; l++) {
                var legPhase = Math.sin(o.t * 0.15 + l) * 5;
                ctx.beginPath();
                ctx.moveTo(l * 8, -10 + bob);
                ctx.lineTo(l * 9 + legPhase, 0);
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    // ---- HUD ----

    function drawHUD() {
        // Painel de aneis (canto superior direito)
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.beginPath();
        ctx.arc(W - 110, 38, 28, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(W - 82, 10, 72, 56);
        ctx.beginPath();
        ctx.arc(W - 38, 38, 28, 0, Math.PI * 2);
        ctx.fill();

        // Icone de anel
        ctx.strokeStyle = CONF.RING_GOLD;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(W - 100, 38, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = CONF.RING_LIGHT;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(W - 102, 36, 5, Math.PI * 1.3, Math.PI * 2.1);
        ctx.stroke();

        // Numero
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 22px "Russo One", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(state.rings, W - 82, 45);

        // Velocidade (pontinhos)
        var speedPct = (state.speed - CONF.INITIAL_SPEED) / (CONF.MAX_SPEED - CONF.INITIAL_SPEED);
        var dots = Math.round(speedPct * 5);
        ctx.textAlign = 'left';
        for (var i = 0; i < 5; i++) {
            ctx.fillStyle = i < dots ? '#38bdf8' : 'rgba(255,255,255,0.2)';
            ctx.beginPath();
            ctx.arc(16 + i * 15, 30, 5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawCelebration() {
        var alpha = Math.min(1, state.celebrating / 30);
        ctx.save();
        ctx.globalAlpha = alpha;

        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, H / 2 - 65, W, 80);

        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold clamp(20px, 6vw, 36px) "Russo One", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(state.rings + ' aneis!', W / 2, H / 2 - 20);

        ctx.restore();
    }

    // ---- Render principal ----

    function draw() {
        ctx.clearRect(0, 0, W, H);

        drawBackground();

        // Aneis do cenario
        state.ringItems.forEach(function (r) {
            drawRing(r.x, r.y, r.phase, state.t);
        });

        // Aneis espalhados (apos colisao)
        state.scattered.forEach(function (r) {
            ctx.globalAlpha = r.life / 55;
            drawRing(r.x, r.y, 0, state.t);
            ctx.globalAlpha = 1;
        });

        // Obstaculos
        state.obstacles.forEach(drawObstacle);

        // Sonic
        drawSonic(state.x, state.y, state.t, state.stumble, state.onGround, state.vy, state.speed);

        // Confetti
        state.confetti.forEach(function (c) {
            ctx.fillStyle = c.color;
            ctx.globalAlpha = c.life / 70;
            ctx.fillRect(c.x - c.size / 2, c.y - c.size / 2, c.size, c.size);
        });
        ctx.globalAlpha = 1;

        drawHUD();

        if (state.celebrating > 0) drawCelebration();
    }

    // ---- Loop principal ----

    function gameLoop() {
        update();
        draw();
        animFrame = requestAnimationFrame(gameLoop);
    }

    // ---- Input ----

    function jump() {
        if (state.onGround) {
            state.vy = CONF.JUMP_VEL;
            state.onGround = false;
            ensureAC();
            playJumpSound();
        }
    }

    function setupInput() {
        _jumpHandler = function (e) {
            e.preventDefault();
            jump();
        };
        canvas.addEventListener('click',      _jumpHandler);
        canvas.addEventListener('touchstart', _jumpHandler, { passive: false });

        _keyHandler = function (e) {
            if (e.key === ' ' || e.key === 'ArrowUp') {
                e.preventDefault();
                jump();
            }
            if (e.key === 'Escape') {
                window.SonicGame.fechar();
            }
        };
        window.addEventListener('keydown', _keyHandler);

        _resizeHandler = function () {
            W = window.innerWidth;
            H = window.innerHeight;
            GROUND_Y = H * 0.58;
            canvas.width  = W;
            canvas.height = H;
            state.x = W * 0.2;
            if (state.y > GROUND_Y - 32) state.y = GROUND_Y - 32;
        };
        window.addEventListener('resize', _resizeHandler);
    }

    function removeInput() {
        if (_jumpHandler && canvas) {
            canvas.removeEventListener('click',      _jumpHandler);
            canvas.removeEventListener('touchstart', _jumpHandler);
        }
        if (_keyHandler)   window.removeEventListener('keydown', _keyHandler);
        if (_resizeHandler) window.removeEventListener('resize',  _resizeHandler);
        _jumpHandler = _keyHandler = _resizeHandler = null;
    }

    // ---- API publica ----

    window.SonicGame = {
        abrir: function () {
            // Overlay fullscreen
            overlay = document.createElement('div');
            overlay.id = 'sonic-overlay';
            overlay.style.cssText = 'position:fixed;inset:0;z-index:9000;background:#000;';

            canvas = document.createElement('canvas');
            W = window.innerWidth;
            H = window.innerHeight;
            canvas.width  = W;
            canvas.height = H;
            canvas.style.cssText = 'display:block;touch-action:none;';
            overlay.appendChild(canvas);

            // Botao voltar
            var backBtn = document.createElement('button');
            backBtn.style.cssText = [
                'position:fixed', 'top:16px', 'left:16px', 'z-index:9100',
                'background:rgba(0,0,0,0.5)', 'border:1px solid rgba(255,255,255,0.2)',
                'color:#fff', 'border-radius:50%', 'width:44px', 'height:44px',
                'cursor:pointer', 'display:flex', 'align-items:center', 'justify-content:center',
                '-webkit-tap-highlight-color:transparent',
            ].join(';');
            backBtn.innerHTML = '<span class="material-icons" style="font-size:22px;">arrow_back</span>';
            backBtn.addEventListener('click', function () { window.SonicGame.fechar(); });
            overlay.appendChild(backBtn);

            document.body.appendChild(overlay);

            ctx = canvas.getContext('2d');

            // Audio
            try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}

            // Estado
            initState();

            setupInput();
            gameLoop();
        },

        fechar: function () {
            if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
            removeInput();
            if (ac) { ac.close().catch(function () {}); ac = null; }
            if (overlay) { overlay.remove(); overlay = null; canvas = null; ctx = null; }
        }
    };

})();
