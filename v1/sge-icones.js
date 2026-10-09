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
