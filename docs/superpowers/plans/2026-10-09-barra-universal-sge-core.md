# Barra Universal — sge-core v1.2.0 — Plano de execução

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar no sge-core os ícones (`sge-icones.js`) e a barra de topo universal (`sge-barra.js`), testados e publicados, mais a migração que inclui `cor` em `sge_meus_sistemas`.

**Architecture:** Dois arquivos novos, em JavaScript puro (sem build), no mesmo estilo IIFE do `sge-core.js`. A barra é um elemento `<sge-barra>` com Shadow DOM (estilo isolado) montado por `SGE.barra.montar(opcoes)`; ela usa `SGE.acesso` (login/permissões), `SGE.acesso.conexao()` (nova, 1 linha no núcleo) e `rpc('sge_meus_sistemas')`. Regras puras ficam em `SGE.barra._regras` para teste.

**Tech Stack:** JavaScript ES2019 no navegador; testes `node --test` + jsdom 25 (já instalado); Supabase (projeto `mgcjidryrjqiceielmzp`).

**Spec:** `docs/superpowers/specs/2026-10-09-barra-universal-design.md`

## Global Constraints
- Só ferramentas gratuitas; nenhuma dependência nova no navegador além do supabase-js que os sistemas já carregam.
- Nenhuma chave secreta; a barra usa a conexão pública do `SGE.acesso`.
- Texto vindo do banco ou do sistema sempre por `textContent` (nunca `innerHTML`).
- Cores/fontes: variáveis `--sge-*` do `sge-core.css`, com os mesmos valores como reserva dentro da barra.
- Ícones: desenhos do Lucide (licença ISC), aviso de licença no topo do `sge-icones.js`.
- Textos para o usuário em português do Brasil, simples.
- Ordem de carga: supabase-js → `sge-core.js` → `sge-icones.js` → `sge-barra.js`.
- Testes: `npm test` (Node + jsdom) no `sge-core`; nenhum teste antigo pode quebrar.

## Review Focus
1. CSS do sistema (ex.: `a { color: red }`, `* { margin: 0 }`) não pode alterar a barra → estilo dentro do Shadow DOM (teste confere o `<style>` dentro da sombra).
2. Digitar na busca da grade não pode perder o cursor → só a lista é redesenhada (teste confere que o campo continua o mesmo).
3. Sessão vencida (401) ao abrir a grade → mostra "Não consegui carregar" + Tentar de novo, sem travar a barra (teste de erro).
4. Nome de sistema muito longo / muitos sistemas → nome corta em 2 linhas, grade rola (conferir no `teste-barra.html`).
5. `montar` chamado duas vezes (React StrictMode, SPA) → uma barra só (teste "uma barra só").

---

### Task 1: Base de testes e `SGE.acesso.conexao()`

**Files:**
- Modify: `testes/ajuda.js` (opção `extras` e resposta de `sge_meus_sistemas` no Supabase falso)
- Modify: `v1/sge-core.js` (versão 1.2.0, `acesso.conexao`, cabeçalho)
- Modify: `package.json` (versão 1.2.0)

**Interfaces:**
- Produces: `montar({ ..., extras: ['sge-icones.js', 'sge-barra.js'] })` nos testes; `supabaseFalso({ sistemas })` responde `rpc('sge_meus_sistemas')`; `SGE.acesso.conexao()` → cliente Supabase da Central (o mesmo objeto a cada chamada).

- [ ] **Step 1: ajuda.js — extras e sistemas**

Trocar a leitura do código e o `montar`:
```js
const ler = (nome) => fs.readFileSync(path.join(__dirname, '..', 'v1', nome), 'utf8');
const CODIGO = ler('sge-core.js');
```
No `supabaseFalso`, a linha do `rpc` vira:
```js
        rpc: async (nome, args) => {
            chamadas.rpc.push([nome, args]);
            if (nome === 'sge_meus_sistemas') return resp(cfg.sistemas, { data: { ativo: true, nome: 'Maria Teste', sistemas: [] }, error: null });
            return resp(cfg.perm, { data: PERM_OK, error: null });
        },
```
No `montar`, aceitar `extras = []` e rodar depois do núcleo:
```js
function montar({ url = 'https://grupogps-mecanizada.github.io/gestao/', html = '', supa, antes, extras = [] } = {}) {
    ...
    w.eval(CODIGO);
    extras.forEach((nome) => w.eval(ler(nome)));
```

- [ ] **Step 2: sge-core.js — versão e conexão**

`const VERSAO = '1.2.0';` e, no objeto `acesso`, logo depois de `tipoDeErro,`:
```js
        conexao: () => cliente(ACESSO.url, ACESSO.chave), // conexão da Central (usada pela barra)
```
No cabeçalho, depois da linha do `SGE.acesso`:
```js
 *   SGE.barra / SGE.icone        → barra de topo universal e ícones (v1.2): arquivos sge-barra.js e sge-icones.js
```
`package.json`: `"version": "1.2.0"`.

- [ ] **Step 3: Rodar os testes antigos**

Run: `node --test --test-force-exit --test-timeout=60000`
Expected: 38 testes, 0 falhas.

- [ ] **Step 4: Commit**
```bash
git add testes/ajuda.js v1/sge-core.js package.json
git commit -m "Base da v1.2.0: SGE.acesso.conexao e testes com arquivos extras"
```

---

### Task 2: Ícones (`v1/sge-icones.js`)

**Files:**
- Create: `v1/sge-icones.js`
- Create: `testes/barra.test.js` (primeiro teste)

**Interfaces:**
- Produces: `SGE.icone(nome, tamanho?, doc?) → SVGSVGElement` com `data-icone` = nome real; `SGE.icones` = lista (congelada) dos nomes.

- [ ] **Step 1: Teste que falha**

`testes/barra.test.js`:
```js
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
```
Run: `node --test --test-force-exit --test-timeout=60000 testes/barra.test.js` → FAIL (arquivo `sge-icones.js` não existe).

- [ ] **Step 2: Implementação**

`v1/sge-icones.js`:
```js
/**
 * SGE ÍCONES v1 — ícones de linha dos sistemas e da barra do SGE (sge-core 1.2).
 * Desenhos do Lucide (https://lucide.dev) — licença ISC, Copyright (c) Lucide Contributors.
 * Uso: SGE.icone('truck', 20) → <svg> pronto para pôr na página. Lista: SGE.icones.
 */
(function () {
    'use strict';

    const NS = 'http://www.w3.org/2000/svg';
    // Peças: texto = <path d>; ['c', cx, cy, r] = círculo; ['r', x, y, largura, altura, raio] = retângulo.
    const ICONES = {
        grade: [['r', 3, 3, 7, 7, 1], ['r', 14, 3, 7, 7, 1], ['r', 14, 14, 7, 7, 1], ['r', 3, 14, 7, 7, 1]],
        home: ['M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8', 'M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'],
        user: ['M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2', ['c', 12, 7, 4]],
        users: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', ['c', 9, 7, 4], 'M22 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'],
        truck: ['M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2', 'M15 18H9', 'M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14', ['c', 17, 18, 2], ['c', 7, 18, 2]],
        clipboard: [['r', 8, 2, 8, 4, 1], 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2'],
        'clipboard-check': [['r', 8, 2, 8, 4, 1], 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2', 'm9 14 2 2 4-4'],
        tablet: [['r', 4, 2, 16, 20, 2], 'M12 18h.01'],
        ruler: ['M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z', 'm14.5 12.5 2-2', 'm11.5 9.5 2-2', 'm8.5 6.5 2-2', 'm17.5 15.5 2-2'],
        wrench: ['M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z'],
        box: ['M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z', 'm3.3 7 8.7 5 8.7-5', 'M12 22V12'],
        'check-circle': ['M22 11.08V12a10 10 0 1 1-5.93-9.14', 'm9 11 3 3L22 4'],
        clock: [['c', 12, 12, 10], 'M12 6v6l4 2'],
        shield: ['M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z'],
        'shield-check': ['M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z', 'm9 12 2 2 4-4'],
        'hard-hat': ['M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v2z', 'M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5', 'M4 15v-3a6 6 0 0 1 6-6', 'M14 6a6 6 0 0 1 6 6v3'],
        'file-text': ['M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z', 'M14 2v4a2 2 0 0 0 2 2h4', 'M10 9H8', 'M16 13H8', 'M16 17H8'],
        chart: ['M3 3v18h18', 'M18 17V9', 'M13 17V5', 'M8 17v-3'],
        calendar: [['r', 3, 4, 18, 18, 2], 'M16 2v4', 'M8 2v4', 'M3 10h18'],
        'map-pin': ['M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z', ['c', 12, 10, 3]],
        settings: ['M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z', ['c', 12, 12, 3]],
        search: [['c', 11, 11, 8], 'm21 21-4.3-4.3'],
        bell: ['M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9', 'M10.3 21a1.94 1.94 0 0 0 3.4 0'],
        alert: ['m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3', 'M12 9v4', 'M12 17h.01'],
        gauge: ['m12 14 4-4', 'M3.34 19a10 10 0 1 1 17.32 0'],
        fuel: ['M3 22h12', 'M4 9h10', 'M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18', 'M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5'],
        flask: ['M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2', 'M8.5 2h7', 'M7 16h10'],
        briefcase: ['M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16', ['r', 2, 6, 20, 14, 2]],
        building: ['M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z', 'M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2', 'M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2', 'M10 6h4', 'M10 10h4', 'M10 14h4', 'M10 18h4'],
        activity: ['M22 12h-4l-3 9L9 3l-3 9H2'],
        layers: ['M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z', 'm22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65', 'm22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65'],
        tema: [['c', 12, 12, 10], 'M12 18a6 6 0 0 0 0-12v12z'],
        sair: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'm16 17 5-5-5-5', 'M21 12H9'],
        menu: ['M4 6h16', 'M4 12h16', 'M4 18h16'],
        'seta-baixo': ['m6 9 6 6 6-6'],
        fechar: ['M18 6 6 18', 'm6 6 12 12'],
        'abrir-fora': ['M15 3h6v6', 'M10 14 21 3', 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'],
    };
    const APELIDOS = { default: 'grade', 'layout-grid': 'grade', package: 'box', 'bar-chart': 'chart', house: 'home', 'log-out': 'sair', x: 'fechar', 'external-link': 'abrir-fora' };

    function nomeReal(nome) {
        const n = APELIDOS[nome] || nome;
        return Object.prototype.hasOwnProperty.call(ICONES, n) ? n : 'grade';
    }

    function icone(nome, tamanho, doc) {
        doc = doc || document;
        const n = nomeReal(nome);
        const t = String(tamanho || 20);
        const svg = doc.createElementNS(NS, 'svg');
        [['viewBox', '0 0 24 24'], ['width', t], ['height', t], ['fill', 'none'], ['stroke', 'currentColor'],
            ['stroke-width', '1.75'], ['stroke-linecap', 'round'], ['stroke-linejoin', 'round'],
            ['aria-hidden', 'true'], ['focusable', 'false'], ['data-icone', n]].forEach(([k, v]) => svg.setAttribute(k, v));
        ICONES[n].forEach((p) => {
            let peca;
            if (typeof p === 'string') {
                peca = doc.createElementNS(NS, 'path');
                peca.setAttribute('d', p);
            } else if (p[0] === 'c') {
                peca = doc.createElementNS(NS, 'circle');
                ['cx', 'cy', 'r'].forEach((k, i) => peca.setAttribute(k, p[i + 1]));
            } else {
                peca = doc.createElementNS(NS, 'rect');
                ['x', 'y', 'width', 'height', 'rx'].forEach((k, i) => peca.setAttribute(k, p[i + 1]));
            }
            svg.appendChild(peca);
        });
        return svg;
    }

    const caixa = (window.SGE = window.SGE || {});
    caixa.icone = icone;
    caixa.icones = Object.freeze(Object.keys(ICONES).sort());
    if (window.SGECore) { window.SGECore.icone = icone; window.SGECore.icones = caixa.icones; }
})();
```

- [ ] **Step 3: Rodar** `node --test --test-force-exit --test-timeout=60000 testes/barra.test.js` → PASS.

- [ ] **Step 4: Commit**
```bash
git add v1/sge-icones.js testes/barra.test.js
git commit -m "sge-icones.js: ícones de linha (Lucide, ISC) para sistemas e barra"
```

---

### Task 3: Regras da barra (`_regras`) e esqueleto do `SGE.barra`

**Files:**
- Create: `v1/sge-barra.js` (regras + `SGE.barra` exportado; `montar` entra na Task 4)
- Modify: `testes/barra.test.js`

**Interfaces:**
- Produces: `SGE.barra._regras = { enderecoNoPortal(url) → string|null, corValida(cor) → string|null, agruparPorArea(lista) → [{area, sistemas}], prepararSistemas(lista, termo) → [sistema + endereco], telaAtual(secoes, caminho) → href|null, secoesVisiveis(secoes, pode) → secoes, iniciais(texto) → string }`.

- [ ] **Step 1: Teste que falha** (acrescentar em `testes/barra.test.js`)
```js
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
    assert.deepEqual(vis.map((s) => [s.rotulo, s.itens.length]), [['A', 1]]);
    const grupos = r.agruparPorArea([{ nome: 'B', area_menu: 'Pessoal', ordem: 2 }, { nome: 'A', area_menu: 'Pessoal', ordem: 1 }, { nome: 'C' }, { nome: 'D', area_menu: 'Frota' }]);
    assert.deepEqual(grupos.map((g) => [g.area, g.sistemas.map((s) => s.nome).join('')]), [['Frota', 'D'], ['Pessoal', 'AB'], ['Outros', 'C']]);
    fechar();
});
```
Run → FAIL (`sge-barra.js` não existe).

- [ ] **Step 2: Implementação** — `v1/sge-barra.js` (parte 1; a Task 4 completa `montar` e o CSS):
```js
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
```
(Na Task 4 o marcador `// __MONTAR__ (Task 4)` é trocado pelo bloco de montagem e a linha `montar:` vira `montar,`.)

- [ ] **Step 3: Rodar** `node --test --test-force-exit --test-timeout=60000 testes/barra.test.js` → PASS (2 testes).

- [ ] **Step 4: Commit**
```bash
git add v1/sge-barra.js testes/barra.test.js
git commit -m "sge-barra.js: regras (endereço seguro, cor, tela ativa, permissões, grupos)"
```

---

### Task 4: A barra na tela (`SGE.barra.montar`)

**Files:**
- Modify: `v1/sge-barra.js` (troca o marcador pelo bloco abaixo; `montar:` → `montar,`)
- Modify: `testes/barra.test.js` (testes de tela)

**Interfaces:**
- Consumes: `_regras` (Task 3); `SGE.icone` (Task 2); `core.acesso.{usuario,papel,permissoes,pode,conexao,irParaLogin,sair}`, `core.logo()`.
- Produces: `SGE.barra.montar(opcoes) → { host, atualizar(parcial?), contador(href, n), abrir(chave?), fechar(), destruir() }`. Elementos com `data-chave`: `grade` (logo), `secao-<n>`, `busca`, `tema`, `usuario`, `entrar`, `gaveta`, `busca-grade`. Classes usadas nos testes: `.nome strong`, `.nome .sub`, `.menu`, `.botao-menu`, `.suspenso`, `.dica`, `.grupo-titulo`, `.item`, `.item-rotulo`, `.selo`, `.grade`, `.area`, `.ladrilho`, `.quadrado`, `.lista-grade`, `.vazio`, `.rodape`, `.usuario`, `.acao`, `.gaveta`, `.gaveta-fundo`.

- [ ] **Step 1: Testes que falham** (acrescentar em `testes/barra.test.js`)
```js
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
    assert.match(t.idas[0], /sso_login\.html\?app_slug=sst/);
    t.fechar();
});

test('sem sessão: mostra Entrar, que leva ao login', async () => {
    const t = await abrir({ cfg: { sessao: null } });
    const botao = t.$('[data-chave="entrar"]');
    assert.equal(botao.textContent, 'Entrar');
    botao.click();
    assert.match(t.idas[0], /sso_login\.html\?app_slug=sst/);
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
```
Run → FAIL ("SGE.barra.montar ainda não existe").

- [ ] **Step 2: Implementação** — trocar `// __MONTAR__ (Task 4)` em `v1/sge-barra.js` por:
```js
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
            preencherLista();
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
```
E no final do arquivo a linha `montar: typeof montar === 'function' ? montar : () => { ... },` vira `montar,`.

- [ ] **Step 3: Rodar** `node --test --test-force-exit --test-timeout=60000 testes/barra.test.js` → PASS (todos). Se o jsdom não suportar algo de tela (foco dentro da sombra, `--cor` no estilo), ajustar só o teste para o que o jsdom oferece e conferir o comportamento no `teste-barra.html` (Task 5).

- [ ] **Step 4: Todos os testes** `node --test --test-force-exit --test-timeout=60000` → 38 antigos + novos, 0 falhas.

- [ ] **Step 5: Commit**
```bash
git add v1/sge-barra.js testes/barra.test.js
git commit -m "sge-barra.js: barra universal (menus, grade de sistemas, usuário, tema, Ctrl+K, celular)"
```

---

### Task 5: Página de demonstração, documentação e migração do banco

**Files:**
- Create: `teste-barra.html` (demo com dados de exemplo)
- Modify: `LEIA-ME.md`, `CHANGELOG.md`, `docs/superpowers/specs/2026-10-09-barra-universal-design.md` (detalhes que mudaram)
- Create: `../SGE-CENTRAL/supabase/migrations/20261009_sge_meus_sistemas_cor.sql`

- [ ] **Step 1: `teste-barra.html`**
```html
<!doctype html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Teste da Barra SGE</title>
    <link rel="stylesheet" href="v1/sge-core.css">
    <style>main { max-width: 900px; margin: 0 auto; padding: 32px 16px; } a.estrago { color: red; } * { letter-spacing: .02em; }</style>
</head>
<body class="sge">
    <main>
        <h1>Teste da Barra Universal</h1>
        <p>Dados de exemplo, sem conexão real. A página tem CSS "estragado" de propósito (links vermelhos): a barra não pode mudar.</p>
        <p><a class="estrago" href="#">link do sistema</a></p>
    </main>
    <script>
        // Supabase falso só para ver a barra (nenhum dado real).
        var exemplos = [
            ['sst', 'SST', 'hard-hat', '#15803d', 'Segurança'], ['etilometro', 'Etilômetro Digital', 'shield', '#ea580c', 'Segurança'],
            ['efetivo', 'Gestão de Efetivo', 'users', '#1d4ed8', 'Pessoal'], ['presenca', 'Controle de Presença', 'check-circle', '#7c3aed', 'Pessoal'],
            ['horas', 'Horas Extras', 'clock', '#be185d', 'Pessoal'], ['turno', 'Relatório de Turno', 'clipboard', '#059669', 'Operação'],
            ['apont', 'Apontamentos', 'tablet', '#d97706', 'Operação'], ['medicao', 'Controle de Medição', 'ruler', '#dc2626', 'Operação'],
            ['manut', 'Manutenções', 'wrench', '#6366f1', 'Operação'], ['almox', 'Almoxarifado', 'box', '#0891b2', 'Operação'],
            ['frota', 'Controle de Frota com um nome bem comprido para testar', 'truck', '#65a30d', 'Frota'], ['central', 'SGE Central', 'default', '#1d4ed8', 'Administração'],
        ].map(function (s, i) { return { slug: s[0], nome: s[1], icone: s[2], cor: s[3], area_menu: s[4], ordem: i, url_origem: '#' + s[0], abre_fora: s[0] === 'central' }; });
        var cliente = {
            auth: {
                getSession: async function () { return { data: { session: { user: { email: 'pessoa.exemplo@gestaogps.com.br', user_metadata: { nome: 'Pessoa Exemplo' } } } }, error: null }; },
                signOut: async function () { return { error: null }; },
                onAuthStateChange: function () { return {}; },
            },
            rpc: async function () { await new Promise(function (r) { setTimeout(r, 600); }); return { data: { ativo: true, sistemas: exemplos }, error: null }; },
            schema: function () { return cliente; },
        };
        window.supabase = { createClient: function () { return cliente; } };
    </script>
    <script src="v1/sge-core.js"></script>
    <script src="v1/sge-icones.js"></script>
    <script src="v1/sge-barra.js"></script>
    <script>
        var barra = SGE.barra.montar({
            sistema: 'sst', nome: 'SST', area: 'Mecanizada', inicio: '#inicio',
            secoes: [
                { rotulo: 'Início', icone: 'home', href: '#inicio' },
                { rotulo: 'Colaboradores', icone: 'users', texto: 'Consultar e cadastrar pessoas', itens: [
                    { rotulo: 'Matriz', texto: 'Quem tem cada requisito', href: '#matriz', icone: 'clipboard-check', grupo: 'Consultas' },
                    { rotulo: 'Novo colaborador', texto: 'Cadastrar uma pessoa', href: '#novo', icone: 'user', grupo: 'Cadastro' } ] },
                { rotulo: 'Acompanhamento', icone: 'activity', texto: 'O que precisa de atenção', itens: [
                    { rotulo: 'Pendências', texto: 'Abertas e aguardando aprovação', href: '#pendencias', icone: 'alert', grupo: 'Hoje' } ] },
                { rotulo: 'Configurações', icone: 'settings', texto: 'Regras do sistema e auditoria', itens: [
                    { rotulo: 'Auditoria', texto: 'Quem mudou o quê', href: '#auditoria', icone: 'file-text', grupo: 'Sistema' } ] },
            ],
            atual: function () { return location.hash || '#inicio'; },
            aoBuscar: function () { SGE.aviso('Aqui abre a busca do próprio sistema.', 'info'); },
            aoSair: function () { SGE.aviso('Sair (só teste).', 'info'); },
        });
        barra.contador('#pendencias', 280);
    </script>
</body>
</html>
```

- [ ] **Step 2: Conferir no navegador** (`npx serve` ou abrir o arquivo): barra igual à do SST; logo abre a grade com 12 ícones coloridos por área; nome comprido corta em 2 linhas; link vermelho do sistema não muda a barra; Ctrl+K mostra o aviso; tema alterna; em 375 px aparece ☰ e a gaveta.

- [ ] **Step 3: Migração** `../SGE-CENTRAL/supabase/migrations/20261009_sge_meus_sistemas_cor.sql` — o mesmo corpo de `sge-portal/sql/20261008_portal_sge.sql` (só a função), com `'cor', s.cor,` depois de `'icone', s.icone,`:
```sql
-- Barra Universal SGE (sge-core 1.2): sge_meus_sistemas passa a devolver a cor de cada sistema.
create or replace function public.sge_meus_sistemas()
returns jsonb
language sql stable security definer set search_path = '' as $$
  with eu as (
    select u.id, u.nome, (u.is_active is not false) as ativo
    from gps_compartilhado.sge_central_usuarios u
    where u.id = (select auth.uid())
  )
  select jsonb_build_object(
    'ativo', coalesce((select ativo from eu), false),
    'nome', (select nome from eu),
    'sistemas', case when coalesce((select ativo from eu), false) then coalesce((
      select jsonb_agg(jsonb_build_object(
          'slug', s.slug, 'nome', s.nome, 'icone', s.icone, 'cor', s.cor, 'area_menu', s.area_menu,
          'ordem', s.ordem, 'url_origem', s.url_origem, 'abre_fora', s.abre_fora, 'papel', p.papel)
        order by s.ordem nulls last, s.nome)
      from gps_compartilhado.acesso_permissoes p
      join gps_compartilhado.sge_central_sistemas s on s.id = p.sistema_id
      where p.usuario_id = (select auth.uid())
        and p.ativo and p.papel is not null and s.is_active is not false
    ), '[]'::jsonb) else '[]'::jsonb end
  )
$$;
revoke execute on function public.sge_meus_sistemas() from public, anon;
grant execute on function public.sge_meus_sistemas() to authenticated, service_role;
```
Aplicar só com o OK do Warlison. Conferir depois: `select jsonb_path_query_first(public.sge_meus_sistemas(), '$.sistemas[0].cor')` logado (ou ver a grade com cores).

- [ ] **Step 4: Documentação**
`CHANGELOG.md` (no topo):
```markdown
## v1.2.0 · 2026-10-09
- Novo `sge-icones.js`: `SGE.icone(nome, tamanho)` e `SGE.icones` — ícones de linha (Lucide, licença ISC) para os sistemas e a barra.
- Novo `sge-barra.js`: `SGE.barra.montar({...})` — barra de topo universal (logo SGE com a grade de sistemas, menus do sistema com permissão por tela, busca Ctrl+K, tema claro/escuro, usuário e Sair; gaveta no celular). Estilo isolado (Shadow DOM).
- `SGE.acesso.conexao()`: a conexão da Central (usada pela barra).
- Página de demonstração `teste-barra.html` (dados de exemplo).
```
`LEIA-ME.md`: seção "Barra universal (v1.2)" com a ordem dos scripts e o exemplo de `SGE.barra.montar` da spec (3.2) + "depois do `await SGE.acesso.entrar(...)`, chame `barra.atualizar()`".
Spec: em 3, `SGE.icones` é a **lista** de nomes; `SGE.acesso.conexao()` novo; no celular a barra mostra o nome do sistema e a tela atual.

- [ ] **Step 5: Commit**
```bash
git add teste-barra.html LEIA-ME.md CHANGELOG.md docs/superpowers/specs/2026-10-09-barra-universal-design.md
git commit -m "v1.2.0: demonstração da barra, documentação"
```
(No SGE-CENTRAL: `git add supabase/migrations/20261009_sge_meus_sistemas_cor.sql && git commit -m "SQL: sge_meus_sistemas devolve a cor (barra universal)"`.)

---

### Task 6: Publicar

- [ ] **Step 1:** Rodar a skill `checklist-publicar` (segredos, testes, CHANGELOG).
- [ ] **Step 2:** `git push origin main` no sge-core (GitHub Pages do `sge-core-`). Conferir no ar: `https://grupogps-mecanizada.github.io/sge-core-/v1/sge-barra.js` e `https://sge-portal.pages.dev/sge-core-/v1/sge-barra.js` respondem com `SGE BARRA v1`; `teste-barra.html` no ar mostra a barra.
- [ ] **Step 3:** Cofre: ficha do sge-core (Anotações/Atenção), Registro de Versões, Histórico.
