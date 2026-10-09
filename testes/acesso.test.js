// Testes do SGE.acesso (v1.1): login único da Central + permissões.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { montar, supabaseFalso, esperar, pausa, PERM_OK } = require('./ajuda');

const LOGIN = 'https://grupogps-mecanizada.github.io/SGE-CENTRAL/sso_login.html';
const silenciar = (w) => { w.console.warn = () => {}; w.console.error = () => {}; };
const puro = (v) => JSON.parse(JSON.stringify(v)); // objeto do jsdom → objeto comum
const tela = (w) => w.document.querySelector('.sge-acesso-tela');

test('entrar sem slug dá erro claro', () => {
    const { w, fechar } = montar({ supa: supabaseFalso() });
    assert.throws(() => w.SGE.acesso.entrar(''), /slug/);
    fechar();
});

test('sem sessão: vai para o login da Central com app_slug e redirect, e não continua', async () => {
    const supa = supabaseFalso({ sessao: null });
    const { w, idas, fechar } = montar({ supa });
    const r = await esperar(w.SGE.acesso.entrar('gestao_efetivo'));
    assert.equal(r.resolveu, false);
    assert.equal(idas.length, 1);
    const destino = new URL(idas[0]);
    assert.equal(destino.origin + destino.pathname, LOGIN);
    assert.equal(destino.searchParams.get('app_slug'), 'gestao_efetivo');
    assert.equal(destino.searchParams.get('redirect'), 'https://grupogps-mecanizada.github.io/gestao/');
    assert.equal(supa.chamadas.rpc.length, 0);
    fechar();
});

test('tira o sso_token antigo da barra de endereço (e não usa ele)', async () => {
    const supa = supabaseFalso();
    const { w, fechar } = montar({ supa, url: 'https://grupogps-mecanizada.github.io/gestao/?sso_token=abc.def.ghi&aba=2' });
    await w.SGE.acesso.entrar('teste');
    assert.equal(w.location.search, '?aba=2');
    fechar();
});

test('com permissão: entra e expõe usuario, papel e permissoes', async () => {
    const supa = supabaseFalso();
    const { w, fechar } = montar({ supa });
    const r = await esperar(w.SGE.acesso.entrar('teste'));
    assert.equal(r.resolveu, true);
    assert.equal(r.valor.papel, 'GESTOR');
    assert.deepEqual(puro(supa.chamadas.rpc[0]), ['sge_minhas_permissoes', { p_slug: 'teste' }]);
    assert.equal(w.SGE.acesso.papel, 'GESTOR');
    assert.deepEqual(puro(w.SGE.acesso.usuario), { id: 'u-1', nome: 'Maria Teste', email: 'maria@gestaogps.com.br' });
    assert.equal(w.SGE.acesso.permissoes.aprova_lancamentos, true);
    assert.equal(w.document.documentElement.classList.contains('sge-acesso-pendente'), false);
    assert.equal(tela(w), null);
    fechar();
});

test('chamar entrar duas vezes faz uma conferência só', async () => {
    const supa = supabaseFalso();
    const { w, fechar } = montar({ supa });
    const a = w.SGE.acesso.entrar('teste');
    const b = w.SGE.acesso.entrar('teste');
    assert.equal(a, b);
    await a;
    assert.equal(supa.chamadas.rpc.length, 1);
    fechar();
});

test('papel nulo: tela "Sem acesso" e não continua', async () => {
    const supa = supabaseFalso({ perm: { data: { ...PERM_OK, papel: null }, error: null } });
    const { w, idas, fechar } = montar({ supa });
    const r = await esperar(w.SGE.acesso.entrar('teste'));
    assert.equal(r.resolveu, false);
    assert.equal(tela(w).dataset.situacao, 'sem_acesso');
    assert.match(tela(w).textContent, /Sistema de Teste/);
    assert.ok(w.document.documentElement.classList.contains('sge-acesso-bloqueado'));
    assert.equal(w.SGE.acesso.papel, null);
    assert.equal(w.SGE.acesso.pode('painel'), false);
    assert.equal(idas.length, 0);
    fechar();
});

test('cadastro não encontrado (resposta vazia): tela "Sem acesso"', async () => {
    const supa = supabaseFalso({ perm: { data: null, error: null } });
    const { w, fechar } = montar({ supa });
    const r = await esperar(w.SGE.acesso.entrar('teste'));
    assert.equal(r.resolveu, false);
    assert.equal(tela(w).dataset.situacao, 'sem_acesso');
    fechar();
});

test('erro de rede NÃO deixa entrar', async () => {
    const supa = supabaseFalso({ perm: { data: null, error: { message: 'TypeError: Failed to fetch', code: '' } } });
    const { w, idas, fechar } = montar({ supa });
    silenciar(w);
    const r = await esperar(w.SGE.acesso.entrar('teste'));
    assert.equal(r.resolveu, false);
    assert.equal(tela(w).dataset.situacao, 'erro');
    assert.equal(idas.length, 0);
    fechar();
});

test('exceção inesperada também NÃO deixa entrar', async () => {
    const supa = supabaseFalso({ perm: () => { throw new Error('quebrou'); } });
    const { w, fechar } = montar({ supa });
    silenciar(w);
    const r = await esperar(w.SGE.acesso.entrar('teste'));
    assert.equal(r.resolveu, false);
    assert.equal(tela(w).dataset.situacao, 'erro');
    fechar();
});

test('falha ao conferir a manutenção NÃO deixa entrar', async () => {
    const supa = supabaseFalso({ manut: { data: null, error: { message: 'Failed to fetch' } } });
    const { w, fechar } = montar({ supa });
    silenciar(w);
    const r = await esperar(w.SGE.acesso.entrar('teste'));
    assert.equal(r.resolveu, false);
    assert.equal(tela(w).dataset.situacao, 'erro');
    fechar();
});

test('sessão vencida (401/JWT) manda para o login', async () => {
    const supa = supabaseFalso({ perm: { data: null, error: { message: 'JWT expired', code: 'PGRST301' } } });
    const { w, idas, fechar } = montar({ supa });
    const r = await esperar(w.SGE.acesso.entrar('teste'));
    assert.equal(r.resolveu, false);
    assert.equal(idas.length, 1);
    assert.ok(idas[0].startsWith(LOGIN));
    fechar();
});

test('sistema em manutenção: tela com a mensagem (como texto, sem HTML)', async () => {
    const msg = 'Volta logo <img src=x onerror=alert(1)>';
    const supa = supabaseFalso({ manut: { data: [{ mensagem: msg, previsao_fim: '2026-10-09T15:00:00Z' }], error: null } });
    const { w, fechar } = montar({ supa });
    const r = await esperar(w.SGE.acesso.entrar('teste'));
    assert.equal(r.resolveu, false);
    assert.equal(tela(w).dataset.situacao, 'manutencao');
    assert.equal(tela(w).querySelector('img'), null);
    assert.match(tela(w).textContent, /Volta logo <img/);
    assert.match(tela(w).textContent, /Previsão de volta/);
    fechar();
});

test('vai-e-volta infinito com o login vira tela de aviso', async () => {
    const supa = supabaseFalso({ sessao: null });
    const { w, idas, fechar } = montar({ supa });
    w.sessionStorage.setItem('sge_acesso_voltas', JSON.stringify([Date.now(), Date.now(), Date.now()]));
    await esperar(w.SGE.acesso.entrar('teste'));
    assert.equal(idas.length, 0);
    assert.equal(tela(w).dataset.situacao, 'voltas');
    fechar();
});

test('pode / podeColuna / temPapel seguem a regra do banco (lista nula = tudo)', async () => {
    const supa = supabaseFalso({ perm: { data: { ...PERM_OK, colunas: ['nome'] }, error: null } });
    const { w, fechar } = montar({ supa });
    assert.equal(w.SGE.acesso.pode('painel'), false); // antes de entrar: nada
    await w.SGE.acesso.entrar('teste');
    const a = w.SGE.acesso;
    assert.equal(a.pode('painel'), true);
    assert.equal(a.pode('financeiro'), false);
    assert.equal(a.podeColuna('nome'), true);
    assert.equal(a.podeColuna('salario'), false);
    assert.equal(a.temPapel('ADMIN', 'GESTOR'), true);
    assert.equal(a.temPapel(['admin', ' gestor ']), true);
    assert.equal(a.temPapel('ADMIN'), false);
    fechar();
});

test('esconde data-sge-tela, data-sge-coluna e data-sge-papel que a pessoa não pode ver', async () => {
    const supa = supabaseFalso({ perm: { data: { ...PERM_OK, colunas: ['nome'] }, error: null } });
    const html = `
        <nav id="t1" data-sge-tela="painel"></nav>
        <nav id="t2" data-sge-tela="financeiro" style="display:flex"></nav>
        <span id="c1" data-sge-coluna="nome"></span>
        <span id="c2" data-sge-coluna="salario"></span>
        <button id="p1" data-sge-papel="ADMIN,GESTOR"></button>
        <button id="p2" data-sge-papel="ADMIN"></button>`;
    const { w, fechar } = montar({ supa, html });
    await w.SGE.acesso.entrar('teste');
    const oculto = (id) => w.document.getElementById(id).style.display === 'none';
    assert.deepEqual(['t1', 't2', 'c1', 'c2', 'p1', 'p2'].map(oculto), [false, true, false, true, false, true]);
    fechar();
});

test('conteúdo criado depois também é escondido', async () => {
    const supa = supabaseFalso();
    const { w, fechar } = montar({ supa });
    await w.SGE.acesso.entrar('teste');
    const div = w.document.createElement('div');
    div.innerHTML = '<span id="novo" data-sge-tela="financeiro"></span><span id="ok" data-sge-tela="painel"></span>';
    w.document.body.appendChild(div);
    await pausa();
    assert.equal(w.document.getElementById('novo').style.display, 'none');
    assert.equal(w.document.getElementById('ok').style.display, '');
    fechar();
});

test('entra no radar "sge-radar" com os dados que a Central espera', async () => {
    const supa = supabaseFalso();
    const { w, fechar } = montar({ supa });
    await w.SGE.acesso.entrar('teste');
    await pausa();
    const canal = supa.chamadas.canais[0];
    assert.equal(canal.nome, 'sge-radar');
    const p = supa.chamadas.track[0];
    assert.equal(p.user_id, 'u-1');
    assert.equal(p.user_name, 'Maria Teste');
    assert.equal(p.app_slug, 'teste');
    assert.equal(p.app_name, 'Sistema de Teste');
    assert.equal(p.status, 'online');
    assert.equal(canal.opcoes.config.presence.key, p.session_id);
    fechar();
});

test('reconferir: acesso retirado derruba na hora e sai do radar', async () => {
    let perm = { data: PERM_OK, error: null };
    const supa = supabaseFalso({ perm: () => perm });
    const { w, fechar } = montar({ supa });
    await w.SGE.acesso.entrar('teste');
    perm = { data: { ...PERM_OK, papel: null }, error: null };
    assert.equal(await w.SGE.acesso.reconferir(), 'sem_acesso');
    assert.equal(tela(w).dataset.situacao, 'sem_acesso');
    assert.equal(w.SGE.acesso.papel, null);
    assert.equal(supa.chamadas.removidos, 1);
    fechar();
});

test('reconferir: manutenção iniciada derruba', async () => {
    let manut = { data: [], error: null };
    const supa = supabaseFalso({ manut: () => manut });
    const { w, fechar } = montar({ supa });
    await w.SGE.acesso.entrar('teste');
    manut = { data: [{ mensagem: 'Atualizando', previsao_fim: null }], error: null };
    assert.equal(await w.SGE.acesso.reconferir(), 'manutencao');
    assert.equal(tela(w).dataset.situacao, 'manutencao');
    fechar();
});

test('reconferir: falha de rede não derruba quem já entrou', async () => {
    let perm = { data: PERM_OK, error: null };
    const supa = supabaseFalso({ perm: () => perm });
    const { w, fechar } = montar({ supa });
    silenciar(w);
    await w.SGE.acesso.entrar('teste');
    perm = { data: null, error: { message: 'Failed to fetch' } };
    assert.equal(await w.SGE.acesso.reconferir(), 'erro');
    assert.equal(tela(w), null);
    assert.equal(w.SGE.acesso.papel, 'GESTOR');
    fechar();
});

test('reconferir: login vencido mostra "Sua sessão terminou"', async () => {
    let perm = { data: PERM_OK, error: null };
    const supa = supabaseFalso({ perm: () => perm });
    const { w, fechar } = montar({ supa });
    await w.SGE.acesso.entrar('teste');
    perm = { data: null, error: { status: 401, message: 'Unauthorized' } };
    await w.SGE.acesso.reconferir();
    assert.equal(tela(w).dataset.situacao, 'sessao_terminou');
    fechar();
});

test('reconferir: permissões novas valem sem recarregar a página', async () => {
    let perm = { data: PERM_OK, error: null };
    const supa = supabaseFalso({ perm: () => perm });
    const { w, fechar } = montar({ supa, html: '<a id="fin" data-sge-tela="financeiro"></a><a id="pai" data-sge-tela="painel"></a>' });
    await w.SGE.acesso.entrar('teste');
    assert.equal(w.document.getElementById('fin').style.display, 'none');
    perm = { data: { ...PERM_OK, telas: ['financeiro'] }, error: null };
    assert.equal(await w.SGE.acesso.reconferir(), 'ok');
    assert.equal(w.document.getElementById('fin').style.display, '');
    assert.equal(w.document.getElementById('pai').style.display, 'none');
    fechar();
});

test('sair encerra a sessão só neste navegador e volta ao login', async () => {
    const supa = supabaseFalso();
    const { w, idas, fechar } = montar({ supa });
    await w.SGE.acesso.entrar('teste');
    const r = await esperar(w.SGE.acesso.sair());
    assert.equal(r.resolveu, false); // a página para: está indo para o login
    assert.deepEqual(puro(supa.chamadas.signOut[0]), { scope: 'local' });
    assert.ok(idas[0].startsWith(LOGIN));
    assert.equal(w.SGE.acesso.papel, null);
    fechar();
});

test('Central no mesmo endereço do sistema (portal ou github.io)', () => {
    const casos = [
        ['https://sge-portal.pages.dev/Gest-o-Efetivo/', 'https://sge-portal.pages.dev/SGE-CENTRAL'],
        ['https://grupogps-mecanizada.github.io/Gest-o-Efetivo/', 'https://grupogps-mecanizada.github.io/SGE-CENTRAL'],
        ['http://localhost:5500/', 'https://grupogps-mecanizada.github.io/SGE-CENTRAL'],
    ];
    casos.forEach(([url, central]) => {
        const { w, fechar } = montar({ url, supa: supabaseFalso() });
        assert.equal(w.SGE.acesso.central, central);
        fechar();
    });
});

test('SGE_CENTRAL_URL_OVERRIDE vence a regra automática', () => {
    const { w, fechar } = montar({ supa: supabaseFalso(), antes: (w) => { w.SGE_CENTRAL_URL_OVERRIDE = 'http://localhost:8788/SGE-CENTRAL'; } });
    assert.equal(w.SGE.acesso.central, 'http://localhost:8788/SGE-CENTRAL');
    fechar();
});

test('irParaLogin(slug) funciona sem ter chamado entrar', async () => {
    const { w, idas, fechar } = montar({ url: 'https://sge-portal.pages.dev/', supa: supabaseFalso() });
    const r = await esperar(w.SGE.acesso.irParaLogin('sge_portal'));
    assert.equal(r.resolveu, false);
    const destino = new URL(idas[0]);
    assert.equal(destino.origin + destino.pathname, 'https://sge-portal.pages.dev/SGE-CENTRAL/sso_login.html');
    assert.equal(destino.searchParams.get('app_slug'), 'sge_portal');
    assert.equal(destino.searchParams.get('redirect'), 'https://sge-portal.pages.dev/');
    fechar();
});

test('sair(slug) usa o slug informado', async () => {
    const supa = supabaseFalso();
    const { w, idas, fechar } = montar({ url: 'https://sge-portal.pages.dev/', supa });
    w.SGE.cliente(); // portal cria a conexão sem chamar entrar
    await esperar(w.SGE.acesso.sair('sge_portal'));
    assert.equal(new URL(idas[0]).searchParams.get('app_slug'), 'sge_portal');
    fechar();
});

test('tipoDeErro separa login, rede e outros', () => {
    const { w, fechar } = montar({ supa: supabaseFalso() });
    assert.equal(w.SGE.acesso.tipoDeErro({ status: 401 }), 'login');
    assert.equal(w.SGE.acesso.tipoDeErro({ message: 'TypeError: Failed to fetch' }), 'rede');
    assert.equal(w.SGE.acesso.tipoDeErro({ code: '23505' }), 'outro');
    fechar();
});
