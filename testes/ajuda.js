// Ajudantes dos testes: monta uma página falsa (jsdom) com um Supabase falso.
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const CODIGO = fs.readFileSync(path.join(__dirname, '..', 'v1', 'sge-core.js'), 'utf8');

const PERM_OK = {
    usuario_id: 'u-1', nome: 'Maria Teste', email: 'maria@gestaogps.com.br',
    sistema: 'teste', sistema_nome: 'Sistema de Teste', papel: 'GESTOR',
    telas: ['painel', 'relatorios'], colunas: null, setores: null,
    precisa_aprovacao: false, aprova_lancamentos: true, admin_central: false,
};

const SESSAO = { access_token: 'token-falso', user: { id: 'u-1', email: 'maria@gestaogps.com.br' } };

// cfg.perm / cfg.manut: { data, error } ou função que devolve isso.
function supabaseFalso(cfg = {}) {
    const resp = (v, padrao) => (typeof v === 'function' ? v() : v === undefined ? padrao : v);
    const chamadas = { rpc: [], from: [], signOut: [], canais: [], track: [], untrack: 0, removidos: 0, criado: null };
    const cliente = {
        auth: {
            getSession: async () => ({
                data: { session: cfg.sessao === undefined ? SESSAO : cfg.sessao },
                error: cfg.erroSessao || null,
            }),
            onAuthStateChange: (fn) => { chamadas.ouvinteAuth = fn; return { data: { subscription: { unsubscribe() {} } } }; },
            signOut: async (o) => { chamadas.signOut.push(o); return { error: null }; },
        },
        schema() { return cliente; },
        rpc: async (nome, args) => { chamadas.rpc.push([nome, args]); return resp(cfg.perm, { data: PERM_OK, error: null }); },
        from: (tabela) => {
            chamadas.from.push(tabela);
            const q = { select: () => q, eq: () => q, limit: async () => resp(cfg.manut, { data: [], error: null }) };
            return q;
        },
        channel: (nome, opcoes) => {
            const c = {
                nome, opcoes,
                subscribe(fn) { fn('SUBSCRIBED'); return c; },
                track: async (p) => { chamadas.track.push(JSON.parse(JSON.stringify(p))); return 'ok'; },
                untrack: async () => { chamadas.untrack++; return 'ok'; },
            };
            chamadas.canais.push(c);
            return c;
        },
        removeChannel: () => { chamadas.removidos++; },
    };
    return {
        cliente,
        chamadas,
        createClient: (url, chave, opcoes) => { chamadas.criado = [url, chave, opcoes]; return cliente; },
    };
}

function montar({ url = 'https://grupogps-mecanizada.github.io/gestao/', html = '', supa, antes } = {}) {
    const dom = new JSDOM(`<!doctype html><html><head></head><body>${html}</body></html>`, {
        url, runScripts: 'outside-only', pretendToBeVisual: true,
    });
    const w = dom.window;
    if (supa) w.supabase = { createClient: supa.createClient };
    if (antes) antes(w);
    w.eval(CODIGO);
    const idas = [];
    if (w.SGE && w.SGE.acesso) w.SGE.acesso._ir = (u) => idas.push(u);
    return { w, idas, fechar: () => w.close() };
}

// Espera a promessa por pouco tempo: devolve { resolveu, valor }.
function esperar(promessa, ms = 60) {
    return Promise.race([
        promessa.then((valor) => ({ resolveu: true, valor })),
        new Promise((r) => setTimeout(() => r({ resolveu: false }), ms)),
    ]);
}

const pausa = (ms = 0) => new Promise((r) => setTimeout(r, ms));

module.exports = { montar, supabaseFalso, esperar, pausa, PERM_OK, SESSAO };
