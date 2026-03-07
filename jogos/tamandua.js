// =====================================================================
// tamandua.js — Jogo Tamandua Runner Standalone v1.0
// =====================================================================
// Runner automatico com tamandua procedural usando IK esqueletica
// Pernas com auto-stepping (tecnologia do reptil.js)
// Toque para pular, colete formigas, sem game over
// =====================================================================

(function () {
    'use strict';

    // ---- Configuracao ----
    var CONF = {
        BG: '#050a14',
        SKY_TOP: '#0a0a2e',
        SKY_BOTTOM: '#0f1a3a',
        GROUND_COLOR: '#1a3a1a',
        GRASS_COLOR: '#2d5a2d',
        GRID: '#0a1628',

        // Tamandua cores
        BODY: '#8B4513',
        BODY_LIGHT: '#D2691E',
        BODY_DARK: '#5C3317',
        SNOUT: '#DEB887',
        TAIL: '#654321',
        EYE: '#0f172a',
        EYE_GLOW: '#DEB887',
        STROKE: '#D2691E',
        GLOW: 'rgba(210,105,30,0.4)',
        LINE_W: 2.5,
        HEAD_R: 5,

        // Fisica
        RUN_SPEED: 3,
        MAX_SPEED: 7,
        SPEED_INCREASE: 0.0008,
        GRAVITY: 0.55,
        JUMP_FORCE: -11,

        // Gameplay
        ANT_INTERVAL_MIN: 60,
        ANT_INTERVAL_MAX: 150,
        OBSTACLE_INTERVAL_MIN: 180,
        OBSTACLE_INTERVAL_MAX: 350,
        CELEBRATE_EVERY: 10,
        STUMBLE_DURATION: 40,
        STUMBLE_SPEED_LOSS: 0.5,
        INVINCIBLE_AFTER_STUMBLE: 60,

        // Formigas
        ANT_COLOR: '#cc3333',
        ANT_COLOR_DARK: '#8b1a1a',
        ANT_SIZE: 5,

        // Obstaculos
        OBS_COLORS: ['#4a3728', '#3d5a3d', '#5a4a3a'],

        // Parallax
        MOUNTAIN_COLOR: '#0d1a30',
        TREE_COLOR: '#0a2a15',
        TREE_LIGHT: '#0f3a1f',
    };

    // ---- Classes IK (baseadas no reptil.js) ----

    function Segment(parent, size, angle, range, stiffness) {
        this.parent = parent;
        if (parent.children) parent.children.push(this);
        this.children = [];
        this.size = size;
        this.relAngle = angle;
        this.defAngle = angle;
        this.absAngle = parent.absAngle + angle;
        this.range = range;
        this.stiffness = stiffness;
        this.x = 0;
        this.y = 0;
        this.updateRelative(false, true);
    }

    Segment.prototype.updateRelative = function (iter, flex) {
        this.relAngle = this.relAngle -
            2 * Math.PI * Math.floor((this.relAngle - this.defAngle) / (2 * Math.PI) + 0.5);

        if (flex) {
            this.relAngle = Math.min(
                this.defAngle + this.range / 2,
                Math.max(
                    this.defAngle - this.range / 2,
                    (this.relAngle - this.defAngle) / this.stiffness + this.defAngle
                )
            );
        }

        this.absAngle = this.parent.absAngle + this.relAngle;
        this.x = this.parent.x + Math.cos(this.absAngle) * this.size;
        this.y = this.parent.y + Math.sin(this.absAngle) * this.size;

        if (iter) {
            for (var i = 0; i < this.children.length; i++) {
                this.children[i].updateRelative(iter, flex);
            }
        }
    };

    Segment.prototype.draw = function (ctx, iter) {
        ctx.beginPath();
        ctx.moveTo(this.parent.x, this.parent.y);
        ctx.lineTo(this.x, this.y);
        ctx.stroke();

        if (iter) {
            for (var i = 0; i < this.children.length; i++) {
                this.children[i].draw(ctx, true);
            }
        }
    };

    Segment.prototype.follow = function (iter) {
        var x = this.parent.x;
        var y = this.parent.y;
        var dist = Math.sqrt((this.x - x) * (this.x - x) + (this.y - y) * (this.y - y));
        if (dist > 0) {
            this.x = x + this.size * (this.x - x) / dist;
            this.y = y + this.size * (this.y - y) / dist;
        }
        this.absAngle = Math.atan2(this.y - y, this.x - x);
        this.relAngle = this.absAngle - this.parent.absAngle;
        this.updateRelative(false, true);

        if (iter) {
            for (var i = 0; i < this.children.length; i++) {
                this.children[i].follow(true);
            }
        }
    };

    // Sistema de membros (IK chain)
    function LimbSystem(end, length, speed, creature) {
        this.end = end;
        this.length = Math.max(1, length);
        this.creature = creature;
        this.speed = speed;
        creature.systems.push(this);
        this.nodes = [];
        var node = end;
        for (var i = 0; i < length; i++) {
            this.nodes.unshift(node);
            node = node.parent;
            if (!node.children) {
                this.length = i + 1;
                break;
            }
        }
        this.hip = this.nodes[0].parent;
    }

    LimbSystem.prototype.moveTo = function (x, y) {
        this.nodes[0].updateRelative(true, true);
        var dist = Math.sqrt((x - this.end.x) * (x - this.end.x) + (y - this.end.y) * (y - this.end.y));
        var len = Math.max(0, dist - this.speed);

        for (var i = this.nodes.length - 1; i >= 0; i--) {
            var node = this.nodes[i];
            var ang = Math.atan2(node.y - y, node.x - x);
            node.x = x + len * Math.cos(ang);
            node.y = y + len * Math.sin(ang);
            x = node.x;
            y = node.y;
            len = node.size;
        }

        for (var i = 0; i < this.nodes.length; i++) {
            var node = this.nodes[i];
            node.absAngle = Math.atan2(node.y - node.parent.y, node.x - node.parent.x);
            node.relAngle = node.absAngle - node.parent.absAngle;
            for (var ii = 0; ii < node.children.length; ii++) {
                var child = node.children[ii];
                if (this.nodes.indexOf(child) === -1) {
                    child.updateRelative(true, false);
                }
            }
        }
    };

    // Sistema de pernas com auto-stepping (adaptado para runner)
    function LegSystem(end, length, speed, creature, groundYFn) {
        LimbSystem.call(this, end, length, speed, creature);
        this.goalX = end.x;
        this.goalY = end.y;
        this.step = 0;
        this.forwardness = 0;
        this.groundYFn = groundYFn;

        this.reach = 0.9 * Math.sqrt(
            (this.end.x - this.hip.x) * (this.end.x - this.hip.x) +
            (this.end.y - this.hip.y) * (this.end.y - this.hip.y)
        );

        var relAngle = this.creature.absAngle -
            Math.atan2(this.end.y - this.hip.y, this.end.x - this.hip.x);
        relAngle -= 2 * Math.PI * Math.floor(relAngle / (2 * Math.PI) + 0.5);
        this.swing = -relAngle + (2 * (relAngle < 0 ? 1 : 0) - 1) * Math.PI / 2;
        this.swingOffset = this.creature.absAngle - this.hip.absAngle;
    }

    LegSystem.prototype = Object.create(LimbSystem.prototype);
    LegSystem.prototype.constructor = LegSystem;

    LegSystem.prototype.update = function () {
        this.moveTo(this.goalX, this.goalY);

        // Chao dinamico
        var gY = this.groundYFn ? this.groundYFn() : 9999;

        if (this.step === 0) {
            var dist = Math.sqrt(
                (this.end.x - this.goalX) * (this.end.x - this.goalX) +
                (this.end.y - this.goalY) * (this.end.y - this.goalY)
            );
            if (dist > 1) {
                this.step = 1;
                var newX = this.hip.x +
                    this.reach * Math.cos(this.swing + this.hip.absAngle + this.swingOffset) +
                    (2 * Math.random() - 1) * this.reach / 2;
                var newY = this.hip.y +
                    this.reach * Math.sin(this.swing + this.hip.absAngle + this.swingOffset) +
                    (2 * Math.random() - 1) * this.reach / 2;
                // Pernas tocam o chao
                this.goalX = newX;
                this.goalY = Math.min(newY, gY);
            }
        } else if (this.step === 1) {
            var theta = Math.atan2(this.end.y - this.hip.y, this.end.x - this.hip.x) - this.hip.absAngle;
            var d = Math.sqrt(
                (this.end.x - this.hip.x) * (this.end.x - this.hip.x) +
                (this.end.y - this.hip.y) * (this.end.y - this.hip.y)
            );
            var f2 = d * Math.cos(theta);
            var dF = this.forwardness - f2;
            this.forwardness = f2;
            if (dF * dF < 1) {
                this.step = 0;
                this.goalX = this.hip.x + (this.end.x - this.hip.x);
                this.goalY = Math.min(this.hip.y + (this.end.y - this.hip.y), gY);
            }
        }
    };

    // Criatura (adaptada para runner horizontal)
    function RunnerCreature(x, y) {
        this.x = x;
        this.y = y;
        this.baseY = y;
        this.absAngle = 0; // Sempre voltado para direita
        this.children = [];
        this.systems = [];
        this.speed = 0;
        this.vy = 0;
        this.onGround = true;
    }

    RunnerCreature.prototype.update = function (runSpeed, groundY) {
        // Gravidade
        this.vy += CONF.GRAVITY;
        this.y += this.vy;

        // Colisao com chao
        if (this.y >= groundY) {
            this.y = groundY;
            this.vy = 0;
            this.onGround = true;
        }

        this.speed = runSpeed;

        // Segmentos seguem (angulo invertido para corpo/cauda)
        this.absAngle = Math.PI; // corpo vai para tras
        for (var i = 0; i < this.children.length; i++) {
            this.children[i].follow(true);
        }
        for (var i = 0; i < this.systems.length; i++) {
            this.systems[i].update();
        }
        this.absAngle = 0; // restaurar
    };

    RunnerCreature.prototype.jump = function () {
        if (!this.onGround) return false;
        this.vy = CONF.JUMP_FORCE;
        this.onGround = false;
        return true;
    };

    RunnerCreature.prototype.draw = function (ctx) {
        // Desenhar todos os segmentos filhos
        for (var i = 0; i < this.children.length; i++) {
            this.children[i].draw(ctx, true);
        }
    };

    // ---- Montar tamandua procedural ----

    function buildTamandua(x, y, scale, groundYFn) {
        var s = scale;
        var critter = new RunnerCreature(x, y);

        // ---- Focinho (para frente, segmentos finos afinando) ----
        var snout = critter;
        for (var i = 0; i < 5; i++) {
            snout = new Segment(snout, s * 4, 0, Math.PI / 8, 3.5);
        }

        // ---- Corpo (para tras, segmentos grossos) ----
        // O corpo usa absAngle invertido (PI) durante follow
        var body = critter;
        var bodySegs = [];
        for (var i = 0; i < 5; i++) {
            body = new Segment(body, s * 5, 0, Math.PI / 6, 2.5);
            bodySegs.push(body);
            // Costelas laterais para volume
            for (var side = -1; side <= 1; side += 2) {
                var rib = new Segment(body, s * 3, side * Math.PI / 2, 0.15, 2);
                new Segment(rib, s * 2, -side * 0.2, 0.1, 2);
            }
        }

        // ---- Pernas (2 pares) ----
        var legAttach = [bodySegs[0], bodySegs[3]]; // dianteiras e traseiras
        for (var p = 0; p < legAttach.length; p++) {
            for (var side = -1; side <= 1; side += 2) {
                var hip = new Segment(legAttach[p], s * 10, side * 0.785, 0, 8);
                var humerus = new Segment(hip, s * 12, -side * 0.785, Math.PI * 2, 1);
                var forearm = new Segment(humerus, s * 12, side * Math.PI / 2, Math.PI, 2);

                // Garras
                for (var f = 0; f < 3; f++) {
                    new Segment(forearm, s * 3, (f / 2 - 0.5) * Math.PI / 3, 0.1, 4);
                }

                new LegSystem(forearm, 3, s * 10, critter, groundYFn);
            }
        }

        // ---- Cauda peluda (grande e vistosa) ----
        for (var i = 0; i < 8; i++) {
            var tailStiff = 1.2 + (i / 8) * 0.6;
            body = new Segment(body, s * 4, 0, Math.PI / 3, tailStiff);
            // Pelos laterais (mais largos no meio, afinando)
            var hairLen = s * (4 + Math.sin(i / 7 * Math.PI) * 5);
            for (var side = -1; side <= 1; side += 2) {
                var hair = new Segment(body, hairLen, side * (0.6 + Math.random() * 0.4), 0.2, 1.5);
                new Segment(hair, hairLen * 0.6, -side * 0.3, 0.15, 2);
            }
        }

        return critter;
    }

    // ---- Sistema de Som ----

    function SomTamandua() {
        this.audioCtx = null;
        this.lastStepTime = 0;
    }

    SomTamandua.prototype.init = function () {
        try {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            this.audioCtx = null;
        }
    };

    SomTamandua.prototype._tocar = function (freq, dur, type, vol, freqEnd) {
        if (!this.audioCtx) return;
        var ctx = this.audioCtx;
        if (ctx.state === 'suspended') ctx.resume();

        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = type || 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        if (freqEnd) {
            osc.frequency.linearRampToValueAtTime(freqEnd, ctx.currentTime + dur);
        }
        gain.gain.setValueAtTime(vol || 0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + dur);
    };

    SomTamandua.prototype.pulo = function () {
        this._tocar(220, 0.12, 'sine', 0.1, 550);
    };

    SomTamandua.prototype.comerFormiga = function () {
        this._tocar(800, 0.06, 'square', 0.06, 1200);
    };

    SomTamandua.prototype.tropecar = function () {
        this._tocar(350, 0.18, 'triangle', 0.08, 150);
    };

    SomTamandua.prototype.celebrar = function () {
        var self = this;
        var notas = [523, 587, 659, 784, 880];
        for (var i = 0; i < notas.length; i++) {
            (function (idx) {
                setTimeout(function () {
                    self._tocar(notas[idx], 0.15, 'sine', 0.08);
                }, idx * 100);
            })(i);
        }
    };

    SomTamandua.prototype.passo = function (vel) {
        if (!this.audioCtx || vel < 1) return;
        var now = Date.now();
        if (now - this.lastStepTime < 120) return;
        this.lastStepTime = now;

        var ctx = this.audioCtx;
        if (ctx.state === 'suspended') ctx.resume();

        var duration = 0.03 + Math.random() * 0.02;
        var bufferSize = Math.floor(ctx.sampleRate * duration);
        var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        var data = buffer.getChannelData(0);
        var b0 = 0, b1 = 0;
        for (var i = 0; i < bufferSize; i++) {
            var white = Math.random() * 2 - 1;
            b0 = 0.99765 * b0 + white * 0.0990460;
            b1 = 0.96300 * b1 + white * 0.2965164;
            data[i] = (b0 + b1) * 0.06;
        }

        var source = ctx.createBufferSource();
        source.buffer = buffer;
        var filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 600 + vel * 100;
        var gain = ctx.createGain();
        gain.gain.setValueAtTime(Math.min(0.08, vel * 0.015), ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        source.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        source.start();
        source.stop(ctx.currentTime + duration);
    };

    SomTamandua.prototype.fechar = function () {
        if (this.audioCtx) {
            this.audioCtx.close().catch(function () {});
            this.audioCtx = null;
        }
    };

    // ---- Game Object ----

    var TamanduaGame = {
        canvas: null,
        ctx: null,
        animFrame: null,
        som: null,
        _onKey: null,
        _onResize: null,
        _timeouts: [],

        // Estado
        critter: null,
        groundY: 0,
        tamanduaX: 0,
        scrollX: 0,
        speed: CONF.RUN_SPEED,
        score: 0,
        stumbleTimer: 0,
        invincibleTimer: 0,
        frameCount: 0,
        celebrateTimer: 0,
        lastCelebrate: 0,

        // Entidades
        ants: [],
        obstacles: [],
        particles: [],
        scenery: [],

        // Timers de spawn
        antTimer: 0,
        obstacleTimer: 0,
        antNextIn: 0,
        obsNextIn: 0,

        abrir: function () {
            var self = this;
            var W = window.innerWidth;
            var H = window.innerHeight;

            // Reset estado
            self.score = 0;
            self.speed = CONF.RUN_SPEED;
            self.scrollX = 0;
            self.stumbleTimer = 0;
            self.invincibleTimer = 0;
            self.frameCount = 0;
            self.celebrateTimer = 0;
            self.lastCelebrate = 0;
            self.ants = [];
            self.obstacles = [];
            self.particles = [];
            self.antTimer = 0;
            self.obstacleTimer = 0;
            self.antNextIn = CONF.ANT_INTERVAL_MIN;
            self.obsNextIn = CONF.OBSTACLE_INTERVAL_MAX;
            self._timeouts = [];

            // Posicoes
            self.groundY = H * 0.75;
            self.tamanduaX = W * 0.25;

            // Montar tamandua
            var groundYFn = function () { return self.groundY; };
            self.critter = buildTamandua(self.tamanduaX, self.groundY, 3, groundYFn);

            // Gerar cenario inicial
            self.scenery = [];
            for (var i = 0; i < 8; i++) {
                self.scenery.push({
                    type: Math.random() < 0.4 ? 'mountain' : 'tree',
                    x: Math.random() * W * 2,
                    h: 40 + Math.random() * 80,
                    w: 30 + Math.random() * 60,
                    layer: Math.random() < 0.4 ? 0 : 1, // 0=distante, 1=medio
                });
            }

            // Som
            self.som = new SomTamandua();
            self.som.init();

            // Overlay
            var overlay = document.createElement('div');
            overlay.id = 'tamandua-overlay';
            overlay.style.cssText = [
                'position:fixed',
                'inset:0',
                'background:' + CONF.BG,
                'z-index:9999',
                'overflow:hidden',
            ].join(';');

            // Canvas
            var canvas = document.createElement('canvas');
            canvas.width = W;
            canvas.height = H;
            canvas.style.cssText = 'display:block;';
            self.canvas = canvas;
            self.ctx = canvas.getContext('2d');

            // Botao fechar
            var closeBtn = document.createElement('button');
            closeBtn.style.cssText = [
                'position:absolute',
                'top:20px',
                'right:20px',
                'background:#0f172a',
                'border:1px solid #3a2a1a',
                'color:#8B6914',
                'border-radius:50%',
                'width:44px',
                'height:44px',
                'cursor:pointer',
                'display:flex',
                'align-items:center',
                'justify-content:center',
                'z-index:10',
                'transition:all 0.2s',
            ].join(';');
            closeBtn.innerHTML = '<span class="material-icons" style="font-size:20px;">close</span>';
            closeBtn.addEventListener('click', function () {
                window.fecharJoguinhos ? window.fecharJoguinhos() : self.fechar();
            });

            // Score
            var scoreEl = document.createElement('div');
            scoreEl.id = 'tamandua-score';
            scoreEl.style.cssText = [
                'position:absolute',
                'top:20px',
                'left:20px',
                'font-family:"Russo One",sans-serif',
                'font-size:clamp(1.2rem,4vw,1.8rem)',
                'color:#fde047',
                'text-shadow:0 0 15px rgba(253,224,71,0.5)',
                'display:flex',
                'align-items:center',
                'gap:8px',
                'z-index:10',
                'pointer-events:none',
                'user-select:none',
            ].join(';');
            scoreEl.innerHTML = '<span class="material-icons" style="font-size:1.3em;color:#cc3333;">bug_report</span><span id="tamandua-score-num">0</span>';

            // Label instrucao
            var label = document.createElement('div');
            label.style.cssText = [
                'position:absolute',
                'bottom:28px',
                'left:50%',
                'transform:translateX(-50%)',
                'font-family:Inter,-apple-system,sans-serif',
                'font-size:0.85rem',
                'color:#5C3317',
                'white-space:nowrap',
                'pointer-events:none',
                'transition:opacity 1.5s',
                'user-select:none',
            ].join(';');
            label.textContent = 'Toque para pular';

            overlay.appendChild(canvas);
            overlay.appendChild(closeBtn);
            overlay.appendChild(scoreEl);
            overlay.appendChild(label);
            document.body.appendChild(overlay);

            self._timeouts.push(setTimeout(function () { label.style.opacity = '0'; }, 3500));

            // Toque/clique para pular (tela inteira)
            overlay.addEventListener('click', function (e) {
                if (closeBtn.contains(e.target)) return;
                self._pular();
            });
            overlay.addEventListener('touchstart', function (e) {
                if (closeBtn.contains(e.target)) return;
                e.preventDefault();
                self._pular();
            }, { passive: false });

            // Teclado
            self._onKey = function (e) {
                if (e.key === 'Escape') {
                    window.fecharJoguinhos ? window.fecharJoguinhos() : self.fechar();
                    return;
                }
                if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') {
                    e.preventDefault();
                    self._pular();
                }
            };
            document.addEventListener('keydown', self._onKey);

            // Resize
            self._onResize = function () {
                if (self.canvas) {
                    self.canvas.width = window.innerWidth;
                    self.canvas.height = window.innerHeight;
                    self.groundY = window.innerHeight * 0.75;
                }
            };
            window.addEventListener('resize', self._onResize);

            // Game loop
            function loop() {
                if (!self.ctx) return;
                self._atualizar();
                self._renderizar();
                self.animFrame = requestAnimationFrame(loop);
            }
            loop();
        },

        fechar: function () {
            if (this.animFrame) {
                cancelAnimationFrame(this.animFrame);
                this.animFrame = null;
            }
            if (this._onKey) {
                document.removeEventListener('keydown', this._onKey);
                this._onKey = null;
            }
            if (this._onResize) {
                window.removeEventListener('resize', this._onResize);
                this._onResize = null;
            }
            this._timeouts.forEach(clearTimeout);
            this._timeouts = [];
            if (this.som) {
                this.som.fechar();
                this.som = null;
            }
            var overlay = document.getElementById('tamandua-overlay');
            if (overlay) overlay.remove();
            this.ctx = null;
            this.canvas = null;
            this.critter = null;
            this.ants = [];
            this.obstacles = [];
            this.particles = [];
            this.scenery = [];
        },

        _pular: function () {
            if (!this.critter) return;
            if (this.critter.jump()) {
                if (this.som) this.som.pulo();
            }
        },

        _atualizar: function () {
            var self = this;
            var W = this.canvas.width;
            self.frameCount++;

            // Velocidade progressiva
            self.speed = Math.min(CONF.MAX_SPEED, self.speed + CONF.SPEED_INCREASE);

            // Stumble = reduz velocidade
            var effectiveSpeed = self.speed;
            if (self.stumbleTimer > 0) {
                self.stumbleTimer--;
                effectiveSpeed *= CONF.STUMBLE_SPEED_LOSS;
            }
            if (self.invincibleTimer > 0) self.invincibleTimer--;

            self.scrollX += effectiveSpeed;

            // Atualizar tamandua IK
            self.critter.x = self.tamanduaX;
            self.critter.update(effectiveSpeed, self.groundY);

            // Som de passos
            if (self.critter.onGround && self.som) {
                self.som.passo(effectiveSpeed);
            }

            // ---- Spawn formigas ----
            self.antTimer++;
            if (self.antTimer >= self.antNextIn) {
                self.antTimer = 0;
                self.antNextIn = CONF.ANT_INTERVAL_MIN +
                    Math.floor(Math.random() * (CONF.ANT_INTERVAL_MAX - CONF.ANT_INTERVAL_MIN));
                // Formiga no chao ou um pouco acima
                var antY = self.groundY - 5 - Math.random() * 30;
                self.ants.push({
                    x: W + 20,
                    y: antY,
                    frame: 0,
                    wiggle: Math.random() * Math.PI * 2,
                });
            }

            // ---- Spawn obstaculos ----
            self.obstacleTimer++;
            if (self.obstacleTimer >= self.obsNextIn) {
                self.obstacleTimer = 0;
                self.obsNextIn = CONF.OBSTACLE_INTERVAL_MIN +
                    Math.floor(Math.random() * (CONF.OBSTACLE_INTERVAL_MAX - CONF.OBSTACLE_INTERVAL_MIN));
                var types = ['log', 'rock', 'anthill'];
                var type = types[Math.floor(Math.random() * types.length)];
                var obsW, obsH;
                if (type === 'log') { obsW = 40 + Math.random() * 20; obsH = 20 + Math.random() * 10; }
                else if (type === 'rock') { obsW = 25 + Math.random() * 15; obsH = 25 + Math.random() * 15; }
                else { obsW = 30 + Math.random() * 10; obsH = 35 + Math.random() * 15; }
                self.obstacles.push({
                    x: W + 30,
                    y: self.groundY - obsH,
                    w: obsW,
                    h: obsH,
                    type: type,
                    color: CONF.OBS_COLORS[Math.floor(Math.random() * CONF.OBS_COLORS.length)],
                });
            }

            // ---- Mover entidades ----
            for (var i = 0; i < self.ants.length; i++) {
                self.ants[i].x -= effectiveSpeed;
                self.ants[i].frame++;
                self.ants[i].wiggle += 0.15;
            }
            for (var i = 0; i < self.obstacles.length; i++) {
                self.obstacles[i].x -= effectiveSpeed;
            }

            // ---- Colisoes ----
            var cx = self.critter.x;
            var cy = self.critter.y;

            // Comer formigas (perto do focinho ou corpo)
            for (var i = self.ants.length - 1; i >= 0; i--) {
                var a = self.ants[i];
                var dx = cx - a.x;
                var dy = cy - a.y;
                if (dx * dx + dy * dy < 50 * 50) {
                    self.ants.splice(i, 1);
                    self.score++;
                    self._atualizarScore();
                    if (self.som) self.som.comerFormiga();
                    // Particulas de comer
                    for (var p = 0; p < 5; p++) {
                        self.particles.push({
                            x: a.x, y: a.y,
                            vx: (Math.random() - 0.5) * 4,
                            vy: -(Math.random() * 3 + 1),
                            life: 1,
                            decay: 0.03 + Math.random() * 0.02,
                            color: CONF.ANT_COLOR,
                            size: 2 + Math.random() * 2,
                        });
                    }
                    // Celebracao?
                    if (self.score % CONF.CELEBRATE_EVERY === 0 && self.score > self.lastCelebrate) {
                        self.lastCelebrate = self.score;
                        self._celebrar();
                    }
                }
            }

            // Obstaculos
            if (self.invincibleTimer <= 0) {
                for (var i = 0; i < self.obstacles.length; i++) {
                    var o = self.obstacles[i];
                    // AABB simples com o corpo do tamandua
                    if (cx > o.x - 15 && cx < o.x + o.w + 15 &&
                        cy > o.y && cy < o.y + o.h + 10) {
                        self.stumbleTimer = CONF.STUMBLE_DURATION;
                        self.invincibleTimer = CONF.INVINCIBLE_AFTER_STUMBLE;
                        if (self.som) self.som.tropecar();
                        // Particulas de impacto
                        for (var p = 0; p < 8; p++) {
                            self.particles.push({
                                x: o.x, y: o.y + o.h / 2,
                                vx: (Math.random() - 0.5) * 6,
                                vy: -(Math.random() * 4 + 1),
                                life: 1,
                                decay: 0.025,
                                color: '#fde047',
                                size: 3 + Math.random() * 3,
                            });
                        }
                        break;
                    }
                }
            }

            // ---- Remover fora da tela ----
            self.ants = self.ants.filter(function (a) { return a.x > -30; });
            self.obstacles = self.obstacles.filter(function (o) { return o.x + o.w > -30; });

            // ---- Particulas ----
            self.particles = self.particles.filter(function (p) {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.12;
                p.vx *= 0.95;
                p.life -= p.decay;
                return p.life > 0;
            });

            // ---- Cenario parallax ----
            for (var i = 0; i < self.scenery.length; i++) {
                var sc = self.scenery[i];
                var parallax = sc.layer === 0 ? 0.2 : 0.5;
                sc.x -= effectiveSpeed * parallax;
                if (sc.x + sc.w < -50) {
                    sc.x = W + 50 + Math.random() * 200;
                    sc.h = 40 + Math.random() * 80;
                    sc.w = 30 + Math.random() * 60;
                }
            }

            // Celebracao timer
            if (self.celebrateTimer > 0) self.celebrateTimer--;
        },

        _renderizar: function () {
            var ctx = this.ctx;
            var W = this.canvas.width;
            var H = this.canvas.height;

            // Ceu gradiente
            var skyGrad = ctx.createLinearGradient(0, 0, 0, this.groundY);
            skyGrad.addColorStop(0, CONF.SKY_TOP);
            skyGrad.addColorStop(1, CONF.SKY_BOTTOM);
            ctx.fillStyle = skyGrad;
            ctx.fillRect(0, 0, W, this.groundY);

            // Estrelas sutis
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            var starSeed = 42;
            for (var i = 0; i < 30; i++) {
                starSeed = (starSeed * 9301 + 49297) % 233280;
                var sx = (starSeed / 233280) * W;
                starSeed = (starSeed * 9301 + 49297) % 233280;
                var sy = (starSeed / 233280) * this.groundY * 0.6;
                var twinkle = 0.3 + 0.7 * Math.abs(Math.sin(this.frameCount * 0.02 + i));
                ctx.globalAlpha = twinkle * 0.3;
                ctx.beginPath();
                ctx.arc(sx, sy, 1, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;

            // Cenario parallax (camada distante)
            for (var i = 0; i < this.scenery.length; i++) {
                var sc = this.scenery[i];
                if (sc.layer !== 0) continue;
                ctx.fillStyle = CONF.MOUNTAIN_COLOR;
                ctx.beginPath();
                ctx.moveTo(sc.x - sc.w / 2, this.groundY);
                ctx.lineTo(sc.x, this.groundY - sc.h);
                ctx.lineTo(sc.x + sc.w / 2, this.groundY);
                ctx.fill();
            }

            // Cenario parallax (camada media - arvores)
            for (var i = 0; i < this.scenery.length; i++) {
                var sc = this.scenery[i];
                if (sc.layer !== 1) continue;
                ctx.fillStyle = CONF.TREE_COLOR;
                // Tronco
                ctx.fillRect(sc.x - 3, this.groundY - sc.h * 0.4, 6, sc.h * 0.4);
                // Copa
                ctx.fillStyle = CONF.TREE_LIGHT;
                ctx.beginPath();
                ctx.arc(sc.x, this.groundY - sc.h * 0.5, sc.w / 3, 0, Math.PI * 2);
                ctx.fill();
            }

            // Chao
            ctx.fillStyle = CONF.GROUND_COLOR;
            ctx.fillRect(0, this.groundY, W, H - this.groundY);

            // Grama (linhas no topo do chao)
            ctx.strokeStyle = CONF.GRASS_COLOR;
            ctx.lineWidth = 1.5;
            for (var gx = 0; gx < W; gx += 12) {
                var offset = ((gx + this.scrollX * 0.3) % 24) - 12;
                ctx.beginPath();
                ctx.moveTo(gx + offset, this.groundY);
                ctx.lineTo(gx + offset - 3, this.groundY - 6 - Math.random() * 4);
                ctx.stroke();
            }

            // Grid sutil no chao
            ctx.fillStyle = CONF.GRID;
            for (var gx = 0; gx < W; gx += 42) {
                for (var gy = this.groundY + 20; gy < H; gy += 42) {
                    ctx.beginPath();
                    ctx.arc(gx, gy, 0.8, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // Obstaculos
            for (var i = 0; i < this.obstacles.length; i++) {
                var o = this.obstacles[i];
                ctx.fillStyle = o.color;
                ctx.shadowColor = 'rgba(0,0,0,0.3)';
                ctx.shadowBlur = 4;
                if (o.type === 'anthill') {
                    // Formigueiro: triangulo
                    ctx.beginPath();
                    ctx.moveTo(o.x, o.y + o.h);
                    ctx.lineTo(o.x + o.w / 2, o.y);
                    ctx.lineTo(o.x + o.w, o.y + o.h);
                    ctx.fill();
                    // Buraco
                    ctx.fillStyle = '#1a1a1a';
                    ctx.beginPath();
                    ctx.arc(o.x + o.w / 2, o.y + o.h * 0.7, o.w * 0.12, 0, Math.PI * 2);
                    ctx.fill();
                } else if (o.type === 'rock') {
                    // Pedra: elipse
                    ctx.beginPath();
                    ctx.ellipse(o.x + o.w / 2, o.y + o.h / 2, o.w / 2, o.h / 2, 0, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    // Tronco: retangulo arredondado
                    ctx.beginPath();
                    var r = 5;
                    ctx.moveTo(o.x + r, o.y);
                    ctx.lineTo(o.x + o.w - r, o.y);
                    ctx.quadraticCurveTo(o.x + o.w, o.y, o.x + o.w, o.y + r);
                    ctx.lineTo(o.x + o.w, o.y + o.h - r);
                    ctx.quadraticCurveTo(o.x + o.w, o.y + o.h, o.x + o.w - r, o.y + o.h);
                    ctx.lineTo(o.x + r, o.y + o.h);
                    ctx.quadraticCurveTo(o.x, o.y + o.h, o.x, o.y + o.h - r);
                    ctx.lineTo(o.x, o.y + r);
                    ctx.quadraticCurveTo(o.x, o.y, o.x + r, o.y);
                    ctx.fill();
                    // Listras no tronco
                    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
                    ctx.lineWidth = 1;
                    for (var lx = o.x + 8; lx < o.x + o.w - 5; lx += 8) {
                        ctx.beginPath();
                        ctx.moveTo(lx, o.y + 2);
                        ctx.lineTo(lx, o.y + o.h - 2);
                        ctx.stroke();
                    }
                }
                ctx.shadowBlur = 0;
            }

            // Formigas
            for (var i = 0; i < this.ants.length; i++) {
                var a = this.ants[i];
                var wigX = Math.sin(a.wiggle) * 2;
                var wigY = Math.cos(a.wiggle * 1.3) * 1;
                var ax = a.x + wigX;
                var ay = a.y + wigY;

                // Corpo (3 segmentos)
                ctx.fillStyle = CONF.ANT_COLOR;
                ctx.beginPath();
                ctx.arc(ax, ay, CONF.ANT_SIZE, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(ax - CONF.ANT_SIZE * 1.5, ay, CONF.ANT_SIZE * 0.8, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(ax + CONF.ANT_SIZE * 1.3, ay, CONF.ANT_SIZE * 0.6, 0, Math.PI * 2);
                ctx.fill();

                // Pernas (3 pares)
                ctx.strokeStyle = CONF.ANT_COLOR_DARK;
                ctx.lineWidth = 1;
                for (var leg = -1; leg <= 1; leg++) {
                    for (var side = -1; side <= 1; side += 2) {
                        ctx.beginPath();
                        ctx.moveTo(ax + leg * CONF.ANT_SIZE, ay);
                        ctx.lineTo(ax + leg * CONF.ANT_SIZE + side * 5,
                            ay + side * 4 + Math.sin(a.frame * 0.3 + leg) * 2);
                        ctx.stroke();
                    }
                }

                // Antenas
                ctx.strokeStyle = CONF.ANT_COLOR_DARK;
                for (var side = -1; side <= 1; side += 2) {
                    ctx.beginPath();
                    ctx.moveTo(ax + CONF.ANT_SIZE * 1.3, ay);
                    ctx.lineTo(ax + CONF.ANT_SIZE * 2.2, ay + side * 4);
                    ctx.stroke();
                }
            }

            // Tamandua (IK)
            this._desenharTamandua(ctx);

            // Particulas
            for (var i = 0; i < this.particles.length; i++) {
                var p = this.particles[i];
                ctx.globalAlpha = p.life;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;

            // Flash de tropeco
            if (this.stumbleTimer > 0) {
                ctx.fillStyle = 'rgba(255,200,50,' + (0.15 * (this.stumbleTimer / CONF.STUMBLE_DURATION)) + ')';
                ctx.fillRect(0, 0, W, H);
            }

            // Celebracao
            if (this.celebrateTimer > 0) {
                var alpha = Math.min(1, this.celebrateTimer / 30);
                ctx.globalAlpha = alpha;
                ctx.fillStyle = '#fde047';
                ctx.font = 'bold clamp(2rem,8vw,4rem) "Russo One",sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.shadowColor = '#fde047';
                ctx.shadowBlur = 30;
                ctx.fillText('Parabens!', W / 2, H * 0.35);
                ctx.font = 'clamp(1rem,4vw,1.8rem) "Russo One",sans-serif';
                ctx.fillStyle = '#D2691E';
                ctx.shadowColor = '#D2691E';
                ctx.shadowBlur = 15;
                ctx.fillText(this.score + ' formigas!', W / 2, H * 0.35 + 50);
                ctx.shadowBlur = 0;
                ctx.globalAlpha = 1;
            }
        },

        _desenharTamandua: function (ctx) {
            if (!this.critter) return;

            // Estilo: tracos quentes com glow
            ctx.strokeStyle = CONF.STROKE;
            ctx.lineWidth = CONF.LINE_W;
            ctx.lineCap = 'round';
            ctx.shadowColor = CONF.GLOW;
            ctx.shadowBlur = 5;

            // Piscar durante invencibilidade
            if (this.invincibleTimer > 0 && this.frameCount % 6 < 3) {
                ctx.globalAlpha = 0.4;
            }

            // Desenhar esqueleto IK
            this.critter.draw(ctx);

            // Cabeca (circulo direcional)
            var r = CONF.HEAD_R;
            var cx = this.critter.x;
            var cy = this.critter.y;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.stroke();

            // Olho
            ctx.fillStyle = CONF.EYE_GLOW;
            ctx.beginPath();
            ctx.arc(cx + r * 0.3, cy - r * 0.3, 2, 0, Math.PI * 2);
            ctx.fill();

            // Nariz (ponta do focinho)
            ctx.fillStyle = CONF.BODY_DARK;
            ctx.beginPath();
            // Encontrar o ultimo segmento do focinho (primeiro filho direto da creature, mais distante)
            var tip = this.critter;
            if (tip.children && tip.children.length > 0) {
                var snoutEnd = tip.children[0]; // primeiro ramo = focinho
                while (snoutEnd.children && snoutEnd.children.length > 0) {
                    snoutEnd = snoutEnd.children[0];
                }
                ctx.arc(snoutEnd.x, snoutEnd.y, 2.5, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
        },

        _atualizarScore: function () {
            var el = document.getElementById('tamandua-score-num');
            if (el) {
                el.textContent = this.score;
                // Animacao de pulse
                var scoreDiv = document.getElementById('tamandua-score');
                if (scoreDiv) {
                    scoreDiv.style.transform = 'scale(1.3)';
                    var self = this;
                    self._timeouts.push(setTimeout(function () {
                        if (scoreDiv) scoreDiv.style.transform = 'scale(1)';
                    }, 150));
                }
            }
        },

        _celebrar: function () {
            this.celebrateTimer = 90; // ~1.5s
            if (this.som) this.som.celebrar();

            // Confetti
            var W = this.canvas.width;
            var H = this.canvas.height;
            var cores = ['#fde047', '#f472b6', '#38bdf8', '#34d399', '#fb923c', '#818cf8'];
            for (var i = 0; i < 25; i++) {
                this.particles.push({
                    x: W / 2 + (Math.random() - 0.5) * W * 0.4,
                    y: H * 0.3,
                    vx: (Math.random() - 0.5) * 8,
                    vy: -(Math.random() * 5 + 2),
                    life: 1,
                    decay: 0.01 + Math.random() * 0.01,
                    color: cores[Math.floor(Math.random() * cores.length)],
                    size: 3 + Math.random() * 4,
                });
            }
        },
    };

    window.TamanduaGame = TamanduaGame;
})();
