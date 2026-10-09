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
    assert.equal(r.iniciais('Maria Teste'), 'MT');
    assert.equal(r.iniciais('warlison@sge.com'), 'WA');
    assert.equal(r.iniciais(''), '?');
    const vis = r.secoesVisiveis([{ rotulo: 'A', itens: [{ tela: 'x' }, { tela: 'y' }] }, { rotulo: 'B', itens: [{ tela: 'z' }] }], (t) => t !== 'y' && t !== 'z');
    assert.deepEqual(puro(vis.map((s) => [s.rotulo, s.itens.length])), [['A', 1]]);
    const grupos = r.agruparPorArea([{ nome: 'B', area_menu: 'Pessoal', ordem: 2 }, { nome: 'A', area_menu: 'Pessoal', ordem: 1 }, { nome: 'C' }, { nome: 'D', area_menu: 'Frota' }]);
    assert.deepEqual(puro(grupos.map((g) => [g.area, g.sistemas.map((s) => s.nome).join('')])), [['Frota', 'D'], ['Pessoal', 'AB'], ['Outros', 'C']]);
    fechar();
});
