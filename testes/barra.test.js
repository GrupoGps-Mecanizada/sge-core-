// Testes da Barra Universal (sge-core 1.2): sge-icones.js + sge-barra.js.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { montar, supabaseFalso, pausa } = require('./ajuda');

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
