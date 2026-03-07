// =====================================================================
// perf-detect.js — Deteccao de performance para dispositivos lentos
// =====================================================================
// Detecta dispositivos low-end (ex: Galaxy Tab A 2016) e expoe
// window._PERF com flags de qualidade para os jogos ajustarem efeitos.
// Deve ser carregado ANTES dos jogos.
// =====================================================================

(function () {
    'use strict';

    var low = false;

    // 1. deviceMemory API (Chrome 63+): <= 2GB = low-end
    if (navigator.deviceMemory && navigator.deviceMemory <= 2) {
        low = true;
    }

    // 2. Cores logicos: <= 4 com tela pequena = provavel low-end
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) {
        // Heuristica: poucos cores + tela de tablet barato (<=1280 largura)
        if (Math.max(screen.width, screen.height) <= 1280) {
            low = true;
        }
    }

    // 3. User-agent heuristics para dispositivos Android antigos
    var ua = navigator.userAgent || '';
    if (/Android\s[4-7]\./i.test(ua)) {
        low = true;
    }

    // 4. Canvas benchmark rapido: medir tempo de shadowBlur draws
    // Apenas se ainda nao detectado, para nao gastar tempo
    if (!low) {
        try {
            var tc = document.createElement('canvas');
            tc.width = 200;
            tc.height = 200;
            var tctx = tc.getContext('2d');
            var start = performance.now();
            for (var i = 0; i < 50; i++) {
                tctx.shadowColor = 'rgba(255,0,0,0.5)';
                tctx.shadowBlur = 20;
                tctx.fillStyle = '#ff0000';
                tctx.beginPath();
                tctx.arc(100, 100, 30, 0, Math.PI * 2);
                tctx.fill();
            }
            var elapsed = performance.now() - start;
            // Se 50 draws com shadow levam mais de 30ms, GPU eh fraca
            if (elapsed > 30) {
                low = true;
            }
        } catch (e) {
            // Se falhar, assumir low-end por precaucao
            low = true;
        }
    }

    // Expor configuracoes de qualidade globais
    window._PERF = {
        low: low,
        // Shadows: desligar em low-end (maior ganho de GPU)
        shadow: !low,
        shadowBlur: low ? 0 : 1,
        // Gradientes: usar cores solidas em low-end
        gradients: !low,
        // Grid decorativa: simplificar em low-end
        gridStep: low ? 84 : 42,
        // Particulas: reduzir quantidade em low-end
        particleScale: low ? 0.4 : 1,
        // Splash: reduzir complexidade
        splashParticles: low ? 12 : 35,
        // CSS: adicionar classe ao body para desligar animacoes pesadas
    };

    // Adicionar classe CSS para desligar animacoes caras
    if (low) {
        document.documentElement.classList.add('low-perf');
    }

})();
