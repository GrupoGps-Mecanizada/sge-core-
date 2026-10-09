/**
 * SGE BARRA v1 — barra de topo universal dos sistemas do SGE (sge-core 1.2).
 *
 * Ordem na página: supabase-js → sge-core.js → sge-icones.js → sge-barra.js
 *   const barra = SGE.barra.montar({ sistema: 'sst', nome: 'SST', area: 'Mecanizada', inicio: '/sst/', secoes: [...] });
 *   await SGE.acesso.entrar('sst'); barra.atualizar();   // depois do login: filtra os menus e mostra o usuário
 *   barra.contador('/sst/pendencias', 12);                // número ao lado do item (0 esconde)
 * Desenho: docs/superpowers/specs/2026-10-09-barra-universal-design.md
 */
(function () {
    'use strict';

    const SGE = window.SGE;
    if (!SGE || !SGE.core) { console.error('[SGE] Carregue o sge-core.js antes do sge-barra.js.'); return; }
    if (SGE.barra) return; // já carregado
    const core = SGE.core;

    const ORIGEM_GH = 'https://grupogps-mecanizada.github.io';
    const CHAVE_CACHE = 'sge_barra_sistemas';
    const CACHE_MS = 5 * 60 * 1000;
    const CHAVE_TEMA = 'sge_tema';
    const OUTROS = 'Outros';
    const PROIBIDOS = /[\\\x00-\x1f\x7f]/;

    // ── Regras (sem tela; testadas em barra.test.js) ─────────

    // github.io da organização vira caminho no endereço atual (portal); outro site fica como está.
    // Só http(s); barra invertida, caracteres de controle e "//" no começo são recusados.
    function enderecoNoPortal(url) {
        if (typeof url !== 'string') return null;
        url = url.trim();
        if (!url || PROIBIDOS.test(url) || url.startsWith('//')) return null;
        let u;
        try { u = new URL(url, ORIGEM_GH + '/'); } catch (_) { return null; }
        if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
        if (u.origin === ORIGEM_GH) return u.pathname.startsWith('//') ? null : u.pathname + u.search + u.hash;
        return u.toString();
    }

    function corValida(cor) {
        return typeof cor === 'string' && /^#[0-9a-f]{6}$/i.test(cor.trim()) ? cor.trim() : null;
    }

    function comparar(a, b) {
        const oa = a.ordem == null ? Infinity : a.ordem;
        const ob = b.ordem == null ? Infinity : b.ordem;
        return (oa - ob) || String(a.nome).localeCompare(String(b.nome), 'pt-BR');
    }

    // Grupos por área (alfabética, "Outros" no fim); dentro de cada grupo, pela ordem e depois pelo nome.
    function agruparPorArea(lista) {
        const grupos = new Map();
        lista.forEach((s) => {
            const area = (s.area_menu && String(s.area_menu).trim()) || OUTROS;
            if (!grupos.has(area)) grupos.set(area, []);
            grupos.get(area).push(s);
        });
        return [...grupos.entries()]
            .sort(([a], [b]) => ((a === OUTROS) - (b === OUTROS)) || a.localeCompare(b, 'pt-BR'))
            .map(([area, sistemas]) => ({ area, sistemas: sistemas.sort(comparar) }));
    }

    const semAcento = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

    // Só os sistemas com endereço válido, já com o endereço pronto, filtrados pela busca.
    function prepararSistemas(lista, termo) {
        const t = semAcento(termo).trim();
        return (Array.isArray(lista) ? lista : [])
            .filter((s) => s && s.slug && s.nome)
            .map((s) => Object.assign({}, s, { endereco: enderecoNoPortal(s.url_origem) }))
            .filter((s) => s.endereco && (!t || semAcento(s.nome + ' ' + (s.area_menu || '')).includes(t)));
    }

    function bate(href, caminho) {
        const h = String(href).split(/[?#]/)[0];
        return caminho === h || caminho.startsWith(h.endsWith('/') ? h : h + '/');
    }

    // Tela ativa: o href mais longo que bate com o caminho (ex.: /sst/matriz antes de /sst/).
    function telaAtual(secoes, caminho) {
        const hrefs = [];
        (secoes || []).forEach((s) => {
            if (s.href) hrefs.push(s.href);
            (s.itens || []).forEach((i) => { if (i.href) hrefs.push(i.href); });
        });
        return hrefs.filter((h) => bate(h, caminho)).sort((a, b) => b.length - a.length)[0] || null;
    }

    // Item sem permissão de tela some; seção que ficou sem itens some.
    function secoesVisiveis(secoes, pode) {
        return (secoes || []).map((s) => {
            if (!Array.isArray(s.itens)) return !s.tela || pode(s.tela) ? s : null;
            const itens = s.itens.filter((i) => !i.tela || pode(i.tela));
            return itens.length ? Object.assign({}, s, { itens }) : null;
        }).filter(Boolean);
    }

    function iniciais(texto) {
        const partes = String(texto || '').split('@')[0].split(/[\s._-]+/).filter(Boolean);
        if (!partes.length) return '?';
        return (partes.length === 1 ? partes[0].slice(0, 2) : partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
    }

    // ── Peças da tela ─────────────────────────────────────────

    function el(tag, props, filhos) {
        const e = document.createElement(tag);
        Object.keys(props || {}).forEach((k) => {
            const v = props[k];
            if (v == null || v === false) return;
            if (k === 'texto') e.textContent = v;
            else if (k === 'classe') e.className = v;
            else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
            else e.setAttribute(k, v === true ? '' : v);
        });
        (filhos || []).forEach((f) => { if (f) e.appendChild(typeof f === 'string' ? document.createTextNode(f) : f); });
        return e;
    }

    const icone = (nome, tamanho) => (window.SGE.icone ? window.SGE.icone(nome, tamanho) : null);

    function pode(tela) {
        const a = core.acesso;
        return !(a && a.permissoes) || a.pode(tela);
    }

    function lerCache() {
        try {
            const c = JSON.parse(sessionStorage.getItem(CHAVE_CACHE));
            return c && Array.isArray(c.lista) && Date.now() - c.em < CACHE_MS ? c.lista : null;
        } catch (_) { return null; }
    }
    function guardarCache(lista) {
        try { sessionStorage.setItem(CHAVE_CACHE, JSON.stringify({ em: Date.now(), lista })); } catch (_) { /* sem sessionStorage: consulta de novo */ }
    }

    function temaEscuro() {
        const t = document.documentElement.getAttribute('data-tema');
        if (t) return t === 'escuro';
        return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    function aplicarTemaGuardado() {
        try {
            const t = localStorage.getItem(CHAVE_TEMA);
            if (t === 'claro' || t === 'escuro') document.documentElement.setAttribute('data-tema', t);
        } catch (_) { /* sem localStorage: segue o tema do aparelho */ }
    }

    const CSS = `
:host { all: initial; display: block; position: sticky; top: 0; z-index: 1000; font-family: var(--sge-fonte, 'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif); }
* { box-sizing: border-box; }
a { color: inherit; text-decoration: none; }
button { font: inherit; color: inherit; background: none; border: 0; margin: 0; padding: 0; cursor: pointer; }
p { margin: 0; }
:focus-visible { outline: 2px solid #f59e0b; outline-offset: 2px; }
.barra { display: flex; align-items: center; gap: 12px; height: 62px; padding: 0 20px; background: var(--sge-marca-escura, #0d1b2e); color: #e2e8f0; border-bottom: 1px solid rgba(255,255,255,.08); box-shadow: 0 6px 16px -8px rgba(0,0,0,.5); }
.caixa { position: relative; display: flex; align-items: center; }
.logo { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 9px; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.2); transition: transform .15s, box-shadow .15s; }
.logo:hover, .logo[aria-expanded="true"] { transform: scale(1.05); box-shadow: 0 0 0 3px rgba(255,255,255,.18); }
.logo img { width: 28px; height: 28px; object-fit: contain; }
.nome { display: flex; flex-direction: column; min-width: 0; line-height: 1.2; white-space: nowrap; }
.nome strong { font-size: 15px; font-weight: 600; letter-spacing: -.01em; color: #fff; overflow: hidden; text-overflow: ellipsis; }
.nome .sub, .nome .tela { font-size: 12px; color: #94a3b8; overflow: hidden; text-overflow: ellipsis; }
.nome .tela { display: none; }
.divisor { flex: none; width: 1px; height: 28px; background: rgba(255,255,255,.1); }
.menu { display: flex; align-items: center; gap: 2px; min-width: 0; padding: 4px; border-radius: 12px; border: 1px solid rgba(255,255,255,.06); background: rgba(255,255,255,.03); }
.botao-menu { display: flex; align-items: center; gap: 8px; height: 36px; padding: 0 12px; border-radius: 8px; font-size: 13.5px; font-weight: 500; color: #cbd5e1; white-space: nowrap; transition: background .15s, color .15s; }
.botao-menu:hover { background: rgba(255,255,255,.07); color: #fff; }
.botao-menu.ativo, .botao-menu[aria-expanded="true"] { background: rgba(255,255,255,.12); color: #fff; box-shadow: inset 0 1px 0 rgba(255,255,255,.08); }
.espaco { flex: 1; }
.busca { display: flex; align-items: center; gap: 10px; height: 36px; padding: 0 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.05); color: #94a3b8; font-size: 13px; white-space: nowrap; }
.busca:hover { background: rgba(255,255,255,.09); color: #e2e8f0; }
.busca kbd { font: inherit; font-size: 11px; padding: 1px 6px; border-radius: 6px; border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.06); }
.redondo { flex: none; display: grid; place-items: center; width: 36px; height: 36px; border-radius: 8px; border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.05); color: #e2e8f0; }
.redondo:hover { background: rgba(255,255,255,.1); }
.avatar { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; background: var(--sge-destaque, #1d4ed8); color: #fff; font-size: 12.5px; font-weight: 600; box-shadow: 0 0 0 2px rgba(255,255,255,.15); }
.entrar { height: 34px; padding: 0 14px; border-radius: 8px; background: #fff; color: var(--sge-marca-escura, #0d1b2e); font-size: 13px; font-weight: 600; }
.selo { min-width: 18px; padding: 0 6px; border-radius: 999px; background: var(--sge-perigo, #c62828); color: #fff; font-size: 11px; font-weight: 600; line-height: 18px; text-align: center; font-variant-numeric: tabular-nums; }
.so-celular { display: none; }
.suspenso { position: absolute; top: calc(100% + 10px); left: 0; z-index: 10; min-width: 240px; max-height: calc(100vh - 90px); overflow-y: auto; padding: 6px; border-radius: 12px; border: 1px solid var(--sge-borda, #e1e6ef); background: var(--sge-superficie, #fff); color: var(--sge-texto, #111827); box-shadow: var(--sge-sombra-forte, 0 12px 40px rgba(15,23,42,.25)); animation: surgir .14s ease-out; }
.suspenso.direita { left: auto; right: 0; }
.suspenso.secao { width: 352px; }
@keyframes surgir { from { opacity: 0; transform: translateY(-4px); } }
.dica { padding: 8px 12px 4px; font-size: 12px; color: var(--sge-texto-3, #6b7280); }
.grupo + .grupo { border-top: 1px solid var(--sge-borda, #e1e6ef); }
.grupo-titulo, .area { padding: 10px 12px 4px; font-size: 11px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--sge-texto-3, #6b7280); }
.item { display: flex; align-items: flex-start; gap: 12px; padding: 8px 12px; border-radius: 8px; }
.item:hover { background: var(--sge-superficie-2, #f5f7fb); }
.item[aria-current="page"] { background: var(--sge-destaque-suave, #1d4ed814); }
.item-icone { flex: none; display: grid; place-items: center; width: 32px; height: 32px; margin-top: 1px; border-radius: 8px; border: 1px solid var(--sge-borda, #e1e6ef); background: var(--sge-superficie-2, #f5f7fb); color: var(--sge-texto-2, #4b5563); }
.item[aria-current="page"] .item-icone, .item[aria-current="page"] .item-rotulo { color: var(--sge-destaque, #1d4ed8); }
.item-texto { display: flex; flex-direction: column; min-width: 0; line-height: 1.35; }
.item-rotulo { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; }
.item-desc { font-size: 12px; color: var(--sge-texto-3, #6b7280); }
.grade { width: 384px; padding: 10px; }
.grade-topo { padding: 2px 4px 10px; font-size: 14px; font-weight: 600; }
.busca-grade { width: 100%; height: 36px; margin: 0 0 6px; padding: 0 12px; border-radius: 8px; border: 1px solid var(--sge-borda, #e1e6ef); background: var(--sge-superficie-2, #f5f7fb); color: inherit; font: inherit; font-size: 13.5px; outline: none; }
.busca-grade:focus { border-color: var(--sge-destaque, #1d4ed8); background: var(--sge-superficie, #fff); }
.ladrilhos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; }
.ladrilho { position: relative; display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 12px 4px 10px; border-radius: 10px; text-align: center; }
.ladrilho:hover { background: var(--sge-superficie-2, #f5f7fb); }
.quadrado { display: grid; place-items: center; width: 52px; height: 52px; border-radius: 14px; color: #fff; background-color: var(--cor); background-image: linear-gradient(145deg, rgba(255,255,255,.22), rgba(255,255,255,0) 60%); box-shadow: 0 1px 2px rgba(15,23,42,.18), inset 0 1px 0 rgba(255,255,255,.25); transition: transform .15s; }
.ladrilho:hover .quadrado { transform: translateY(-2px); }
.ladrilho[aria-current="page"] .quadrado { box-shadow: 0 0 0 2px var(--sge-superficie, #fff), 0 0 0 4px var(--cor); }
.nome-sis { font-size: 12.5px; line-height: 1.25; color: var(--sge-texto, #111827); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.fora { position: absolute; top: 6px; right: 8px; color: var(--sge-texto-3, #6b7280); }
.fantasma { height: 86px; border-radius: 10px; background: var(--sge-superficie-2, #f5f7fb); animation: piscar 1.2s ease-in-out infinite; }
@keyframes piscar { 50% { opacity: .45; } }
.vazio { padding: 18px 8px; text-align: center; font-size: 13px; color: var(--sge-texto-2, #4b5563); }
.vazio button { margin-top: 10px; height: 34px; padding: 0 14px; border-radius: 8px; background: var(--sge-destaque, #1d4ed8); color: #fff; font-size: 13px; font-weight: 600; }
.rodape { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 6px; padding: 10px; border-top: 1px solid var(--sge-borda, #e1e6ef); border-radius: 0 0 8px 8px; font-size: 13px; font-weight: 500; color: var(--sge-destaque, #1d4ed8); }
.rodape:hover { background: var(--sge-superficie-2, #f5f7fb); }
.usuario { width: 264px; }
.cabeca { display: flex; align-items: center; gap: 12px; margin-bottom: 4px; padding: 10px 12px; border-bottom: 1px solid var(--sge-borda, #e1e6ef); }
.cabeca .avatar { width: 40px; height: 40px; box-shadow: none; flex: none; }
.cabeca div { min-width: 0; }
.cabeca p { font-size: 12px; color: var(--sge-texto-3, #6b7280); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cabeca p:first-child { font-size: 14px; font-weight: 600; color: var(--sge-texto, #111827); }
.acao { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 12px; border-radius: 8px; font-size: 14px; text-align: left; }
.acao:hover { background: var(--sge-superficie-2, #f5f7fb); }
.gaveta-fundo { position: fixed; inset: 0; z-index: 20; background: rgba(15,23,42,.45); }
.gaveta { position: fixed; top: 0; right: 0; bottom: 0; z-index: 21; display: flex; flex-direction: column; width: min(88vw, 320px); overflow-y: auto; background: var(--sge-marca-escura, #0d1b2e); color: #e2e8f0; animation: entrar-direita .18s ease-out; }
@keyframes entrar-direita { from { transform: translateX(24px); opacity: 0; } }
.gaveta .cabeca { border-color: rgba(255,255,255,.1); }
.gaveta .cabeca p { color: #94a3b8; }
.gaveta .cabeca p:first-child { color: #fff; }
.gaveta nav { flex: 1; padding: 8px; }
.gaveta .area { color: #94a3b8; }
.gaveta .item { align-items: center; min-height: 44px; color: #e2e8f0; }
.gaveta .item:hover { background: rgba(255,255,255,.07); }
.gaveta .item-icone { border-color: rgba(255,255,255,.1); background: rgba(255,255,255,.05); color: #cbd5e1; }
.gaveta .item[aria-current="page"] { background: var(--sge-destaque, #1d4ed8); }
.gaveta .item[aria-current="page"] .item-rotulo, .gaveta .item[aria-current="page"] .item-icone { color: #fff; }
.gaveta .item-desc { display: none; }
.gaveta .acao { min-height: 48px; padding: 0 20px; border-top: 1px solid rgba(255,255,255,.1); border-radius: 0; }
.gaveta .acao:hover { background: rgba(255,255,255,.07); }
@media (max-width: 1180px) { .busca span, .busca kbd, .nome .sub { display: none; } }
@media (max-width: 767px) {
  .barra { height: 56px; gap: 10px; padding: 0 12px; }
  .menu, .divisor, .caixa-usuario, .tema { display: none; }
  .so-celular { display: grid; }
  .nome .tela { display: block; }
  .busca, .redondo { width: 44px; height: 44px; justify-content: center; padding: 0; border: 0; background: none; }
  .logo { width: 36px; height: 36px; }
  .grade { position: fixed; top: 64px; left: 8px; right: 8px; width: auto; }
}
@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
`;

    // ── Montagem ──────────────────────────────────────────────

    let instancia = null;

    function montar(opcoes) {
        if (!opcoes || typeof opcoes.sistema !== 'string' || !opcoes.sistema.trim()) {
            throw new Error('SGE.barra.montar: informe o slug do sistema (opcoes.sistema).');
        }
        if (!window.SGE.icone) console.warn('[SGE] sge-icones.js não foi carregado: a barra fica sem ícones.');
        if (instancia) instancia.destruir();

        const op = Object.assign({}, opcoes);
        const est = { aberto: null, sistemas: { situacao: 'parado', lista: [] }, termo: '', usuario: undefined, contadores: {} };
        const host = document.createElement('sge-barra');
        const raiz = host.attachShadow({ mode: 'open' });
        const alvo = op.alvo || document.body;
        alvo.insertBefore(host, alvo.firstChild);

        const caminho = () => (typeof op.atual === 'function' ? op.atual() : (op.atual || location.pathname));
        const secoes = () => secoesVisiveis(op.secoes, pode);
        const numero = (href) => (href && est.contadores[href]) || 0;
        const selo = (n) => (n > 0 ? el('span', { classe: 'selo', texto: String(n) }) : null);
        const totalDaSecao = (s) => numero(s.href) + (s.itens || []).reduce((t, i) => t + numero(i.href), 0);
        const focar = (chave) => { const f = raiz.querySelector('[data-chave="' + chave + '"]'); if (f) f.focus(); };

        function navegar(ev, href) {
            fechar();
            const simples = ev.button === 0 && !ev.ctrlKey && !ev.metaKey && !ev.shiftKey && !ev.altKey;
            if (op.aoNavegar && simples) { ev.preventDefault(); op.aoNavegar(href, ev); }
        }

        function link(href, classe, filhos, ativo) {
            return el('a', { href, classe, 'aria-current': ativo ? 'page' : null, onclick: (ev) => navegar(ev, href) }, filhos);
        }

        function itemMenu(i, atual) {
            return link(i.href, 'item', [
                el('span', { classe: 'item-icone' }, [icone(i.icone || 'file-text', 17)]),
                el('span', { classe: 'item-texto' }, [
                    el('span', { classe: 'item-rotulo' }, [i.rotulo, selo(numero(i.href))]),
                    i.texto ? el('span', { classe: 'item-desc', texto: i.texto }) : null,
                ]),
            ], i.href === atual);
        }

        function porGrupo(itens) {
            const g = new Map();
            itens.forEach((i) => { const k = i.grupo || ''; if (!g.has(k)) g.set(k, []); g.get(k).push(i); });
            return [...g.entries()];
        }

        function secaoEl(s, n, atual) {
            const aceso = s.href === atual || (s.itens || []).some((i) => i.href === atual);
            const miolo = [icone(s.icone || 'grade', 17), s.rotulo, selo(totalDaSecao(s))];
            if (!s.itens) return link(s.href, 'botao-menu' + (aceso ? ' ativo' : ''), miolo, aceso);
            const chave = 'secao-' + n;
            const aberto = est.aberto === chave;
            const caixa = el('div', { classe: 'caixa' }, [
                el('button', { type: 'button', classe: 'botao-menu' + (aceso ? ' ativo' : ''), 'data-chave': chave,
                    'aria-haspopup': 'menu', 'aria-expanded': String(aberto), onclick: () => alternar(chave) },
                    miolo.concat([icone('seta-baixo', 14)])),
            ]);
            if (aberto) {
                caixa.appendChild(el('div', { classe: 'suspenso secao', role: 'menu' },
                    [s.texto ? el('p', { classe: 'dica', texto: s.texto }) : null].concat(porGrupo(s.itens).map(([grupo, itens]) =>
                        el('div', { classe: 'grupo' }, [grupo ? el('p', { classe: 'grupo-titulo', texto: grupo }) : null]
                            .concat(itens.map((i) => itemMenu(i, atual))))))));
            }
            return caixa;
        }

        function ladrilho(s) {
            const quadrado = el('span', { classe: 'quadrado' }, [icone(s.icone, 26)]);
            quadrado.style.setProperty('--cor', corValida(s.cor) || 'var(--sge-marca, #1B3A6B)');
            return el('a', {
                classe: 'ladrilho', href: s.endereco, title: s.nome,
                target: s.abre_fora ? '_blank' : null, rel: s.abre_fora ? 'noopener' : null,
                'aria-current': s.slug === op.sistema ? 'page' : null, onclick: () => fechar(),
            }, [quadrado, el('span', { classe: 'nome-sis', texto: s.nome }),
                s.abre_fora ? el('span', { classe: 'fora', title: 'Abre em outra aba' }, [icone('abrir-fora', 12)]) : null]);
        }

        function preencherLista(lista) {
            lista = lista || raiz.querySelector('.lista-grade');
            if (!lista) return;
            const s = est.sistemas;
            if (s.situacao === 'carregando' || s.situacao === 'parado') {
                lista.replaceChildren(el('div', { classe: 'ladrilhos', 'aria-busy': 'true' },
                    Array.from({ length: 6 }, () => el('div', { classe: 'fantasma' }))));
                return;
            }
            if (s.situacao === 'erro') {
                lista.replaceChildren(el('div', { classe: 'vazio', role: 'alert' }, [
                    el('p', { texto: 'Não consegui carregar seus sistemas.' }),
                    el('button', { type: 'button', texto: 'Tentar de novo', onclick: () => carregarSistemas(true) }),
                ]));
                return;
            }
            const grupos = agruparPorArea(prepararSistemas(s.lista, est.termo));
            if (!grupos.length) {
                lista.replaceChildren(el('p', { classe: 'vazio', texto: est.termo ? 'Nenhum sistema encontrado.' : 'Você ainda não tem sistemas liberados.' }));
                return;
            }
            const filhos = [];
            grupos.forEach(({ area, sistemas }) => {
                filhos.push(el('p', { classe: 'area', texto: area }), el('div', { classe: 'ladrilhos' }, sistemas.map(ladrilho)));
            });
            lista.replaceChildren(...filhos);
        }

        function gradeEl() {
            const lista = el('div', { classe: 'lista-grade' });
            const painel = el('div', { classe: 'suspenso grade', role: 'dialog', 'aria-label': 'Seus sistemas' }, [
                el('p', { classe: 'grade-topo', texto: 'Seus sistemas' }),
                el('input', { type: 'search', classe: 'busca-grade', placeholder: 'Buscar sistema…', 'aria-label': 'Buscar sistema',
                    'data-chave': 'busca-grade', value: est.termo || null,
                    oninput: (ev) => { est.termo = ev.target.value; preencherLista(); } }),
                lista,
                el('a', { classe: 'rodape', href: location.origin + '/' }, [icone('home', 16), 'Página inicial do SGE']),
            ]);
            preencherLista(lista);
            return painel;
        }

        function cabecaUsuario(u) {
            return el('div', { classe: 'cabeca' }, [
                el('span', { classe: 'avatar', texto: iniciais(u.nome || u.email) }),
                el('div', null, [
                    el('p', { texto: u.nome || u.email }),
                    u.email && u.email !== u.nome ? el('p', { texto: u.email }) : null,
                    u.papel ? el('p', { texto: u.papel }) : null,
                ]),
            ]);
        }

        const acaoSair = () => el('button', { type: 'button', classe: 'acao', role: 'menuitem', onclick: sair }, [icone('sair', 16), 'Sair']);

        function usuarioEl() {
            const caixa = el('div', { classe: 'caixa caixa-usuario' });
            if (est.usuario === undefined) return caixa; // ainda carregando
            if (!est.usuario) {
                caixa.appendChild(el('button', { type: 'button', classe: 'entrar', 'data-chave': 'entrar', texto: 'Entrar', onclick: entrar }));
                return caixa;
            }
            const u = est.usuario;
            const aberto = est.aberto === 'usuario';
            caixa.appendChild(el('button', { type: 'button', classe: 'avatar', 'data-chave': 'usuario', 'aria-haspopup': 'menu',
                'aria-expanded': String(aberto), 'aria-label': 'Usuário ' + (u.email || u.nome), title: u.nome || u.email,
                texto: iniciais(u.nome || u.email), onclick: () => alternar('usuario') }));
            if (aberto) caixa.appendChild(el('div', { classe: 'suspenso direita usuario', role: 'menu' }, [cabecaUsuario(u), acaoSair()]));
            return caixa;
        }

        function gavetaEls(atual) {
            const u = est.usuario;
            const nav = [];
            secoes().forEach((s) => {
                if (s.itens) nav.push(el('p', { classe: 'area', texto: s.rotulo }), ...s.itens.map((i) => itemMenu(i, atual)));
                else nav.push(itemMenu(s, atual));
            });
            return [
                el('div', { classe: 'gaveta-fundo', onclick: fechar }),
                el('aside', { classe: 'gaveta', role: 'dialog', 'aria-label': 'Menu' }, [
                    u ? cabecaUsuario(u) : null,
                    el('nav', null, nav),
                    el('button', { type: 'button', classe: 'acao', onclick: alternarTema }, [icone('tema', 18), 'Tema claro / escuro']),
                    u ? acaoSair() : el('button', { type: 'button', classe: 'acao', onclick: entrar }, [icone('user', 18), 'Entrar']),
                ]),
            ];
        }

        function desenhar() {
            const ativo = raiz.activeElement;
            const foco = ativo && ativo.getAttribute && ativo.getAttribute('data-chave');
            const visiveis = secoes();
            const atual = telaAtual(visiveis, caminho());
            let rotuloAtual = null;
            visiveis.forEach((s) => [s].concat(s.itens || []).forEach((i) => { if (i.href === atual) rotuloAtual = i.rotulo; }));
            const barra = el('header', { classe: 'barra' }, [
                el('div', { classe: 'caixa' }, [
                    el('button', { type: 'button', classe: 'logo', 'data-chave': 'grade', 'aria-haspopup': 'dialog',
                        'aria-expanded': String(est.aberto === 'grade'), 'aria-label': 'Sistemas do SGE', title: 'Sistemas do SGE',
                        onclick: () => alternar('grade') }, [el('img', { src: core.logo(), alt: '' })]),
                    est.aberto === 'grade' ? gradeEl() : null,
                ]),
                el('a', { classe: 'nome', href: op.inicio || location.pathname, onclick: (ev) => navegar(ev, op.inicio || location.pathname) }, [
                    el('strong', { texto: op.nome || '' }),
                    op.area ? el('span', { classe: 'sub', texto: op.area }) : null,
                    rotuloAtual ? el('span', { classe: 'tela', texto: rotuloAtual }) : null,
                ]),
                visiveis.length ? el('span', { classe: 'divisor', 'aria-hidden': 'true' }) : null,
                visiveis.length ? el('nav', { classe: 'menu', 'aria-label': 'Menu do sistema' }, visiveis.map((s, n) => secaoEl(s, n, atual))) : null,
                el('span', { classe: 'espaco' }),
                el('button', { type: 'button', classe: 'busca', 'data-chave': 'busca', title: 'Buscar (Ctrl K)', 'aria-label': 'Buscar', onclick: buscar },
                    [icone('search', 16), el('span', { texto: op.aoBuscar ? 'Buscar ou agir…' : 'Buscar sistema…' }), el('kbd', { texto: 'Ctrl K' })]),
                el('button', { type: 'button', classe: 'redondo tema', 'data-chave': 'tema', title: 'Tema claro / escuro',
                    'aria-label': 'Alternar tema', onclick: alternarTema }, [icone('tema', 17)]),
                usuarioEl(),
                el('button', { type: 'button', classe: 'redondo so-celular', 'data-chave': 'gaveta', 'aria-label': 'Abrir menu',
                    'aria-expanded': String(est.aberto === 'gaveta'), onclick: () => alternar('gaveta') }, [icone('menu', 20)]),
            ]);
            raiz.replaceChildren(el('style', { texto: CSS }), barra, ...(est.aberto === 'gaveta' ? gavetaEls(atual) : []));
            if (foco) focar(foco);
        }

        function alternar(chave) {
            const abrir = est.aberto !== chave;
            est.aberto = abrir ? chave : null;
            est.termo = '';
            if (abrir && chave === 'grade') carregarSistemas(false);
            desenhar();
        }

        function fechar() {
            if (est.aberto === null) return;
            est.aberto = null;
            est.termo = '';
            desenhar();
        }

        function buscar() {
            if (op.aoBuscar) { fechar(); op.aoBuscar(); return; }
            if (est.aberto !== 'grade') alternar('grade');
            focar('busca-grade');
        }

        async function carregarSistemas(forcar) {
            const guardada = forcar ? null : lerCache();
            if (guardada) { est.sistemas = { situacao: 'ok', lista: guardada }; return; }
            if (est.sistemas.situacao === 'carregando') return;
            est.sistemas = { situacao: 'carregando', lista: [] };
            preencherLista();
            try {
                const { data, error } = await core.acesso.conexao().rpc('sge_meus_sistemas');
                if (error) throw error;
                const lista = data && data.ativo && Array.isArray(data.sistemas) ? data.sistemas : [];
                guardarCache(lista);
                est.sistemas = { situacao: 'ok', lista };
            } catch (e) {
                console.warn('[SGE] Barra: não consegui listar os sistemas.', e);
                est.sistemas = { situacao: 'erro', lista: [] };
            }
            if (host.isConnected) preencherLista(); // a barra pode ter sido retirada enquanto esperava
        }

        async function carregarUsuario() {
            const a = core.acesso;
            if (a.usuario) {
                est.usuario = { nome: a.usuario.nome, email: a.usuario.email, papel: a.papel };
            } else {
                try {
                    const { data } = await a.conexao().auth.getSession();
                    const u = data && data.session && data.session.user;
                    const meta = (u && u.user_metadata) || {};
                    est.usuario = u ? { nome: meta.full_name || meta.nome || u.email, email: u.email || '', papel: null } : null;
                } catch (_) { est.usuario = null; }
            }
            if (host.isConnected) desenhar();
        }

        function alternarTema() {
            const novo = temaEscuro() ? 'claro' : 'escuro';
            document.documentElement.setAttribute('data-tema', novo);
            try { localStorage.setItem(CHAVE_TEMA, novo); } catch (_) { /* sem localStorage: vale até recarregar */ }
            window.dispatchEvent(new CustomEvent('sge:tema', { detail: { tema: novo } }));
            desenhar();
        }

        function entrar() { core.acesso.irParaLogin(op.sistema); }

        function sair() {
            fechar();
            try { sessionStorage.removeItem(CHAVE_CACHE); } catch (_) { /* nada guardado */ }
            if (op.aoSair) op.aoSair(); else core.acesso.sair(op.sistema);
        }

        function teclas(ev) {
            if ((ev.ctrlKey || ev.metaKey) && !ev.altKey && (ev.key === 'k' || ev.key === 'K')) {
                ev.preventDefault();
                buscar();
                return;
            }
            if (ev.key === 'Escape' && est.aberto) {
                const chave = est.aberto;
                fechar();
                focar(chave);
            }
        }

        function cliqueFora(ev) {
            if (est.aberto && ev.composedPath().indexOf(host) === -1) fechar();
        }

        document.addEventListener('keydown', teclas);
        document.addEventListener('mousedown', cliqueFora);
        window.addEventListener('popstate', desenhar);
        window.addEventListener('hashchange', desenhar);

        aplicarTemaGuardado();
        desenhar();
        carregarUsuario();

        const api = {
            host,
            atualizar(parcial) { Object.assign(op, parcial || {}); desenhar(); carregarUsuario(); },
            contador(href, n) { est.contadores[href] = Math.max(0, Number(n) || 0); desenhar(); },
            abrir(chave) { if (est.aberto !== (chave || 'grade')) alternar(chave || 'grade'); },
            fechar,
            destruir() {
                document.removeEventListener('keydown', teclas);
                document.removeEventListener('mousedown', cliqueFora);
                window.removeEventListener('popstate', desenhar);
                window.removeEventListener('hashchange', desenhar);
                host.remove();
                if (instancia === api) instancia = null;
            },
        };
        instancia = api;
        return api;
    }

    SGE.barra = {
        versao: '1.2.0',
        montar,
        _regras: { enderecoNoPortal, corValida, agruparPorArea, prepararSistemas, telaAtual, secoesVisiveis, iniciais },
    };
    if (window.SGECore) window.SGECore.barra = SGE.barra;
})();
