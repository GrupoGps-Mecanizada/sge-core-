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

    // __MONTAR__ (Task 4)

    SGE.barra = {
        versao: '1.2.0',
        montar: typeof montar === 'function' ? montar : () => { throw new Error('SGE.barra.montar ainda não existe.'); },
        _regras: { enderecoNoPortal, corValida, agruparPorArea, prepararSistemas, telaAtual, secoesVisiveis, iniciais },
    };
    if (window.SGECore) window.SGECore.barra = SGE.barra;
})();
