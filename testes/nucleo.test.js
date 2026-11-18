// Testes das peças que já existiam (v1.0): não podem quebrar.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { montar, supabaseFalso } = require('./ajuda');

function jwtFalso(role) {
    const corpo = Buffer.from(JSON.stringify({ role })).toString('base64url');
    return 'eyJhbGciOiJIUzI1NiJ9.' + corpo + '.assinatura';
}

test('carrega a versão 1.2.0 em SGE e SGECore', () => {
    const { w, fechar } = montar();
    assert.equal(w.SGE.versao, '1.2.0');
    assert.equal(w.SGECore.versao, '1.2.0');
    assert.equal(typeof w.SGE.acesso.entrar, 'function');
    fechar();
});

test('não apaga o window.SGE que o sistema já tinha', () => {
    const { w, fechar } = montar({ antes: (w) => { w.SGE = { auth: 'meu', aviso: 'meu aviso' }; } });
    assert.equal(w.SGE.auth, 'meu');
    assert.equal(w.SGE.aviso, 'meu aviso');      // o do sistema vence
    assert.equal(typeof w.SGE.core.aviso, 'function');
    assert.equal(typeof w.SGE.acesso.entrar, 'function');
    fechar();
});

test('SGE.cliente recusa a chave secreta (service_role)', () => {
    const supa = supabaseFalso();
    const { w, fechar } = montar({ supa });
    assert.throws(() => w.SGE.cliente('https://x.supabase.co', jwtFalso('service_role')), /secreta/);
    assert.throws(() => w.SGE.cliente('https://x.supabase.co', 'sb_secret_abc'), /secreta/);
    fechar();
});

test('SGE.cliente devolve a MESMA conexão para o mesmo projeto', () => {
    const supa = supabaseFalso();
    const { w, fechar } = montar({ supa });
    const a = w.SGE.cliente('https://x.supabase.co', jwtFalso('anon'));
    const b = w.SGE.cliente('https://x.supabase.co', jwtFalso('anon'));
    assert.equal(a, b);
    fechar();
});

test('SGE.cliente sem parâmetros usa o projeto da Central', () => {
    const supa = supabaseFalso();
    const { w, fechar } = montar({ supa });
    w.SGE.cliente();
    assert.equal(supa.chamadas.criado[0], 'https://mgcjidryrjqiceielmzp.supabase.co');
    fechar();
});

test('SGE.cliente avisa se o supabase-js não foi carregado', () => {
    const { w, fechar } = montar();
    assert.throws(() => w.SGE.cliente('https://x.supabase.co', jwtFalso('anon')), /supabase-js/);
    fechar();
});

test('SGE.erro traduz erros técnicos para linguagem simples', () => {
    const { w, fechar } = montar();
    const orig = w.console.error; w.console.error = () => {};
    assert.match(w.SGE.erro(new Error('TypeError: Failed to fetch')), /servidor/);
    assert.match(w.SGE.erro({ code: '42501', message: 'permission denied' }), /permissão/);
    assert.match(w.SGE.erro({ code: '23505' }), /já existe/);
    w.console.error = orig;
    fechar();
});

test('SGE.aviso mostra texto sem interpretar HTML', () => {
    const { w, fechar } = montar();
    const item = w.SGE.aviso('<img src=x onerror=alert(1)>', 'info');
    assert.equal(item.querySelector('img'), null);
    assert.match(item.textContent, /<img/);
    fechar();
});

test('SGE.formatar usa o padrão brasileiro', () => {
    const { w, fechar } = montar();
    assert.equal(w.SGE.formatar.moeda(1234.5).replace(/\s/g, ' '), 'R$ 1.234,50');
    assert.equal(w.SGE.formatar.numero(1234.567), '1.234,57');
    assert.equal(w.SGE.formatar.data(null), '');
    fechar();
});

test('SGE.rascunho guarda o formulário mas nunca a senha', () => {
    const { w, fechar } = montar({ html: '<form id="f"><input name="nome"><input name="senha" type="password"></form>' });
    const form = w.document.getElementById('f');
    w.SGE.rascunho.ligar(form);
    form.elements.nome.value = 'João';
    form.elements.senha.value = 'segredo';
    form.dispatchEvent(new w.Event('input'));
    assert.deepEqual(JSON.parse(JSON.stringify(w.SGE.rascunho.ler('f'))), { nome: 'João' });
    fechar();
});

test('carregando: tela cheia com a logo Grupo GPS + sge; data-sge-carregando ganha a linha do Medições sozinho', async () => {
    const { w, fechar } = montar({ html: '<div id="parte" data-sge-carregando="Carregando pendências…"></div>' });
    w.SGE.carregando(true, 'Conectando');
    const tela = w.document.querySelector('.sge-carregando');
    assert.ok(tela.querySelector('.sge-carga-gps .sge-carga-liq'), 'logo do Grupo GPS enchendo');
    assert.ok(tela.querySelector('.sge-carga-sge'), 'logo do sge embaixo');
    assert.equal(tela.querySelector('.sge-carga-etapa').textContent, 'Conectando');
    w.SGE.carregando(true, 'Carregando dados'); // nova etapa: o texto troca
    assert.equal(tela.querySelector('.sge-carga-etapa').textContent, 'Carregando dados');
    w.SGE.carregando(false);
    assert.ok(w.document.querySelector('.sge-carregando'), 'ainda falta um fechar');
    w.SGE.carregando(false);
    assert.equal(w.document.querySelector('.sge-carregando'), null); // espera curta: some na hora
    await new Promise((r) => setTimeout(r, 0)); // espera a página terminar de abrir
    const parte = w.document.getElementById('parte');
    assert.ok(parte.querySelector(':scope > .sge-linha-carga'));
    assert.ok(parte.classList.contains('sge-carregando-local'));
    assert.equal(parte.getAttribute('aria-label'), 'Carregando pendências…');
    // marcado depois que a página abriu também ganha
    const novo = w.document.createElement('div');
    novo.setAttribute('data-sge-carregando', '');
    w.document.body.appendChild(novo);
    await new Promise((r) => setTimeout(r, 0));
    assert.ok(novo.querySelector('.sge-linha-carga'));
    assert.ok(w.SGE.logoCarregando().classList.contains('sge-linha-carga'));
    fechar();
});

test('seguro: o "salvando" aparece no botão apertado, depois ✓ e volta ao normal', async () => {
    const { w, fechar } = montar({ html: '<button id="b"><b>Salvar</b></button><button id="c">Excluir</button>' });
    const b = w.document.getElementById('b');
    let soltar;
    b.addEventListener('click', () => { w.SGE.seguro(() => new Promise((r) => { soltar = r; }), { texto: 'Salvando…' }); });
    b.click();
    assert.ok(b.querySelector('.sge-anel'));
    assert.ok(b.disabled);
    assert.match(b.textContent, /Salvando/);
    assert.equal(w.document.querySelector('.sge-carregando'), null, 'sem tela cheia');
    soltar({ data: 1 });
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(b.textContent, '✓Salvo');
    await new Promise((r) => setTimeout(r, 1300));
    assert.equal(b.innerHTML, '<b>Salvar</b>');
    assert.equal(b.disabled, false);
    // deu erro: volta na hora, sem ✓
    const c = w.document.getElementById('c');
    c.addEventListener('click', () => { w.SGE.seguro(async () => ({ error: { message: 'falhou' } })); });
    c.click();
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(c.textContent, 'Excluir');
    // sem botão apertado: tela cheia, como antes
    let fim;
    const p = w.SGE.seguro(() => new Promise((r) => { fim = r; }), { botao: false });
    assert.ok(w.document.querySelector('.sge-carregando'));
    fim(null); await p;
    fechar();
});

test('portal antigo aberto: o sge-core novo recarrega a página de cima uma vez (trava de 2 min)', () => {
    const { w, fechar } = montar({ html: '' });
    const P = w.SGE;
    assert.equal(P._ePortalAntigo({ registrarBarra() {} }), true, 'sem versão = antigo');
    assert.equal(P._ePortalAntigo({ registrarBarra() {}, versao: 2 }), false, 'portal novo');
    assert.equal(P._ePortalAntigo(null), false);
    const guardado = {};
    let recarregou = 0;
    const topo = { SGEPortal: { registrarBarra() {} }, sessionStorage: { getItem: (k) => guardado[k] || null, setItem: (k, v) => { guardado[k] = v; } }, location: { reload: () => { recarregou++; } } };
    const janela = { top: topo };
    assert.equal(P._recarregarPortalAntigo(janela), true);
    assert.equal(P._recarregarPortalAntigo(janela), false, 'trava: não recarrega de novo logo em seguida');
    assert.equal(recarregou, 1);
    topo.SGEPortal.versao = 2; delete guardado.sge_recarregou_portal;
    assert.equal(P._recarregarPortalAntigo(janela), false, 'portal novo: não recarrega');
    const solta = { top: null }; solta.top = solta;
    assert.equal(P._recarregarPortalAntigo(solta), false, 'fora de moldura: nada');
    fechar();
});
