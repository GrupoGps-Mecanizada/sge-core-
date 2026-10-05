/**
 * SGE CORE v1 — peças comuns a todos os sistemas do SGE
 *
 * Uso (depois do supabase-js e do sso_client.js, se o sistema usar):
 *   <script src="https://grupogps-mecanizada.github.io/sge-core/v1/sge-core.js"></script>
 *
 * O que oferece (em window.SGECore, e também em window.SGE sem apagar o que o sistema já tem):
 *   SGE.cliente(url?, chave?)  → UMA conexão Supabase por projeto (sem repetir createClient)
 *   SGE.aviso(texto, tipo)     → mensagem rápida na tela (sucesso | erro | alerta | info)
 *   SGE.erro(e, contexto)      → traduz o erro técnico em mensagem simples e mostra
 *   SGE.carregando(sim, texto) → tela de "carregando"
 *   SGE.seguro(fn, opcoes)     → roda uma ação com "carregando" + tratamento de erro
 *   SGE.rascunho               → guarda o que foi digitado (não perde com internet ruim)
 *   SGE.formatar               → data, data e hora, número e moeda no padrão brasileiro
 *   SGE.logo(variante)         → endereço do logo oficial
 *
 * Login, presença no radar e manutenção continuam no sso_client.js e no
 * sge-session-ping.js da Central. O sge-core NÃO mexe no login.
 */
(function () {
    'use strict';

    if (window.SGECore) return; // já carregado

    const VERSAO = '1.0.1';
    // Descobre o próprio endereço (funciona com qualquer nome de repositório ou cópia local).
    const _src = (document.currentScript && document.currentScript.src) || '';
    const BASE = _src ? _src.replace(/\/[^/]*$/, '') : 'https://grupogps-mecanizada.github.io/sge-core/v1';

    // ── Conexão Supabase (uma por projeto) ──────────────────
    const _clientes = {};

    function cliente(url, chave, opcoes) {
        // Sem parâmetros: usa o mesmo projeto do login (sso_client.js), se estiver na página.
        if (!url && typeof SGE_SSO_API !== 'undefined') url = SGE_SSO_API;     // eslint-disable-line no-undef
        if (!chave && typeof SGE_SSO_KEY !== 'undefined') chave = SGE_SSO_KEY; // eslint-disable-line no-undef

        if (!url || !chave) throw new Error('SGE.cliente: informe o endereço e a chave pública do Supabase.');
        if (!window.supabase || !window.supabase.createClient) {
            throw new Error('SGE.cliente: carregue o supabase-js antes do sge-core.');
        }
        if (_eChaveSecreta(chave)) {
            console.error('[SGE] PERIGO: chave secreta (service_role) no navegador. Troque pela chave pública.');
            throw new Error('Chave secreta não pode ser usada no navegador.');
        }
        if (!_clientes[url]) _clientes[url] = window.supabase.createClient(url, chave, opcoes);
        return _clientes[url];
    }

    // Lê o "papel" de dentro da chave JWT (sem validar), só para barrar a service_role.
    function _eChaveSecreta(chave) {
        if (typeof chave !== 'string') return false;
        if (chave.indexOf('sb_secret_') === 0) return true;
        try {
            const corpo = JSON.parse(atob(chave.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
            return corpo.role === 'service_role';
        } catch (_) {
            return false;
        }
    }

    // ── Avisos ──────────────────────────────────────────────
    let _caixaAvisos = null;

    function aviso(texto, tipo, duracaoMs) {
        tipo = tipo || 'info';
        if (!_caixaAvisos || !document.body.contains(_caixaAvisos)) {
            _caixaAvisos = document.createElement('div');
            _caixaAvisos.className = 'sge-avisos';
            _caixaAvisos.setAttribute('role', 'status');
            _caixaAvisos.setAttribute('aria-live', 'polite');
            document.body.appendChild(_caixaAvisos);
        }
        const item = document.createElement('div');
        item.className = 'sge-aviso sge-aviso--' + tipo;
        const msg = document.createElement('span');
        msg.textContent = String(texto); // textContent: nunca interpreta HTML
        const fechar = document.createElement('button');
        fechar.type = 'button';
        fechar.setAttribute('aria-label', 'Fechar aviso');
        fechar.textContent = '×';
        fechar.onclick = () => item.remove();
        item.append(msg, fechar);
        _caixaAvisos.appendChild(item);

        const tempo = duracaoMs || (tipo === 'erro' ? 7000 : 4000);
        setTimeout(() => item.remove(), tempo);
        return item;
    }

    // ── Erros em linguagem simples ──────────────────────────
    function _traduzir(e) {
        const msg = String((e && (e.message || e.error_description || e.msg)) || e || '');
        const codigo = e && (e.code || e.status);

        if (!navigator.onLine) return 'Sem internet. Confira a conexão e tente de novo.';
        if (/Failed to fetch|NetworkError|Load failed|ERR_NETWORK/i.test(msg)) return 'Não consegui falar com o servidor. Tente de novo em instantes.';
        if (/timeout|timed out|57014/i.test(msg) || codigo === '57014') return 'O servidor demorou para responder. Tente de novo.';
        if (/JWT expired|invalid JWT|401/i.test(msg) || codigo === 401 || codigo === 'PGRST301') return 'Sua sessão expirou. Entre de novo.';
        if (/permission denied|row-level security|42501/i.test(msg) || codigo === '42501') return 'Você não tem permissão para fazer isso.';
        if (/duplicate key|23505/i.test(msg) || codigo === '23505') return 'Esse registro já existe.';
        if (/violates foreign key|23503/i.test(msg) || codigo === '23503') return 'Esse registro está ligado a outro e não pode ser alterado assim.';
        if (/not-null|23502/i.test(msg) || codigo === '23502') return 'Falta preencher um campo obrigatório.';
        if (codigo === 406 || codigo === 'PGRST116') return 'Registro não encontrado.';
        return 'Algo deu errado. Tente de novo. Se continuar, avise o suporte do SGE.';
    }

    function erro(e, contexto) {
        console.error('[SGE]' + (contexto ? ' ' + contexto + ':' : ''), e);
        const texto = _traduzir(e);
        aviso(texto, 'erro');
        return texto;
    }

    // ── Carregando ──────────────────────────────────────────
    let _telaCarregando = null;
    let _contaCarregando = 0;

    function carregando(sim, texto) {
        if (sim) {
            _contaCarregando++;
            if (!_telaCarregando) {
                _telaCarregando = document.createElement('div');
                _telaCarregando.className = 'sge-carregando';
                _telaCarregando.setAttribute('role', 'alert');
                _telaCarregando.setAttribute('aria-busy', 'true');
                const roda = document.createElement('div');
                roda.className = 'sge-roda';
                const legenda = document.createElement('span');
                _telaCarregando.append(roda, legenda);
                document.body.appendChild(_telaCarregando);
            }
            _telaCarregando.lastChild.textContent = texto || 'Carregando...';
        } else {
            _contaCarregando = Math.max(0, _contaCarregando - 1);
            if (_contaCarregando === 0 && _telaCarregando) {
                _telaCarregando.remove();
                _telaCarregando = null;
            }
        }
    }

    // Roda uma ação com "carregando" e erro tratado. Devolve o resultado ou null.
    async function seguro(fn, opcoes) {
        opcoes = opcoes || {};
        if (opcoes.carregando !== false) carregando(true, opcoes.texto);
        try {
            const r = await fn();
            if (r && r.error) throw r.error;             // padrão do supabase-js: { data, error }
            if (opcoes.sucesso) aviso(opcoes.sucesso, 'sucesso');
            return r;
        } catch (e) {
            erro(e, opcoes.contexto);
            return null;
        } finally {
            if (opcoes.carregando !== false) carregando(false);
        }
    }

    // ── Rascunho (não perder o que foi digitado) ────────────
    const rascunho = {
        _chave: (nome) => 'sge_rascunho_' + (window.SGE_APP_SLUG || location.pathname) + '_' + nome,
        salvar(nome, dados) {
            try { localStorage.setItem(this._chave(nome), JSON.stringify({ em: Date.now(), dados })); } catch (_) {}
        },
        ler(nome, validadeHoras) {
            try {
                const bruto = JSON.parse(localStorage.getItem(this._chave(nome)));
                if (!bruto) return null;
                if (Date.now() - bruto.em > (validadeHoras || 24) * 3600000) { this.limpar(nome); return null; }
                return bruto.dados;
            } catch (_) { return null; }
        },
        limpar(nome) {
            try { localStorage.removeItem(this._chave(nome)); } catch (_) {}
        },
        // Liga um <form>: salva a cada digitação e preenche ao abrir. Não guarda senhas.
        ligar(form, nome) {
            if (!form) return;
            nome = nome || form.id || 'formulario';
            const salvos = this.ler(nome);
            if (salvos) {
                Object.keys(salvos).forEach((k) => {
                    const campo = form.elements[k];
                    if (campo && campo.type !== 'password' && campo.type !== 'file') campo.value = salvos[k];
                });
            }
            form.addEventListener('input', () => {
                const dados = {};
                Array.from(form.elements).forEach((c) => {
                    if (c.name && c.type !== 'password' && c.type !== 'file') dados[c.name] = c.value;
                });
                this.salvar(nome, dados);
            });
            form.addEventListener('submit', () => this.limpar(nome));
        },
    };

    // ── Formatos brasileiros ────────────────────────────────
    const _fData = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const _fDataHora = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });
    const _fMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

    const formatar = {
        data: (v) => (v ? _fData.format(new Date(v)) : ''),
        dataHora: (v) => (v ? _fDataHora.format(new Date(v)) : ''),
        numero: (v, casas) => (v == null ? '' : Number(v).toLocaleString('pt-BR', { maximumFractionDigits: casas == null ? 2 : casas })),
        moeda: (v) => (v == null ? '' : _fMoeda.format(Number(v))),
    };

    // ── Logo oficial ────────────────────────────────────────
    function logo(variante) {
        return BASE + '/assets/sge-logo' + (variante ? '-' + variante : '') + '.svg';
    }

    // ── Faixa "sem internet" ────────────────────────────────
    function _faixaOffline() {
        let faixa = null;
        function atualizar() {
            if (!navigator.onLine && !faixa) {
                faixa = document.createElement('div');
                faixa.className = 'sge-offline';
                faixa.setAttribute('role', 'alert');
                faixa.textContent = 'Sem internet. O que você digitar fica guardado neste aparelho.';
                document.body.appendChild(faixa);
            } else if (navigator.onLine && faixa) {
                faixa.remove();
                faixa = null;
                aviso('Internet de volta.', 'sucesso');
            }
        }
        window.addEventListener('online', atualizar);
        window.addEventListener('offline', atualizar);
        atualizar();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _faixaOffline);
    } else {
        _faixaOffline();
    }

    const api = {
        versao: VERSAO,
        cliente,
        aviso,
        erro,
        carregando,
        seguro,
        rascunho,
        formatar,
        logo,
    };

    // Alguns sistemas já usam window.SGE como "caixa" própria (SGE.auth, SGE.api...).
    // O núcleo só SOMA o que falta, sem apagar nada que já existe.
    window.SGECore = api;
    const caixa = (window.SGE = window.SGE || {});
    Object.keys(api).forEach((k) => {
        if (!(k in caixa)) caixa[k] = api[k];
    });
    caixa.core = api;
})();
