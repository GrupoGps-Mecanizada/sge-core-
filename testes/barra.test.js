// Testes da Barra Universal (sge-core 1.2): sge-icones.js + sge-barra.js.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { montar, supabaseFalso, pausa } = require('./ajuda');

const puro = (v) => JSON.parse(JSON.stringify(v)); // objeto do jsdom → objeto comum

test('ícones: conhecido, desconhecido e apelido', () => {
    const { w, fechar } = montar({ extras: ['sge-icones.js'] });
    const svg = w.SGE.icone('truck', 20);
    assert.equal(svg.getAttribute('data-icone'), 'truck');
    assert.equal(svg.getAttribute('width'), '20');
    assert.ok(svg.childNodes.length > 0);
    assert.equal(w.SGE.icone('nao-existe').getAttribute('data-icone'), 'grade');
    assert.equal(w.SGE.icone('default').getAttribute('data-icone'), 'grade');
    assert.ok(w.SGE.icones.includes('hard-hat'));
    ['truck', 'clipboard', 'tablet', 'ruler', 'wrench', 'box', 'users', 'check-circle', 'clock', 'shield']
        .forEach((n) => assert.equal(w.SGE.icone(n).getAttribute('data-icone'), n, n));
    fechar();
});

test('regras: endereço, cor, tela ativa, iniciais', () => {
    const { w, fechar } = montar({ extras: ['sge-icones.js', 'sge-barra.js'] });
    const r = w.SGE.barra._regras;
    assert.equal(r.enderecoNoPortal('https://grupogps-mecanizada.github.io/Gest-o-Efetivo/?a=1'), '/Gest-o-Efetivo/?a=1');
    assert.equal(r.enderecoNoPortal('/sst/'), '/sst/');
    assert.equal(r.enderecoNoPortal('https://outro.web.app/x'), 'https://outro.web.app/x');
    ['javascript:alert(1)', '//mal.com/', '/\\mal.com', 'https://a.com/\u0000', '', null]
        .forEach((u) => assert.equal(r.enderecoNoPortal(u), null, String(u)));
    assert.equal(r.corValida('#15803D'), '#15803D');
    ['vermelho', '#fff', 'url(x)', null].forEach((c) => assert.equal(r.corValida(c), null, String(c)));
    const secoes = [{ href: '/sst/' }, { itens: [{ href: '/sst/matriz' }, { href: '/sst/matriz-velha' }] }];
    assert.equal(r.telaAtual(secoes, '/sst/matriz'), '/sst/matriz');
    assert.equal(r.telaAtual(secoes, '/sst/matriz/123'), '/sst/matriz');
    assert.equal(r.telaAtual(secoes, '/sst/outra'), '/sst/');
    assert.equal(r.telaAtual(secoes, '/gestao/'), null);
    const porHash = [{ href: '#inicio' }, { itens: [{ href: '#matriz' }, { href: '/sst/?aba=2' }] }];
    assert.equal(r.telaAtual(porHash, '#matriz'), '#matriz');
    assert.equal(r.telaAtual(porHash, '#inicio'), '#inicio');
    assert.equal(r.telaAtual(porHash, '/sst/'), '/sst/?aba=2');
    assert.equal(r.iniciais('Maria Teste'), 'MT');
    assert.equal(r.iniciais('warlison@sge.com'), 'WA');
    assert.equal(r.iniciais(''), '?');
    const vis = r.secoesVisiveis([{ rotulo: 'A', itens: [{ tela: 'x' }, { tela: 'y' }] }, { rotulo: 'B', itens: [{ tela: 'z' }] }], (t) => t !== 'y' && t !== 'z');
    assert.deepEqual(puro(vis.map((s) => [s.rotulo, s.itens.length])), [['A', 1]]);
    const grupos = r.agruparPorArea([{ nome: 'B', area_menu: 'Pessoal', ordem: 2 }, { nome: 'A', area_menu: 'Pessoal', ordem: 1 }, { nome: 'C' }, { nome: 'D', area_menu: 'Frota' }]);
    assert.deepEqual(puro(grupos.map((g) => [g.area, g.sistemas.map((s) => s.nome).join('')])), [['Frota', 'D'], ['Pessoal', 'AB'], ['Outros', 'C']]);
    fechar();
});

// ── A barra na tela ──────────────────────────────────────

const SISTEMAS = [
    { slug: 'sst', nome: 'SST', icone: 'hard-hat', cor: '#15803d', area_menu: 'Segurança', ordem: 1, url_origem: '/sst/', abre_fora: false },
    { slug: 'efetivo', nome: 'Gestão de Efetivo', icone: 'users', cor: '#1d4ed8', area_menu: 'Pessoal', ordem: 1, url_origem: 'https://grupogps-mecanizada.github.io/Gest-o-Efetivo/', abre_fora: false },
    { slug: 'horas', nome: 'Horas Extras', icone: 'nao-existe', cor: 'vermelho', area_menu: 'Pessoal', ordem: 2, url_origem: 'https://outro.web.app/', abre_fora: true },
    { slug: 'mau', nome: 'Mau', icone: 'x', cor: null, area_menu: null, ordem: null, url_origem: 'javascript:alert(1)', abre_fora: false },
];
const SECOES = [
    { rotulo: 'Início', icone: 'home', href: '/sst/' },
    { rotulo: 'Colaboradores', icone: 'users', texto: 'Consultar e cadastrar pessoas', itens: [
        { rotulo: 'Matriz', texto: 'Quem tem cada requisito', href: '/sst/matriz', icone: 'clipboard-check', grupo: 'Consultas', tela: 'painel' },
        { rotulo: 'Segredo', texto: 'Só admin', href: '/sst/segredo', icone: 'shield', grupo: 'Consultas', tela: 'admin' },
    ] },
    { rotulo: 'Configurações', icone: 'settings', itens: [{ rotulo: 'Auditoria', href: '/sst/auditoria', tela: 'admin' }] },
];
const silenciar = (w) => { w.console.warn = () => {}; w.console.error = () => {}; };
const sistemasRpc = (supa) => supa.chamadas.rpc.filter(([n]) => n === 'sge_meus_sistemas').length;
const tecla = (w, o) => w.document.dispatchEvent(new w.KeyboardEvent('keydown', Object.assign({ bubbles: true, cancelable: true }, o)));
const LOGIN = /sso_login\.html\?app_slug=sst/;

async function abrir({ opcoes = {}, cfg = {}, entrar = false, url = 'https://sge-portal.pages.dev/sst/matriz' } = {}) {
    const supa = supabaseFalso(Object.assign({ sistemas: { data: { ativo: true, nome: 'Maria Teste', sistemas: SISTEMAS }, error: null } }, cfg));
    const m = montar({ supa, url, extras: ['sge-icones.js', 'sge-barra.js'], antes: silenciar });
    if (entrar) await m.w.SGE.acesso.entrar('sst');
    const barra = m.w.SGE.barra.montar(Object.assign({ sistema: 'sst', nome: 'SST', area: 'Mecanizada', inicio: '/sst/', secoes: SECOES }, opcoes));
    await pausa(5);
    const raiz = barra.host.shadowRoot;
    return Object.assign(m, { supa, barra, raiz, $: (s) => raiz.querySelector(s), $$: (s) => [...raiz.querySelectorAll(s)] });
}

test('montar sem slug dá erro claro', () => {
    const { w, fechar } = montar({ extras: ['sge-icones.js', 'sge-barra.js'] });
    assert.throws(() => w.SGE.barra.montar({}), /slug/);
    fechar();
});

test('desenha logo, nome, área e menus; estilo fica dentro da sombra; tela ativa marcada', async () => {
    const t = await abrir();
    assert.equal(t.w.document.body.firstChild, t.barra.host);
    assert.ok(t.$('style'));
    assert.equal(t.w.document.head.querySelector('style[data-sge-barra]'), null);
    assert.equal(t.$('.nome strong').textContent, 'SST');
    assert.equal(t.$('.nome .sub').textContent, 'Mecanizada');
    assert.deepEqual(t.$$('.menu .botao-menu').map((b) => b.textContent.trim()), ['Início', 'Colaboradores', 'Configurações']);
    assert.ok(t.$('[data-chave="secao-1"]').classList.contains('ativo'));
    assert.ok(!t.$('.menu > a.botao-menu').classList.contains('ativo'));
    t.fechar();
});

test('permissões: item e seção sem acesso somem (depois do SGE.acesso.entrar)', async () => {
    const t = await abrir({ entrar: true });
    assert.deepEqual(t.$$('.menu .botao-menu').map((b) => b.textContent.trim()), ['Início', 'Colaboradores']);
    t.$('[data-chave="secao-1"]').click();
    assert.deepEqual(t.$$('.suspenso .item-rotulo').map((i) => i.textContent), ['Matriz']);
    t.fechar();
});

test('submenu: abre, mostra a tela atual, Esc fecha e devolve o foco', async () => {
    const t = await abrir();
    t.$('[data-chave="secao-1"]').click();
    assert.equal(t.$('[data-chave="secao-1"]').getAttribute('aria-expanded'), 'true');
    const matriz = t.$$('.suspenso a.item').find((a) => a.getAttribute('href') === '/sst/matriz');
    assert.equal(matriz.getAttribute('aria-current'), 'page');
    assert.equal(t.$('.suspenso .dica').textContent, 'Consultar e cadastrar pessoas');
    assert.equal(t.$('.suspenso .grupo-titulo').textContent, 'Consultas');
    tecla(t.w, { key: 'Escape' });
    assert.equal(t.$('.suspenso'), null);
    assert.equal(t.raiz.activeElement, t.$('[data-chave="secao-1"]'));
    t.fechar();
});

test('clique fora fecha', async () => {
    const t = await abrir();
    t.$('[data-chave="secao-1"]').click();
    t.w.document.body.dispatchEvent(new t.w.MouseEvent('mousedown', { bubbles: true }));
    assert.equal(t.$('.suspenso'), null);
    t.fechar();
});

test('grade: agrupa por área, marca o atual, endereços seguros, abre fora em nova aba', async () => {
    const t = await abrir();
    t.$('[data-chave="grade"]').click();
    await pausa(5);
    assert.deepEqual(t.$$('.grade .area').map((a) => a.textContent), ['Pessoal', 'Segurança']);
    const lad = t.$$('.ladrilho');
    assert.deepEqual(lad.map((a) => a.textContent), ['Gestão de Efetivo', 'Horas Extras', 'SST']);
    assert.equal(lad[0].getAttribute('href'), '/Gest-o-Efetivo/');
    assert.equal(lad[1].getAttribute('href'), 'https://outro.web.app/');
    assert.equal(lad[1].getAttribute('target'), '_blank');
    assert.equal(lad[1].getAttribute('rel'), 'noopener');
    assert.equal(lad[1].querySelector('svg').getAttribute('data-icone'), 'grade');
    assert.equal(lad[2].getAttribute('aria-current'), 'page');
    assert.equal(lad[2].querySelector('.quadrado').style.getPropertyValue('--cor'), '#15803d');
    assert.equal(t.$('.rodape').getAttribute('href'), 'https://sge-portal.pages.dev/');
    t.fechar();
});

test('grade: guarda a lista por 5 minutos (uma consulta só)', async () => {
    const t = await abrir();
    t.$('[data-chave="grade"]').click(); await pausa(5);
    tecla(t.w, { key: 'Escape' });
    t.$('[data-chave="grade"]').click(); await pausa(5);
    assert.equal(sistemasRpc(t.supa), 1);
    assert.equal(t.$$('.ladrilho').length, 3);
    t.fechar();
});

test('grade: erro mostra Tentar de novo, que consulta de novo', async () => {
    let vez = 0;
    const t = await abrir({ cfg: { sistemas: () => (++vez === 1 ? { data: null, error: { message: 'Failed to fetch' } } : { data: { ativo: true, sistemas: SISTEMAS }, error: null }) } });
    t.$('[data-chave="grade"]').click(); await pausa(5);
    assert.match(t.$('.grade').textContent, /Não consegui carregar seus sistemas/);
    t.$('.vazio button').click(); await pausa(5);
    assert.equal(t.$$('.ladrilho').length, 3);
    assert.equal(sistemasRpc(t.supa), 2);
    t.fechar();
});

test('grade: busca sem acento filtra e o campo não é recriado', async () => {
    const t = await abrir();
    t.$('[data-chave="grade"]').click(); await pausa(5);
    const campo = t.$('[data-chave="busca-grade"]');
    campo.value = 'GESTAO';
    campo.dispatchEvent(new t.w.Event('input', { bubbles: true }));
    assert.deepEqual(t.$$('.ladrilho').map((a) => a.textContent), ['Gestão de Efetivo']);
    assert.equal(t.$('[data-chave="busca-grade"]'), campo);
    campo.value = 'zzz';
    campo.dispatchEvent(new t.w.Event('input', { bubbles: true }));
    assert.match(t.$('.lista-grade').textContent, /Nenhum sistema encontrado/);
    t.fechar();
});

test('Ctrl+K: chama aoBuscar do sistema; sem ele, abre a grade com a busca', async () => {
    let chamou = 0;
    const t = await abrir({ opcoes: { aoBuscar: () => chamou++ } });
    tecla(t.w, { key: 'k', ctrlKey: true });
    assert.equal(chamou, 1);
    t.barra.atualizar({ aoBuscar: null });
    tecla(t.w, { key: 'k', ctrlKey: true });
    assert.ok(t.$('.grade'));
    assert.equal(t.raiz.activeElement && t.raiz.activeElement.getAttribute('data-chave'), 'busca-grade');
    t.fechar();
});

test('aoNavegar: sistema SPA troca de tela sem recarregar', async () => {
    const idas = [];
    const t = await abrir({ opcoes: { aoNavegar: (href) => idas.push(href) } });
    t.$('[data-chave="secao-1"]').click();
    const link = t.$$('.suspenso a.item').find((a) => a.getAttribute('href') === '/sst/matriz');
    const ev = new t.w.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    link.dispatchEvent(ev);
    assert.deepEqual(idas, ['/sst/matriz']);
    assert.equal(ev.defaultPrevented, true);
    assert.equal(t.$('.suspenso'), null);
    t.fechar();
});

test('contador: número na seção e no item; 0 esconde', async () => {
    const t = await abrir();
    t.barra.contador('/sst/matriz', 3);
    assert.equal(t.$('[data-chave="secao-1"] .selo').textContent, '3');
    t.$('[data-chave="secao-1"]').click();
    assert.equal(t.$('.suspenso .selo').textContent, '3');
    t.barra.contador('/sst/matriz', 0);
    assert.equal(t.$('.selo'), null);
    t.fechar();
});

test('usuário: iniciais, nome, papel e Sair vai para o login', async () => {
    const t = await abrir({ entrar: true });
    const avatar = t.$('[data-chave="usuario"]');
    assert.equal(avatar.textContent, 'MT');
    avatar.click();
    assert.match(t.$('.usuario').textContent, /Maria Teste/);
    assert.match(t.$('.usuario').textContent, /GESTOR/);
    t.$('.usuario .acao').click();
    await pausa(10);
    assert.equal(t.idas.length, 1);
    assert.match(t.idas[0], LOGIN);
    t.fechar();
});

test('sem sessão: mostra Entrar, que leva ao login', async () => {
    const t = await abrir({ cfg: { sessao: null } });
    const botao = t.$('[data-chave="entrar"]');
    assert.equal(botao.textContent, 'Entrar');
    botao.click();
    assert.match(t.idas[0], LOGIN);
    t.fechar();
});

test('texto vindo de fora nunca vira HTML', async () => {
    const perigo = '<img src=x onerror=alert(1)>';
    const t = await abrir({ opcoes: { nome: perigo, area: perigo }, cfg: { sistemas: { data: { ativo: true, sistemas: [{ slug: 'x', nome: perigo, area_menu: perigo, url_origem: '/x/' }] }, error: null } } });
    t.$('[data-chave="grade"]').click(); await pausa(5);
    assert.equal(t.$$('img').length, 1); // só o logo
    assert.match(t.$('.nome').textContent, /<img src=x/);
    assert.match(t.$('.ladrilho').textContent, /<img src=x/);
    t.fechar();
});

test('tema: alterna, guarda e avisa', async () => {
    const t = await abrir();
    let aviso = null;
    t.w.addEventListener('sge:tema', (e) => { aviso = e.detail.tema; });
    t.$('[data-chave="tema"]').click();
    assert.equal(t.w.document.documentElement.getAttribute('data-tema'), 'escuro');
    assert.equal(t.w.localStorage.getItem('sge_tema'), 'escuro');
    assert.equal(aviso, 'escuro');
    t.$('[data-chave="tema"]').click();
    assert.equal(t.w.document.documentElement.getAttribute('data-tema'), 'claro');
    t.fechar();
});

test('celular: ☰ abre a gaveta com menus e Sair', async () => {
    const t = await abrir({ entrar: true });
    t.$('[data-chave="gaveta"]').click();
    const gaveta = t.$('.gaveta');
    assert.ok(gaveta);
    assert.deepEqual([...gaveta.querySelectorAll('.item-rotulo')].map((i) => i.textContent), ['Início', 'Matriz']);
    assert.match(gaveta.textContent, /Sair/);
    t.$('.gaveta-fundo').click();
    assert.equal(t.$('.gaveta'), null);
    t.fechar();
});

test('uma barra só por página; destruir tira a barra e o Ctrl+K', async () => {
    let chamou = 0;
    const t = await abrir();
    const segunda = t.w.SGE.barra.montar({ sistema: 'sst', nome: 'Outra', aoBuscar: () => chamou++ });
    assert.equal(t.w.document.querySelectorAll('sge-barra').length, 1);
    segunda.destruir();
    assert.equal(t.w.document.querySelectorAll('sge-barra').length, 0);
    tecla(t.w, { key: 'k', ctrlKey: true });
    assert.equal(chamou, 0);
    t.fechar();
});

// ── Correções da revisão final ───────────────────────────

test('revisão: tipografia própria (fonte do sistema não entra) e rótulos escondíveis no tablet', async () => {
    const t = await abrir();
    const css = t.$('style').textContent;
    assert.match(css, /.barra, .gaveta {[^}]*letter-spacing: normal/);
    assert.match(css, /.barra, .gaveta {[^}]*font-family:/);
    assert.ok(t.$('[data-chave="secao-1"] .rotulo'));
    assert.equal(t.$('[data-chave="secao-1"]').getAttribute('title'), 'Colaboradores');
    t.fechar();
});

test('revisão: redesenhar com a grade aberta não recria a busca nem perde o texto', async () => {
    const t = await abrir();
    t.$('[data-chave="grade"]').click(); await pausa(5);
    const campo = t.$('[data-chave="busca-grade"]');
    campo.value = 'efe';
    campo.dispatchEvent(new t.w.Event('input', { bubbles: true }));
    t.barra.contador('/sst/matriz', 2);
    assert.equal(t.$('[data-chave="busca-grade"]'), campo);
    assert.equal(campo.value, 'efe');
    assert.deepEqual(t.$$('.ladrilho').map((a) => a.textContent), ['Gestão de Efetivo']);
    t.fechar();
});

test('revisão: redesenhar com submenu aberto mantém o foco no item e não repete a animação', async () => {
    const t = await abrir();
    t.$('[data-chave="secao-1"]').click();
    const link = t.$$('.suspenso a.item')[0];
    link.focus();
    const chave = link.getAttribute('data-chave');
    assert.ok(chave);
    t.barra.contador('/sst/matriz', 4);
    assert.equal(t.raiz.activeElement && t.raiz.activeElement.getAttribute('data-chave'), chave);
    assert.ok(t.$('.suspenso').classList.contains('sem-animacao'));
    t.fechar();
});

test('revisão: depois do aoNavegar (SPA) a tela ativa acompanha a troca de endereço', async () => {
    const t = await abrir({ opcoes: { aoNavegar: (href) => t.w.history.pushState(null, '', href) } });
    const inicio = t.$('.menu > a.botao-menu');
    inicio.dispatchEvent(new t.w.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
    await pausa(5);
    assert.ok(t.$('.menu > a.botao-menu').classList.contains('ativo'));
    assert.ok(!t.$('[data-chave="secao-1"]').classList.contains('ativo'));
    t.fechar();
});

test('revisão: lista guardada é de cada usuário (não mostra a lista de outra pessoa)', async () => {
    const supa = supabaseFalso({ sistemas: { data: { ativo: true, sistemas: SISTEMAS }, error: null } });
    const m = montar({ supa, url: 'https://sge-portal.pages.dev/sst/', extras: ['sge-icones.js', 'sge-barra.js'], antes: (w) => {
        silenciar(w);
        const outra = JSON.stringify({ em: Date.now(), lista: [{ slug: 'z', nome: 'De outra pessoa', url_origem: '/z/' }] });
        w.sessionStorage.setItem('sge_barra_sistemas', outra);
        w.sessionStorage.setItem('sge_barra_sistemas:u-2', outra);
    } });
    const barra = m.w.SGE.barra.montar({ sistema: 'sst', nome: 'SST' });
    await pausa(5);
    barra.host.shadowRoot.querySelector('[data-chave="grade"]').click(); await pausa(5);
    assert.equal(sistemasRpc(supa), 1);
    assert.doesNotMatch(barra.host.shadowRoot.querySelector('.lista-grade').textContent, /De outra pessoa/);
    m.fechar();
});

test('revisão: sem "atual", endereços com # são marcados pelo location.hash', async () => {
    const t = await abrir({ url: 'https://sge-portal.pages.dev/app/#matriz', opcoes: { secoes: [
        { rotulo: 'Início', icone: 'home', href: '#inicio' },
        { rotulo: 'Colaboradores', icone: 'users', itens: [{ rotulo: 'Matriz', href: '#matriz' }] },
    ] } });
    assert.ok(t.$('[data-chave="secao-1"]').classList.contains('ativo'));
    t.fechar();
});

test('revisão: toque fora (pointerdown, iPad) fecha', async () => {
    const t = await abrir();
    t.$('[data-chave="secao-1"]').click();
    t.w.document.body.dispatchEvent(new t.w.Event('pointerdown', { bubbles: true }));
    assert.equal(t.$('.suspenso'), null);
    t.fechar();
});
