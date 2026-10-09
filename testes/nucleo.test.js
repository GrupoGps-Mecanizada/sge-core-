// Testes das peças que já existiam (v1.0): não podem quebrar.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { montar, supabaseFalso } = require('./ajuda');

function jwtFalso(role) {
    const corpo = Buffer.from(JSON.stringify({ role })).toString('base64url');
    return 'eyJhbGciOiJIUzI1NiJ9.' + corpo + '.assinatura';
}

test('carrega a versão 1.1.1 em SGE e SGECore', () => {
    const { w, fechar } = montar();
    assert.equal(w.SGE.versao, '1.1.1');
    assert.equal(w.SGECore.versao, '1.1.1');
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
