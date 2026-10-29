/**
 * SGE CORE v1 — peças comuns a todos os sistemas do SGE
 *
 * Uso (depois do supabase-js e do sso_client.js, se o sistema usar):
 *   <script src="https://grupogps-mecanizada.github.io/sge-core/v1/sge-core.js"></script>
 *
 * O que oferece (em window.SGECore, e também em window.SGE sem apagar o que o sistema já tem):
 *   SGE.cliente(url?, chave?)  → UMA conexão Supabase por projeto (sem repetir createClient)
 *   SGE.aviso(texto, tipo)     → mensagem rápida na tela (sucesso | erro | alerta | info)
 *   SGE.erro(e, contexto)      → traduz o erro técnico em mensagem simples e mostra
 *   SGE.carregando(sim, texto) → tela de "carregando" (logo enchendo)
 *   SGE.logoCarregando()       → só a logo enchendo, para pôr em qualquer lugar
 *   SGE.seguro(fn, opcoes)     → roda uma ação com "carregando" + tratamento de erro
 *   SGE.rascunho               → guarda o que foi digitado (não perde com internet ruim)
 *   SGE.formatar               → data, data e hora, número e moeda no padrão brasileiro
 *   SGE.logo(variante)         → endereço do logo oficial
 *   SGE.acesso                 → login único da Central + permissões do sistema (v1.1):
 *                                await SGE.acesso.entrar('slug_do_sistema')
 *   SGE.barra / SGE.icone        → barra de topo universal e ícones (v1.2): arquivos sge-barra.js e sge-icones.js
 *
 * Sistemas que ainda usam sso_client.js + sge-session-ping.js continuam iguais:
 * o SGE.acesso só age quando o sistema chama SGE.acesso.entrar().
 */
(function () {
    'use strict';

    if (window.SGECore) return; // já carregado

    const VERSAO = '1.2.0';

    // A Central fica no mesmo endereço em que o sistema está aberto (portal ou github.io),
    // para a sessão do Supabase ser a mesma. Testes locais usam SGE_CENTRAL_URL_OVERRIDE.
    function _centralPadrao() {
        if (window.SGE_CENTRAL_URL_OVERRIDE) return window.SGE_CENTRAL_URL_OVERRIDE;
        const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
        if (/^https?:$/.test(location.protocol) && !local) return location.origin + '/SGE-CENTRAL';
        return 'https://grupogps-mecanizada.github.io/SGE-CENTRAL';
    }

    // Projeto da Central (login e permissões). A chave é a PÚBLICA (anon): pode ficar no navegador.
    const ACESSO = {
        url: 'https://mgcjidryrjqiceielmzp.supabase.co',
        chave: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nY2ppZHJ5cmpxaWNlaWVsbXpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMjEwNzEsImV4cCI6MjA4NzY5NzA3MX0.UAKkzy5fMIkrlmnqz9E9KknUw9xhoYpa3f1ptRpOuAA',
        central: _centralPadrao(),
        reconferirMs: 5 * 60 * 1000,
        ausenteMs: 30 * 1000,
    };
    // Descobre o próprio endereço (funciona com qualquer nome de repositório ou cópia local).
    const _src = (document.currentScript && document.currentScript.src) || '';
    const BASE = _src ? _src.replace(/\/[^/]*$/, '') : 'https://grupogps-mecanizada.github.io/sge-core/v1';

    // ── Conexão Supabase (uma por projeto) ──────────────────
    const _clientes = {};

    function cliente(url, chave, opcoes) {
        // Sem parâmetros: usa o mesmo projeto do login (sso_client.js), se estiver na página.
        if (!url && typeof SGE_SSO_API !== 'undefined') url = SGE_SSO_API;     // eslint-disable-line no-undef
        if (!chave && typeof SGE_SSO_KEY !== 'undefined') chave = SGE_SSO_KEY; // eslint-disable-line no-undef
        // Sem sso_client na página: usa o projeto da Central (o mesmo do SGE.acesso).
        if (!url && !chave) { url = ACESSO.url; chave = ACESSO.chave; }

        if (!url || !chave) throw new Error('SGE.cliente: informe o endereço e a chave pública do Supabase.');
        if (!window.supabase || !window.supabase.createClient) {
            throw new Error('SGE.cliente: carregue o supabase-js antes do sge-core.');
        }
        if (_eChaveSecreta(chave)) {
            console.error('[SGE] PERIGO: chave secreta (service_role) no navegador. Troque pela chave pública.');
            throw new Error('Chave secreta não pode ser usada no navegador.');
        }
        if (!_clientes[url]) _clientes[url] = window.supabase.createClient(url, chave, opcoes);
        return _clientes[url];
    }

    // Lê o "papel" de dentro da chave JWT (sem validar), só para barrar a service_role.
    function _eChaveSecreta(chave) {
        if (typeof chave !== 'string') return false;
        if (chave.indexOf('sb_secret_') === 0) return true;
        try {
            const corpo = JSON.parse(atob(chave.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
            return corpo.role === 'service_role';
        } catch (_) {
            return false;
        }
    }

    // ── Avisos ──────────────────────────────────────────────
    let _caixaAvisos = null;

    function aviso(texto, tipo, duracaoMs) {
        tipo = tipo || 'info';
        if (!_caixaAvisos || !document.body.contains(_caixaAvisos)) {
            _caixaAvisos = document.createElement('div');
            _caixaAvisos.className = 'sge-avisos';
            _caixaAvisos.setAttribute('role', 'status');
            _caixaAvisos.setAttribute('aria-live', 'polite');
            document.body.appendChild(_caixaAvisos);
        }
        const item = document.createElement('div');
        item.className = 'sge-aviso sge-aviso--' + tipo;
        const msg = document.createElement('span');
        msg.textContent = String(texto); // textContent: nunca interpreta HTML
        const fechar = document.createElement('button');
        fechar.type = 'button';
        fechar.setAttribute('aria-label', 'Fechar aviso');
        fechar.textContent = '×';
        fechar.onclick = () => item.remove();
        item.append(msg, fechar);
        _caixaAvisos.appendChild(item);

        const tempo = duracaoMs || (tipo === 'erro' ? 7000 : 4000);
        setTimeout(() => item.remove(), tempo);
        return item;
    }

    // ── Erros em linguagem simples ──────────────────────────
    function _traduzir(e) {
        const msg = String((e && (e.message || e.error_description || e.msg)) || e || '');
        const codigo = e && (e.code || e.status);

        if (!navigator.onLine) return 'Sem internet. Confira a conexão e tente de novo.';
        if (/Failed to fetch|NetworkError|Load failed|ERR_NETWORK/i.test(msg)) return 'Não consegui falar com o servidor. Tente de novo em instantes.';
        if (/timeout|timed out|57014/i.test(msg) || codigo === '57014') return 'O servidor demorou para responder. Tente de novo.';
        if (/JWT expired|invalid JWT|401/i.test(msg) || codigo === 401 || codigo === 'PGRST301') return 'Sua sessão expirou. Entre de novo.';
        if (/permission denied|row-level security|42501/i.test(msg) || codigo === '42501') return 'Você não tem permissão para fazer isso.';
        if (/duplicate key|23505/i.test(msg) || codigo === '23505') return 'Esse registro já existe.';
        if (/violates foreign key|23503/i.test(msg) || codigo === '23503') return 'Esse registro está ligado a outro e não pode ser alterado assim.';
        if (/not-null|23502/i.test(msg) || codigo === '23502') return 'Falta preencher um campo obrigatório.';
        if (codigo === 406 || codigo === 'PGRST116') return 'Registro não encontrado.';
        return 'Algo deu errado. Tente de novo. Se continuar, avise o suporte do SGE.';
    }

    function erro(e, contexto) {
        console.error('[SGE]' + (contexto ? ' ' + contexto + ':' : ''), e);
        const texto = _traduzir(e);
        aviso(texto, 'erro');
        return texto;
    }

    // ── Logo enchendo (carregando) ──────────────────────────
    // Contorno da logo oficial (favicon) em curvas lisas, redesenhado do logo-sge-azul.png de 2400 px.
    const _LOGO_D = 'M264.0 383.8C267.6 382.9 274.3 381.6 278.9 381.0C291.8 379.2 308.2 374.8 323.1 369.0C351.4 357.9 362.2 350.8 385.3 328.0C416.6 297.4 441.9 259.5 449.5 232.0C451.0 226.8 454.6 215.1 457.5 206.0C460.4 196.9 465.1 181.2 468.0 171.0C476.8 139.2 480.4 130.7 492.1 112.9C500.2 100.7 519.2 81.6 531.4 73.6C548.3 62.5 560.7 57.3 584.5 51.3C594.8 48.7 596.8 48.5 617.5 48.5C635.0 48.5 641.2 48.9 647.9 50.3C673.2 55.8 694.2 66.3 718.5 85.6C737.4 100.7 751.0 100.8 758.5 86.1C761.0 81.2 760.1 72.5 756.4 66.2C752.9 60.2 735.1 42.5 727.1 37.1C719.9 32.1 696.1 20.1 686.7 16.5C676.1 12.5 657.4 8.0 646.5 6.9C640.4 6.2 625.8 6.0 609.0 6.3C577.1 6.9 577.7 6.8 541.5 18.6C516.2 26.9 515.4 27.3 502.6 36.8C486.3 49.1 453.4 90.2 442.5 111.9C438.1 120.6 430.4 143.4 423.5 167.5C410.0 215.3 397.8 243.4 381.2 265.5C371.9 277.9 337.5 312.1 328.1 318.2C318.7 324.3 304.7 331.1 292.6 335.3L283.5 338.5 L154.5 339.0C59.8 339.4 24.6 339.9 22.2 340.7C12.1 344.3 5.8 350.9 4.5 359.5C2.4 372.6 12.8 382.6 31.0 385.0C34.0 385.4 86.2 385.7 147.0 385.6C244.5 385.4 258.3 385.2 264.0 383.8ZM644.0 381.9C668.2 377.9 684.6 372.6 708.0 360.9C722.7 353.5 727.3 350.6 737.0 342.7C760.2 323.7 779.2 300.0 791.6 274.5C796.5 264.3 799.4 256.5 805.1 237.1C807.7 228.5 810.3 224.4 814.9 221.3C819.9 217.9 823.9 217.6 842.0 218.8C854.5 219.7 860.6 219.7 867.0 218.9C872.7 218.1 912.5 217.5 989.0 217.1L1102.5 216.4 L1114.5 213.3C1132.0 208.7 1142.6 204.6 1150.2 199.4C1160.0 192.7 1179.5 172.1 1184.8 162.8C1190.4 152.9 1195.6 138.3 1196.9 128.6C1198.3 118.8 1198.3 98.5 1197.0 90.0C1194.0 71.2 1184.0 52.3 1168.1 35.7C1156.0 23.0 1144.7 15.9 1128.5 10.7C1116.7 7.0 1117.0 7.0 1096.5 6.0C1086.0 5.5 1073.7 4.4 1069.0 3.6C1057.6 1.5 1043.2 1.6 1029.1 3.9C1022.7 5.0 1011.2 6.1 1003.5 6.4C991.9 6.8 986.9 7.6 975.0 10.6C967.0 12.6 957.2 15.5 953.0 17.2C934.2 24.6 909.0 40.0 891.3 54.9C876.9 66.9 850.3 105.8 841.5 127.6C834.1 145.8 840.8 158.0 858.1 158.0C866.2 158.0 873.5 154.6 878.4 148.7C880.3 146.4 884.6 138.9 888.0 132.0C896.8 114.4 900.4 109.4 916.4 93.2C936.8 72.4 950.0 64.3 979.2 54.6C999.4 47.9 1001.1 47.8 1056.0 48.2C1097.4 48.6 1105.3 48.9 1110.3 50.3C1122.8 53.9 1133.5 61.0 1140.7 70.5C1146.2 77.7 1152.3 90.4 1154.0 98.1C1155.8 106.2 1154.9 122.0 1152.2 129.4C1145.9 146.8 1130.2 163.2 1115.2 168.2L1108.5 170.4 L1010.0 170.8C936.3 171.1 906.2 170.8 890.5 169.8C864.2 168.2 848.5 168.2 825.0 169.8C812.4 170.6 777.4 171.0 716.0 171.0C620.0 171.0 620.8 171.0 611.5 175.8C604.2 179.5 600.0 186.2 600.0 194.0C600.0 203.7 606.3 211.4 617.4 215.3C619.4 216.0 642.9 216.6 683.5 216.9C745.4 217.5 746.6 217.5 751.2 219.7C756.7 222.2 759.0 225.9 759.0 232.3C759.0 240.5 750.6 260.7 741.3 275.0C735.5 283.8 712.5 307.2 704.2 312.8C690.0 322.4 667.1 333.0 653.0 336.7C643.8 339.0 642.5 339.1 616.5 338.7C590.1 338.3 589.2 338.3 577.5 335.2C563.1 331.4 542.2 321.5 528.5 311.8C510.6 299.3 491.8 277.4 481.8 257.7C477.2 248.5 474.0 244.0 470.8 242.4C464.2 239.0 457.5 244.1 450.7 257.9C447.0 265.4 446.5 267.1 446.5 273.4C446.5 279.9 446.9 281.2 450.8 288.4C458.1 301.8 465.8 311.9 480.0 326.4C504.5 351.4 520.8 361.5 556.2 373.4C568.1 377.4 598.6 384.2 609.5 385.3C615.8 386.0 624.0 385.1 644.0 381.9ZM1181.4 383.1C1191.4 379.1 1197.0 371.4 1197.0 361.9C1197.0 356.4 1192.7 348.5 1188.2 345.5C1178.9 339.4 1182.9 339.6 1084.0 339.0C1002.4 338.5 992.9 338.2 987.5 336.7C978.2 334.0 971.8 331.3 955.0 322.9C938.1 314.5 924.7 306.0 915.8 298.1C905.4 288.7 893.9 271.5 885.6 252.9C877.8 235.5 871.6 230.0 858.6 229.3C852.6 228.9 850.8 229.2 847.0 231.2C834.6 237.6 835.1 248.8 849.1 278.0C858.3 297.1 868.3 311.4 882.5 325.6C897.6 340.8 914.6 352.8 936.7 363.8C952.4 371.7 988.2 381.3 1015.3 385.0C1018.7 385.4 1056.2 385.7 1098.5 385.6L1175.5 385.5 L1181.4 383.1ZM345.2 290.0C350.3 288.5 356.8 281.0 362.1 270.3C366.5 261.6 366.5 261.4 366.5 251.0C366.4 239.4 364.7 233.8 357.9 222.4C353.3 214.7 338.5 199.3 328.8 192.0C314.8 181.5 306.2 178.0 282.0 173.4L268.5 170.9 L183.0 171.1C117.1 171.2 96.4 171.0 92.5 170.0C73.3 165.2 56.8 149.8 48.7 129.1C41.4 110.5 45.4 88.6 59.5 70.4C65.2 63.1 70.5 58.8 79.4 54.3C92.5 47.7 81.4 48.0 278.5 48.0C430.6 48.0 458.5 47.7 464.3 46.5C473.2 44.6 483.4 39.7 494.3 31.9C508.9 21.5 512.7 15.7 508.1 11.1C503.4 6.4 510.1 6.5 291.0 6.5L84.5 6.5 L75.6 9.3C56.6 15.2 45.0 22.1 32.9 34.6C24.5 43.3 20.4 49.2 14.1 61.8C0.1 89.8 -1.5 118.4 9.2 149.0C14.5 164.1 20.4 172.5 36.8 188.0C42.8 193.8 50.2 200.0 53.3 201.9C60.1 205.9 72.1 210.1 86.8 213.7L97.5 216.4 L188.5 217.0C268.7 217.6 280.1 217.8 285.0 219.3C298.3 223.3 311.4 232.2 318.1 242.0C323.0 249.0 327.6 261.6 329.6 273.4C331.3 283.4 333.3 287.8 337.1 289.7C340.0 291.2 340.5 291.3 345.2 290.0Z';
    const _LOGO_L = 1200, _LOGO_A = 388, _ONDA = 300, _CICLO = 4.2;
    const _VAZIO = _LOGO_A + 30, _CHEIO = -20;
    const _NS = 'http://www.w3.org/2000/svg';
    const _ondas = (() => {
        let d = 'M' + (-2 * _ONDA) + ' 0';
        for (let x = -2 * _ONDA; x < _LOGO_L + 2 * _ONDA; x += _ONDA) d += ' Q' + (x + _ONDA / 4) + ' -14 ' + (x + _ONDA / 2) + ' 0 T' + (x + _ONDA) + ' 0';
        return d + ' V' + (_LOGO_A + 80) + ' H' + (-2 * _ONDA) + ' Z';
    })();
    const _vivas = new Set();
    let _quadro = 0, _ultimo = 0, _seq = 0;

    function _el(nome, attrs) {
        const e = document.createElementNS(_NS, nome);
        Object.keys(attrs || {}).forEach((k) => e.setAttribute(k, attrs[k]));
        return e;
    }

    // Um só relógio para todas as logos da página (~30 quadros por segundo).
    // Roda mesmo com as animações do Windows desligadas: é o aviso de "carregando", lento e suave.
    function _animar(ms) {
        _quadro = 0;
        _vivas.forEach((v) => { if (!v.svg.isConnected) _vivas.delete(v); });
        if (!_vivas.size) return;
        _quadro = requestAnimationFrame(_animar);
        if (ms - _ultimo < 33) return;
        _ultimo = ms;
        const s = ms / 1000, f = (s % _CICLO) / _CICLO;
        const x = f < 0.5 ? f * 2 : 2 - f * 2;
        const y = _VAZIO - (0.5 - 0.5 * Math.cos(Math.PI * x)) * (_VAZIO - _CHEIO);
        _vivas.forEach((v) => {
            v.nivel.setAttribute('transform', 'translate(0 ' + y.toFixed(1) + ')');
            v.o1.setAttribute('transform', 'translate(' + ((s * 200) % _ONDA).toFixed(1) + ' 0)');
            v.o2.setAttribute('transform', 'translate(' + (-(s * 130) % _ONDA).toFixed(1) + ' 0)');
        });
    }

    // Logo oficial só no contorno, enchendo e esvaziando de azul (aprovada pelo dono em 28/10/2026).
    // Devolve o <svg>; o tamanho vem do CSS (classe sge-logo-enchendo).
    function logoCarregando() {
        const id = 'sgelc' + (++_seq);
        const svg = _el('svg', { viewBox: '-10 -10 ' + (_LOGO_L + 20) + ' ' + (_LOGO_A + 20), class: 'sge-logo-enchendo', 'aria-hidden': 'true' });
        const defs = _el('defs');
        const clip = _el('clipPath', { id: id + 'c' });
        clip.appendChild(_el('path', { d: _LOGO_D, 'clip-rule': 'evenodd' }));
        const liq = _el('linearGradient', { id: id + 'l', x1: 0, y1: 0, x2: 0, y2: 1 });
        liq.append(_el('stop', { offset: 0, style: 'stop-color:var(--sge-logo-claro)' }), _el('stop', { offset: 1, style: 'stop-color:var(--sge-logo-escuro)' }));
        // contorno que esmaece nas pontas (logo "ofuscada", elegante)
        const borda = _el('linearGradient', { id: id + 'b', x1: 0, y1: 0, x2: 1, y2: 0 });
        borda.append(
            _el('stop', { offset: 0, style: 'stop-color:var(--sge-logo-escuro);stop-opacity:.25' }),
            _el('stop', { offset: 0.5, style: 'stop-color:var(--sge-logo-escuro);stop-opacity:.75' }),
            _el('stop', { offset: 1, style: 'stop-color:var(--sge-logo-escuro);stop-opacity:.25' }),
        );
        defs.append(clip, liq, borda);
        const g = _el('g', { 'clip-path': 'url(#' + id + 'c)' });
        const nivel = _el('g', { transform: 'translate(0 ' + _VAZIO + ')' });
        const o2 = _el('path', { d: _ondas, opacity: 0.35, style: 'fill:var(--sge-logo-claro)' });
        const o1 = _el('path', { d: _ondas, opacity: 0.85, fill: 'url(#' + id + 'l)' });
        nivel.append(o2, o1);
        g.appendChild(nivel);
        const contorno = _el('path', { d: _LOGO_D, fill: 'none', 'fill-rule': 'evenodd', stroke: 'url(#' + id + 'b)', 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke' });
        svg.append(defs, g, contorno);
        _vivas.add({ svg, nivel, o1, o2 });
        if (!_quadro && typeof requestAnimationFrame === 'function') _quadro = requestAnimationFrame(_animar);
        return svg;
    }

    // Qualquer elemento com data-sge-carregando ganha a logo enchendo sozinho
    // (ex.: <div data-sge-carregando="Carregando pendências…"></div>).
    function _preencherMarcados(raiz) {
        if (!raiz.querySelectorAll) return;
        const lista = raiz.matches && raiz.matches('[data-sge-carregando]') ? [raiz] : [];
        raiz.querySelectorAll('[data-sge-carregando]').forEach((e) => lista.push(e));
        lista.forEach((e) => {
            if (e.querySelector(':scope > .sge-logo-enchendo')) return;
            e.classList.add('sge-carregando-local');
            e.appendChild(logoCarregando());
            const texto = e.getAttribute('data-sge-carregando');
            if (texto) {
                const span = document.createElement('span');
                span.textContent = texto;
                e.appendChild(span);
            }
        });
    }
    function _vigiarMarcados() {
        if (typeof MutationObserver === 'undefined' || !document.body) return;
        _preencherMarcados(document.body);
        new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => n.nodeType === 1 && _preencherMarcados(n))))
            .observe(document.body, { childList: true, subtree: true });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _vigiarMarcados);
    else _vigiarMarcados();

    // ── Carregando ──────────────────────────────────────────
    let _telaCarregando = null;
    let _contaCarregando = 0;

    function carregando(sim, texto) {
        if (sim) {
            _contaCarregando++;
            if (!_telaCarregando) {
                _telaCarregando = document.createElement('div');
                _telaCarregando.className = 'sge-carregando';
                _telaCarregando.setAttribute('role', 'alert');
                _telaCarregando.setAttribute('aria-busy', 'true');
                const legenda = document.createElement('span');
                _telaCarregando.append(logoCarregando(), legenda);
                document.body.appendChild(_telaCarregando);
            }
            _telaCarregando.lastChild.textContent = texto || 'Carregando...';
        } else {
            _contaCarregando = Math.max(0, _contaCarregando - 1);
            if (_contaCarregando === 0 && _telaCarregando) {
                _telaCarregando.remove();
                _telaCarregando = null;
            }
        }
    }

    // Roda uma ação com "carregando" e erro tratado. Devolve o resultado ou null.
    async function seguro(fn, opcoes) {
        opcoes = opcoes || {};
        if (opcoes.carregando !== false) carregando(true, opcoes.texto);
        try {
            const r = await fn();
            if (r && r.error) throw r.error;             // padrão do supabase-js: { data, error }
            if (opcoes.sucesso) aviso(opcoes.sucesso, 'sucesso');
            return r;
        } catch (e) {
            erro(e, opcoes.contexto);
            return null;
        } finally {
            if (opcoes.carregando !== false) carregando(false);
        }
    }

    // ── Rascunho (não perder o que foi digitado) ────────────
    const rascunho = {
        _chave: (nome) => 'sge_rascunho_' + (window.SGE_APP_SLUG || location.pathname) + '_' + nome,
        salvar(nome, dados) {
            try { localStorage.setItem(this._chave(nome), JSON.stringify({ em: Date.now(), dados })); } catch (_) {}
        },
        ler(nome, validadeHoras) {
            try {
                const bruto = JSON.parse(localStorage.getItem(this._chave(nome)));
                if (!bruto) return null;
                if (Date.now() - bruto.em > (validadeHoras || 24) * 3600000) { this.limpar(nome); return null; }
                return bruto.dados;
            } catch (_) { return null; }
        },
        limpar(nome) {
            try { localStorage.removeItem(this._chave(nome)); } catch (_) {}
        },
        // Liga um <form>: salva a cada digitação e preenche ao abrir. Não guarda senhas.
        ligar(form, nome) {
            if (!form) return;
            nome = nome || form.id || 'formulario';
            const salvos = this.ler(nome);
            if (salvos) {
                Object.keys(salvos).forEach((k) => {
                    const campo = form.elements[k];
                    if (campo && campo.type !== 'password' && campo.type !== 'file') campo.value = salvos[k];
                });
            }
            form.addEventListener('input', () => {
                const dados = {};
                Array.from(form.elements).forEach((c) => {
                    if (c.name && c.type !== 'password' && c.type !== 'file') dados[c.name] = c.value;
                });
                this.salvar(nome, dados);
            });
            form.addEventListener('submit', () => this.limpar(nome));
        },
    };

    // ── Formatos brasileiros ────────────────────────────────
    const _fData = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const _fDataHora = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });
    const _fMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

    const formatar = {
        data: (v) => (v ? _fData.format(new Date(v)) : ''),
        dataHora: (v) => (v ? _fDataHora.format(new Date(v)) : ''),
        numero: (v, casas) => (v == null ? '' : Number(v).toLocaleString('pt-BR', { maximumFractionDigits: casas == null ? 2 : casas })),
        moeda: (v) => (v == null ? '' : _fMoeda.format(Number(v))),
    };

    // ── Logo oficial ────────────────────────────────────────
    function logo(variante) {
        return BASE + '/assets/sge-logo' + (variante ? '-' + variante : '') + '.svg';
    }

    // ── Faixa "sem internet" ────────────────────────────────
    function _faixaOffline() {
        let faixa = null;
        function atualizar() {
            if (!navigator.onLine && !faixa) {
                faixa = document.createElement('div');
                faixa.className = 'sge-offline';
                faixa.setAttribute('role', 'alert');
                faixa.textContent = 'Sem internet. O que você digitar fica guardado neste aparelho.';
                document.body.appendChild(faixa);
            } else if (navigator.onLine && faixa) {
                faixa.remove();
                faixa = null;
                aviso('Internet de volta.', 'sucesso');
            }
        }
        window.addEventListener('online', atualizar);
        window.addEventListener('offline', atualizar);
        atualizar();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _faixaOffline);
    } else {
        _faixaOffline();
    }

    // ── Acesso: login único da Central + permissões do sistema ──
    // Usa a sessão real do Supabase gravada pelo sso_login.html da Central
    // (todos os sistemas estão em grupogps-mecanizada.github.io, então dividem a sessão).
    // Regra de ouro: na dúvida (erro, rede), NÃO entra. O banco (RLS) barra o resto.
    const _acesso = {
        slug: null, db: null, promessa: null, perm: null, usuario: null,
        canal: null, presenca: null, timerConferir: null, timerAusente: null,
        observador: null, ultimaConferencia: 0, encerrado: false,
    };
    const _nunca = () => new Promise(() => {}); // a página para aqui: o código do sistema não continua
    const _CHAVE_VOLTAS = 'sge_acesso_voltas';

    function entrar(slug) {
        if (typeof slug !== 'string' || !slug.trim()) throw new Error('SGE.acesso.entrar: informe o slug do sistema.');
        if (_acesso.promessa) return _acesso.promessa;
        _acesso.slug = slug.trim();
        _acesso.promessa = _entrar();
        return _acesso.promessa;
    }

    async function _entrar() {
        _estiloAcesso();
        document.documentElement.classList.add('sge-acesso-pendente');
        _limparTokenAntigo();
        carregando(true, 'Conferindo seu acesso...');
        try {
            _acesso.db = cliente(ACESSO.url, ACESSO.chave);
            const { data, error } = await _acesso.db.auth.getSession();
            const sessao = data && data.session;
            if (!sessao && error && _eErroDeRede(error)) return _barrar({ situacao: 'erro', erro: error });
            if (!sessao) return _irParaLogin();

            const r = await _conferir();
            if (r.situacao !== 'ok') return _barrar(r);

            _liberar(r.perm, sessao.user);
            return _resumo();
        } catch (e) {
            console.error('[SGE] Não consegui conferir o acesso:', e);
            return _barrar({ situacao: 'erro', erro: e });
        } finally {
            carregando(false);
        }
    }

    // Pergunta ao banco: permissões da pessoa neste sistema + manutenção.
    async function _conferir() {
        const db = typeof _acesso.db.schema === 'function' ? _acesso.db.schema('public') : _acesso.db;
        const [perm, manut] = await Promise.all([
            db.rpc('sge_minhas_permissoes', { p_slug: _acesso.slug }),
            db.from('v_sso_manutencao').select('mensagem,previsao_fim').eq('sistema_slug', _acesso.slug).limit(1),
        ]);
        if (perm.error) return { situacao: _eErroDeLogin(perm.error) ? 'login' : 'erro', erro: perm.error };
        if (manut.error) return { situacao: _eErroDeLogin(manut.error) ? 'login' : 'erro', erro: manut.error };
        if (manut.data && manut.data.length) return { situacao: 'manutencao', manutencao: manut.data[0], perm: perm.data };
        if (!perm.data || !perm.data.papel) return { situacao: 'sem_acesso', perm: perm.data };
        return { situacao: 'ok', perm: perm.data };
    }

    function _eErroDeLogin(e) {
        const msg = String((e && (e.message || e.msg)) || '');
        const codigo = e && (e.code || e.status);
        // 42501 na função = chamou sem login válido (a função só aceita quem está logado).
        return codigo === 401 || (e && e.status === 401) || codigo === '42501'
            || /^PGRST30[123]$/.test(String(codigo)) || /JWT|not authenticated|refresh token/i.test(msg);
    }

    function _eErroDeRede(e) {
        const msg = String((e && (e.message || e.name)) || '');
        return !navigator.onLine || (e && e.name === 'AuthRetryableFetchError')
            || /Failed to fetch|NetworkError|Load failed|fetch failed/i.test(msg);
    }

    function _liberar(perm, usuarioAuth) {
        _acesso.perm = perm;
        _acesso.usuario = {
            id: perm.usuario_id || (usuarioAuth && usuarioAuth.id),
            nome: perm.nome || (usuarioAuth && usuarioAuth.email) || 'Usuário SGE',
            email: perm.email || (usuarioAuth && usuarioAuth.email) || '',
        };
        try { sessionStorage.removeItem(_CHAVE_VOLTAS); } catch (_) {}
        aplicar();
        _vigiarPagina();
        _entrarNoRadar();
        _acesso.ultimaConferencia = Date.now();
        _acesso.timerConferir = setInterval(reconferir, ACESSO.reconferirMs);
        if (_acesso.db.auth.onAuthStateChange) {
            _acesso.db.auth.onAuthStateChange((evento) => {
                if (evento === 'SIGNED_OUT' && _acesso.perm) _derrubar({ situacao: 'login' });
            });
        }
        document.documentElement.classList.remove('sge-acesso-pendente');
    }

    function _resumo() {
        return { usuario: acesso.usuario, papel: acesso.papel, permissoes: acesso.permissoes };
    }

    // Na entrada: manda para o login ou mostra a tela de bloqueio. A promessa nunca resolve.
    function _barrar(r) {
        if (r.situacao === 'login') return _irParaLogin();
        if (r.erro) console.warn('[SGE] Acesso barrado:', r.situacao, r.erro);
        _mostrarTela(r);
        return _nunca();
    }

    // Durante o uso: para tudo e cobre a página.
    function _derrubar(r) {
        _encerrar();
        _mostrarTela(r.situacao === 'login' ? { situacao: 'sessao_terminou' } : r);
    }

    function _irParaLogin(slug) {
        slug = slug || _acesso.slug;
        // Proteção contra vai-e-volta infinito (ex.: navegador bloqueando os dados do site).
        const agora = Date.now();
        let voltas = [];
        try { voltas = (JSON.parse(sessionStorage.getItem(_CHAVE_VOLTAS)) || []).filter((t) => agora - t < 120000); } catch (_) {}
        if (voltas.length >= 3) {
            try { sessionStorage.removeItem(_CHAVE_VOLTAS); } catch (_) {}
            _mostrarTela({ situacao: 'voltas' });
            return _nunca();
        }
        voltas.push(agora);
        try { sessionStorage.setItem(_CHAVE_VOLTAS, JSON.stringify(voltas)); } catch (_) {}

        let destino = ACESSO.central + '/sso_login.html';
        if (slug) {
            destino += '?app_slug=' + encodeURIComponent(slug)
                + '&redirect=' + encodeURIComponent(location.origin + location.pathname);
        }
        acesso._ir(destino);
        return _nunca();
    }

    // O login antigo ainda manda ?sso_token= na volta. Não usamos: só tiramos da barra de endereço.
    function _limparTokenAntigo() {
        try {
            const url = new URL(location.href);
            let mudou = false;
            if (url.searchParams.has('sso_token')) { url.searchParams.delete('sso_token'); mudou = true; }
            if (url.hash.indexOf('sso_token=') !== -1) { url.hash = url.hash.split('?')[0]; mudou = true; }
            if (mudou) history.replaceState(history.state, document.title, url.toString());
        } catch (_) {}
    }

    // ── Telas de bloqueio (texto sempre por textContent) ────
    const _TELAS = {
        sem_acesso: (r) => ({
            cor: '#b91c1c', titulo: 'Sem acesso',
            texto: 'Você não tem acesso a ' + ((r.perm && r.perm.sistema_nome) || 'este sistema') + '. Peça a liberação ao administrador do SGE.',
            botoes: [['Voltar ao Portal', () => acesso._ir(ACESSO.central + '/')], ['Entrar com outra conta', () => sair()]],
        }),
        manutencao: (r) => ({
            cor: '#b45309', titulo: 'Sistema em manutenção',
            texto: (r.manutencao && r.manutencao.mensagem) || 'Este sistema está em manutenção. Tente de novo em breve.',
            extra: r.manutencao && r.manutencao.previsao_fim ? 'Previsão de volta: ' + formatar.dataHora(r.manutencao.previsao_fim) : '',
            botoes: [['Tentar de novo', () => location.reload()]],
        }),
        erro: () => ({
            cor: '#1d4ed8', titulo: 'Não consegui conferir seu acesso',
            texto: 'Confira a internet e tente de novo. Por segurança, o sistema só abre depois dessa conferência.',
            botoes: [['Tentar de novo', () => location.reload()]],
        }),
        sessao_terminou: () => ({
            cor: '#1d4ed8', titulo: 'Sua sessão terminou',
            texto: 'Entre de novo para continuar.',
            botoes: [['Entrar', () => _irParaLogin()]],
        }),
        voltas: () => ({
            cor: '#b91c1c', titulo: 'Não consegui manter seu login',
            texto: 'Este navegador pode estar bloqueando os dados do site (janela anônima ou bloqueio de cookies). Tente de novo ou use outro navegador.',
            botoes: [['Tentar de novo', () => location.reload()]],
        }),
    };

    function _mostrarTela(r) {
        _estiloAcesso();
        const t = (_TELAS[r.situacao] || _TELAS.erro)(r);
        const velha = document.querySelector('.sge-acesso-tela');
        if (velha) velha.remove();

        const fundo = document.createElement('div');
        fundo.className = 'sge-acesso-tela';
        fundo.setAttribute('data-situacao', r.situacao);
        fundo.setAttribute('role', 'alertdialog');
        fundo.setAttribute('aria-modal', 'true');
        fundo.style.setProperty('--cor', t.cor);
        const cartao = document.createElement('div');
        cartao.className = 'sge-acesso-cartao';
        const titulo = document.createElement('h2');
        titulo.textContent = t.titulo;
        const texto = document.createElement('p');
        texto.textContent = t.texto;
        cartao.append(titulo, texto);
        if (t.extra) {
            const extra = document.createElement('p');
            extra.className = 'sge-acesso-extra';
            extra.textContent = t.extra;
            cartao.appendChild(extra);
        }
        const botoes = document.createElement('div');
        botoes.className = 'sge-acesso-botoes';
        t.botoes.forEach(([rotulo, acao]) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.textContent = rotulo;
            b.onclick = acao;
            botoes.appendChild(b);
        });
        cartao.appendChild(botoes);
        fundo.appendChild(cartao);

        const html = document.documentElement;
        html.classList.remove('sge-acesso-pendente');
        html.classList.add('sge-acesso-bloqueado');
        document.body.appendChild(fundo);
        const primeiro = botoes.querySelector('button');
        if (primeiro) primeiro.focus();
    }

    // Estilo próprio, para funcionar mesmo se o sistema não carregar o sge-core.css.
    function _estiloAcesso() {
        if (document.getElementById('sge-acesso-estilo')) return;
        const s = document.createElement('style');
        s.id = 'sge-acesso-estilo';
        s.textContent = [
            'html.sge-acesso-pendente body>*:not(.sge-carregando):not(.sge-avisos):not(.sge-offline),',
            'html.sge-acesso-bloqueado body>*:not(.sge-acesso-tela):not(.sge-avisos):not(.sge-offline){visibility:hidden!important}',
            '.sge-acesso-tela{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(15,23,42,.92);font-family:var(--sge-fonte,system-ui,-apple-system,"Segoe UI",sans-serif)}',
            '.sge-acesso-cartao{background:#fff;color:#1e293b;border-radius:16px;padding:32px 24px;max-width:440px;width:100%;text-align:center;box-shadow:0 24px 64px rgba(0,0,0,.4)}',
            '.sge-acesso-cartao h2{margin:0 0 10px;font-size:21px;font-weight:800;color:var(--cor)}',
            '.sge-acesso-cartao p{margin:0 0 10px;font-size:15px;line-height:1.6;color:#475569}',
            '.sge-acesso-cartao .sge-acesso-extra{font-weight:600;color:#1e293b}',
            '.sge-acesso-botoes{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:20px}',
            '.sge-acesso-botoes button{min-height:44px;padding:10px 20px;border-radius:8px;font:600 15px inherit;font-family:inherit;cursor:pointer;border:1px solid #cbd5e1;background:#f1f5f9;color:#334155}',
            '.sge-acesso-botoes button:first-child{background:var(--cor);border-color:var(--cor);color:#fff}',
            '.sge-acesso-botoes button:focus-visible{outline:3px solid #f59e0b;outline-offset:2px}',
        ].join('\n');
        document.head.appendChild(s);
    }

    // ── O que a pessoa pode ver (lista nula = tudo, igual ao banco) ──
    function pode(tela) {
        const p = _acesso.perm;
        return !!(p && p.papel) && (p.telas == null || p.telas.indexOf(tela) !== -1);
    }

    function podeColuna(coluna) {
        const p = _acesso.perm;
        return !!(p && p.papel) && (p.colunas == null || p.colunas.indexOf(coluna) !== -1);
    }

    function temPapel() {
        const papel = _acesso.perm && _acesso.perm.papel;
        if (!papel) return false;
        const lista = [].concat.apply([], arguments).map((x) => String(x).trim().toUpperCase());
        return lista.indexOf(papel) !== -1;
    }

    const _SELETOR = '[data-sge-tela],[data-sge-coluna],[data-sge-papel]';

    // Esconde o que a pessoa não pode ver. Só esconde: quem barra de verdade é o banco.
    function aplicar(raiz) {
        if (!_acesso.perm) return;
        raiz = raiz || document;
        if (raiz.nodeType === 1 && raiz.matches(_SELETOR)) _aplicarEm(raiz);
        if (raiz.querySelectorAll) raiz.querySelectorAll(_SELETOR).forEach(_aplicarEm);
    }

    function _aplicarEm(el) {
        const d = el.dataset;
        const ok = (d.sgeTela == null || pode(d.sgeTela))
            && (d.sgeColuna == null || podeColuna(d.sgeColuna))
            && (d.sgePapel == null || temPapel(d.sgePapel.split(',')));
        const oculto = el.hasAttribute('data-sge-oculto');
        if (!ok && !oculto) {
            el.setAttribute('data-sge-oculto', el.style.getPropertyValue('display')); // guarda o display original
            el.style.setProperty('display', 'none', 'important');
        } else if (ok && oculto) {
            const antes = el.getAttribute('data-sge-oculto');
            el.removeAttribute('data-sge-oculto');
            if (antes) el.style.setProperty('display', antes); else el.style.removeProperty('display');
        }
    }

    // Conteúdo criado depois (tabelas, menus) também passa pelo filtro.
    function _vigiarPagina() {
        if (_acesso.observador || typeof MutationObserver === 'undefined') return;
        _acesso.observador = new MutationObserver((mudancas) => {
            mudancas.forEach((m) => {
                if (m.type === 'attributes') _aplicarEm(m.target);
                else m.addedNodes.forEach((n) => { if (n.nodeType === 1) aplicar(n); });
            });
        });
        _acesso.observador.observe(document.documentElement, {
            childList: true, subtree: true, attributes: true,
            attributeFilter: ['data-sge-tela', 'data-sge-coluna', 'data-sge-papel'],
        });
    }

    // ── Radar de presença (canal "sge-radar" lido pela Central) ──
    function _id() {
        if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
        return 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2);
    }

    function _entrarNoRadar() {
        if (typeof _acesso.db.channel !== 'function') return;
        let sessao = null;
        try { sessao = sessionStorage.getItem('sge_acesso_sessao'); } catch (_) {}
        if (!sessao) {
            sessao = _id();
            try { sessionStorage.setItem('sge_acesso_sessao', sessao); } catch (_) {}
        }
        const u = _acesso.usuario;
        _acesso.presenca = {
            session_id: sessao, user_id: u.id, user_name: u.nome, user_email: u.email,
            app_slug: _acesso.slug, app_name: _acesso.perm.sistema_nome || _acesso.slug,
            status: 'online', tab_id: sessao.slice(0, 8), url: location.pathname,
            entrou_em: new Date().toISOString(),
        };
        const canal = _acesso.db.channel('sge-radar', { config: { presence: { key: sessao } } });
        _acesso.canal = canal;
        canal.subscribe((status) => { if (status === 'SUBSCRIBED') _marcar(); });
        ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'].forEach((ev) => document.addEventListener(ev, _ativo, { passive: true }));
        document.addEventListener('visibilitychange', _visibilidade);
        window.addEventListener('pagehide', _sairDoRadar);
        window.addEventListener('pageshow', _voltouDoCache);
        _ativo();
    }

    function _marcar() {
        const canal = _acesso.canal;
        if (!canal || !_acesso.presenca) return;
        Promise.resolve().then(() => canal.track(_acesso.presenca)).catch(() => {});
    }

    function _sairDoRadar() {
        const canal = _acesso.canal;
        if (canal) Promise.resolve().then(() => canal.untrack()).catch(() => {});
    }

    // Página restaurada do cache do navegador (botão voltar): volta ao radar e confere de novo.
    function _voltouDoCache(ev) {
        if (!ev.persisted || _acesso.encerrado) return;
        _marcar();
        reconferir();
    }

    function _status(s) {
        if (!_acesso.presenca || _acesso.presenca.status === s) return;
        _acesso.presenca.status = s;
        _marcar();
    }

    function _ativo() {
        if (_acesso.encerrado) return;
        clearTimeout(_acesso.timerAusente);
        _status('online');
        _acesso.timerAusente = setTimeout(() => _status('away'), ACESSO.ausenteMs);
    }

    function _visibilidade() {
        if (document.hidden) { _status('away'); return; }
        _ativo();
        // Aba ficou escondida muito tempo (o navegador atrasa os relógios): confere agora.
        if (Date.now() - _acesso.ultimaConferencia >= ACESSO.reconferirMs) reconferir();
    }

    // ── Reconferência periódica (bloqueio, acesso retirado, manutenção) ──
    async function reconferir() {
        if (!_acesso.perm || _acesso.encerrado) return null;
        _acesso.ultimaConferencia = Date.now();
        let r;
        try { r = await _conferir(); } catch (e) { r = { situacao: 'erro', erro: e }; }
        if (_acesso.encerrado) return null;
        if (r.situacao === 'erro') {
            // Falha de rede não derruba quem já entrou; o banco continua barrando o que não pode.
            console.warn('[SGE] Não consegui reconferir o acesso; tento de novo em 5 minutos.', r.erro);
            return 'erro';
        }
        if (r.situacao !== 'ok') { _derrubar(r); return r.situacao; }
        _acesso.perm = r.perm;
        aplicar();
        return 'ok';
    }

    function _encerrar() {
        _acesso.encerrado = true;
        _acesso.perm = null;
        clearInterval(_acesso.timerConferir);
        clearTimeout(_acesso.timerAusente);
        if (_acesso.observador) { _acesso.observador.disconnect(); _acesso.observador = null; }
        ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'].forEach((ev) => document.removeEventListener(ev, _ativo));
        document.removeEventListener('visibilitychange', _visibilidade);
        window.removeEventListener('pagehide', _sairDoRadar);
        window.removeEventListener('pageshow', _voltouDoCache);
        const canal = _acesso.canal;
        _acesso.canal = null;
        if (canal) {
            Promise.resolve().then(() => canal.untrack()).catch(() => {});
            try { _acesso.db.removeChannel(canal); } catch (_) {}
        }
    }

    async function sair(slug) {
        _encerrar();
        if (!_acesso.db) { try { _acesso.db = cliente(ACESSO.url, ACESSO.chave); } catch (_) {} }
        try { if (_acesso.db) await _acesso.db.auth.signOut({ scope: 'local' }); } catch (_) {}
        try { sessionStorage.removeItem(_CHAVE_VOLTAS); } catch (_) {}
        return _irParaLogin(slug);
    }

    function tipoDeErro(e) {
        if (_eErroDeLogin(e)) return 'login';
        if (_eErroDeRede(e)) return 'rede';
        return 'outro';
    }

    const acesso = {
        entrar,
        pode,
        podeColuna,
        temPapel,
        aplicar,
        reconferir,
        sair,
        irParaLogin: (slug) => _irParaLogin(slug),
        tipoDeErro,
        conexao: () => cliente(ACESSO.url, ACESSO.chave), // conexão da Central (usada pela barra)
        get central() { return ACESSO.central; },
        get usuario() { return _acesso.perm ? Object.assign({}, _acesso.usuario) : null; },
        get papel() { return _acesso.perm ? _acesso.perm.papel : null; },
        get permissoes() { return _acesso.perm ? JSON.parse(JSON.stringify(_acesso.perm)) : null; },
        _ir: (url) => window.location.assign(url), // troca de página (substituível nos testes)
    };

    const api = {
        versao: VERSAO,
        cliente,
        aviso,
        erro,
        carregando,
        logoCarregando,
        seguro,
        rascunho,
        formatar,
        logo,
        acesso,
    };

    // Alguns sistemas já usam window.SGE como "caixa" própria (SGE.auth, SGE.api...).
    // O núcleo só SOMA o que falta, sem apagar nada que já existe.
    window.SGECore = api;
    const caixa = (window.SGE = window.SGE || {});
    Object.keys(api).forEach((k) => {
        if (!(k in caixa)) caixa[k] = api[k];
    });
    caixa.core = api;
})();
