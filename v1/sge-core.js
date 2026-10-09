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
 *   SGE.acesso                 → login único da Central + permissões do sistema (v1.1):
 *                                await SGE.acesso.entrar('slug_do_sistema')
 *   SGE.barra / SGE.icone        → barra de topo universal e ícones (v1.2): arquivos sge-barra.js e sge-icones.js
 *
 * Sistemas que ainda usam sso_client.js + sge-session-ping.js continuam iguais:
 * o SGE.acesso só age quando o sistema chama SGE.acesso.entrar().
 */
(function () {
    'use strict';

    if (window.SGECore) return; // já carregado

    const VERSAO = '1.2.0';

    // A Central fica no mesmo endereço em que o sistema está aberto (portal ou github.io),
    // para a sessão do Supabase ser a mesma. Testes locais usam SGE_CENTRAL_URL_OVERRIDE.
    function _centralPadrao() {
        if (window.SGE_CENTRAL_URL_OVERRIDE) return window.SGE_CENTRAL_URL_OVERRIDE;
        const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
        if (/^https?:$/.test(location.protocol) && !local) return location.origin + '/SGE-CENTRAL';
        return 'https://grupogps-mecanizada.github.io/SGE-CENTRAL';
    }

    // Projeto da Central (login e permissões). A chave é a PÚBLICA (anon): pode ficar no navegador.
    const ACESSO = {
        url: 'https://mgcjidryrjqiceielmzp.supabase.co',
        chave: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nY2ppZHJ5cmpxaWNlaWVsbXpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMjEwNzEsImV4cCI6MjA4NzY5NzA3MX0.UAKkzy5fMIkrlmnqz9E9KknUw9xhoYpa3f1ptRpOuAA',
        central: _centralPadrao(),
        reconferirMs: 5 * 60 * 1000,
        ausenteMs: 30 * 1000,
    };
    // Descobre o próprio endereço (funciona com qualquer nome de repositório ou cópia local).
    const _src = (document.currentScript && document.currentScript.src) || '';
    const BASE = _src ? _src.replace(/\/[^/]*$/, '') : 'https://grupogps-mecanizada.github.io/sge-core/v1';

    // ── Conexão Supabase (uma por projeto) ──────────────────
    const _clientes = {};

    function cliente(url, chave, opcoes) {
        // Sem parâmetros: usa o mesmo projeto do login (sso_client.js), se estiver na página.
        if (!url && typeof SGE_SSO_API !== 'undefined') url = SGE_SSO_API;     // eslint-disable-line no-undef
        if (!chave && typeof SGE_SSO_KEY !== 'undefined') chave = SGE_SSO_KEY; // eslint-disable-line no-undef
        // Sem sso_client na página: usa o projeto da Central (o mesmo do SGE.acesso).
        if (!url && !chave) { url = ACESSO.url; chave = ACESSO.chave; }

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

    // ── Acesso: login único da Central + permissões do sistema ──
    // Usa a sessão real do Supabase gravada pelo sso_login.html da Central
    // (todos os sistemas estão em grupogps-mecanizada.github.io, então dividem a sessão).
    // Regra de ouro: na dúvida (erro, rede), NÃO entra. O banco (RLS) barra o resto.
    const _acesso = {
        slug: null, db: null, promessa: null, perm: null, usuario: null,
        canal: null, presenca: null, timerConferir: null, timerAusente: null,
        observador: null, ultimaConferencia: 0, encerrado: false,
    };
    const _nunca = () => new Promise(() => {}); // a página para aqui: o código do sistema não continua
    const _CHAVE_VOLTAS = 'sge_acesso_voltas';

    function entrar(slug) {
        if (typeof slug !== 'string' || !slug.trim()) throw new Error('SGE.acesso.entrar: informe o slug do sistema.');
        if (_acesso.promessa) return _acesso.promessa;
        _acesso.slug = slug.trim();
        _acesso.promessa = _entrar();
        return _acesso.promessa;
    }

    async function _entrar() {
        _estiloAcesso();
        document.documentElement.classList.add('sge-acesso-pendente');
        _limparTokenAntigo();
        carregando(true, 'Conferindo seu acesso...');
        try {
            _acesso.db = cliente(ACESSO.url, ACESSO.chave);
            const { data, error } = await _acesso.db.auth.getSession();
            const sessao = data && data.session;
            if (!sessao && error && _eErroDeRede(error)) return _barrar({ situacao: 'erro', erro: error });
            if (!sessao) return _irParaLogin();

            const r = await _conferir();
            if (r.situacao !== 'ok') return _barrar(r);

            _liberar(r.perm, sessao.user);
            return _resumo();
        } catch (e) {
            console.error('[SGE] Não consegui conferir o acesso:', e);
            return _barrar({ situacao: 'erro', erro: e });
        } finally {
            carregando(false);
        }
    }

    // Pergunta ao banco: permissões da pessoa neste sistema + manutenção.
    async function _conferir() {
        const db = typeof _acesso.db.schema === 'function' ? _acesso.db.schema('public') : _acesso.db;
        const [perm, manut] = await Promise.all([
            db.rpc('sge_minhas_permissoes', { p_slug: _acesso.slug }),
            db.from('v_sso_manutencao').select('mensagem,previsao_fim').eq('sistema_slug', _acesso.slug).limit(1),
        ]);
        if (perm.error) return { situacao: _eErroDeLogin(perm.error) ? 'login' : 'erro', erro: perm.error };
        if (manut.error) return { situacao: _eErroDeLogin(manut.error) ? 'login' : 'erro', erro: manut.error };
        if (manut.data && manut.data.length) return { situacao: 'manutencao', manutencao: manut.data[0], perm: perm.data };
        if (!perm.data || !perm.data.papel) return { situacao: 'sem_acesso', perm: perm.data };
        return { situacao: 'ok', perm: perm.data };
    }

    function _eErroDeLogin(e) {
        const msg = String((e && (e.message || e.msg)) || '');
        const codigo = e && (e.code || e.status);
        // 42501 na função = chamou sem login válido (a função só aceita quem está logado).
        return codigo === 401 || (e && e.status === 401) || codigo === '42501'
            || /^PGRST30[123]$/.test(String(codigo)) || /JWT|not authenticated|refresh token/i.test(msg);
    }

    function _eErroDeRede(e) {
        const msg = String((e && (e.message || e.name)) || '');
        return !navigator.onLine || (e && e.name === 'AuthRetryableFetchError')
            || /Failed to fetch|NetworkError|Load failed|fetch failed/i.test(msg);
    }

    function _liberar(perm, usuarioAuth) {
        _acesso.perm = perm;
        _acesso.usuario = {
            id: perm.usuario_id || (usuarioAuth && usuarioAuth.id),
            nome: perm.nome || (usuarioAuth && usuarioAuth.email) || 'Usuário SGE',
            email: perm.email || (usuarioAuth && usuarioAuth.email) || '',
        };
        try { sessionStorage.removeItem(_CHAVE_VOLTAS); } catch (_) {}
        aplicar();
        _vigiarPagina();
        _entrarNoRadar();
        _acesso.ultimaConferencia = Date.now();
        _acesso.timerConferir = setInterval(reconferir, ACESSO.reconferirMs);
        if (_acesso.db.auth.onAuthStateChange) {
            _acesso.db.auth.onAuthStateChange((evento) => {
                if (evento === 'SIGNED_OUT' && _acesso.perm) _derrubar({ situacao: 'login' });
            });
        }
        document.documentElement.classList.remove('sge-acesso-pendente');
    }

    function _resumo() {
        return { usuario: acesso.usuario, papel: acesso.papel, permissoes: acesso.permissoes };
    }

    // Na entrada: manda para o login ou mostra a tela de bloqueio. A promessa nunca resolve.
    function _barrar(r) {
        if (r.situacao === 'login') return _irParaLogin();
        if (r.erro) console.warn('[SGE] Acesso barrado:', r.situacao, r.erro);
        _mostrarTela(r);
        return _nunca();
    }

    // Durante o uso: para tudo e cobre a página.
    function _derrubar(r) {
        _encerrar();
        _mostrarTela(r.situacao === 'login' ? { situacao: 'sessao_terminou' } : r);
    }

    function _irParaLogin(slug) {
        slug = slug || _acesso.slug;
        // Proteção contra vai-e-volta infinito (ex.: navegador bloqueando os dados do site).
        const agora = Date.now();
        let voltas = [];
        try { voltas = (JSON.parse(sessionStorage.getItem(_CHAVE_VOLTAS)) || []).filter((t) => agora - t < 120000); } catch (_) {}
        if (voltas.length >= 3) {
            try { sessionStorage.removeItem(_CHAVE_VOLTAS); } catch (_) {}
            _mostrarTela({ situacao: 'voltas' });
            return _nunca();
        }
        voltas.push(agora);
        try { sessionStorage.setItem(_CHAVE_VOLTAS, JSON.stringify(voltas)); } catch (_) {}

        let destino = ACESSO.central + '/sso_login.html';
        if (slug) {
            destino += '?app_slug=' + encodeURIComponent(slug)
                + '&redirect=' + encodeURIComponent(location.origin + location.pathname);
        }
        acesso._ir(destino);
        return _nunca();
    }

    // O login antigo ainda manda ?sso_token= na volta. Não usamos: só tiramos da barra de endereço.
    function _limparTokenAntigo() {
        try {
            const url = new URL(location.href);
            let mudou = false;
            if (url.searchParams.has('sso_token')) { url.searchParams.delete('sso_token'); mudou = true; }
            if (url.hash.indexOf('sso_token=') !== -1) { url.hash = url.hash.split('?')[0]; mudou = true; }
            if (mudou) history.replaceState(history.state, document.title, url.toString());
        } catch (_) {}
    }

    // ── Telas de bloqueio (texto sempre por textContent) ────
    const _TELAS = {
        sem_acesso: (r) => ({
            cor: '#b91c1c', titulo: 'Sem acesso',
            texto: 'Você não tem acesso a ' + ((r.perm && r.perm.sistema_nome) || 'este sistema') + '. Peça a liberação ao administrador do SGE.',
            botoes: [['Voltar ao Portal', () => acesso._ir(ACESSO.central + '/')], ['Entrar com outra conta', () => sair()]],
        }),
        manutencao: (r) => ({
            cor: '#b45309', titulo: 'Sistema em manutenção',
            texto: (r.manutencao && r.manutencao.mensagem) || 'Este sistema está em manutenção. Tente de novo em breve.',
            extra: r.manutencao && r.manutencao.previsao_fim ? 'Previsão de volta: ' + formatar.dataHora(r.manutencao.previsao_fim) : '',
            botoes: [['Tentar de novo', () => location.reload()]],
        }),
        erro: () => ({
            cor: '#1d4ed8', titulo: 'Não consegui conferir seu acesso',
            texto: 'Confira a internet e tente de novo. Por segurança, o sistema só abre depois dessa conferência.',
            botoes: [['Tentar de novo', () => location.reload()]],
        }),
        sessao_terminou: () => ({
            cor: '#1d4ed8', titulo: 'Sua sessão terminou',
            texto: 'Entre de novo para continuar.',
            botoes: [['Entrar', () => _irParaLogin()]],
        }),
        voltas: () => ({
            cor: '#b91c1c', titulo: 'Não consegui manter seu login',
            texto: 'Este navegador pode estar bloqueando os dados do site (janela anônima ou bloqueio de cookies). Tente de novo ou use outro navegador.',
            botoes: [['Tentar de novo', () => location.reload()]],
        }),
    };

    function _mostrarTela(r) {
        _estiloAcesso();
        const t = (_TELAS[r.situacao] || _TELAS.erro)(r);
        const velha = document.querySelector('.sge-acesso-tela');
        if (velha) velha.remove();

        const fundo = document.createElement('div');
        fundo.className = 'sge-acesso-tela';
        fundo.setAttribute('data-situacao', r.situacao);
        fundo.setAttribute('role', 'alertdialog');
        fundo.setAttribute('aria-modal', 'true');
        fundo.style.setProperty('--cor', t.cor);
        const cartao = document.createElement('div');
        cartao.className = 'sge-acesso-cartao';
        const titulo = document.createElement('h2');
        titulo.textContent = t.titulo;
        const texto = document.createElement('p');
        texto.textContent = t.texto;
        cartao.append(titulo, texto);
        if (t.extra) {
            const extra = document.createElement('p');
            extra.className = 'sge-acesso-extra';
            extra.textContent = t.extra;
            cartao.appendChild(extra);
        }
        const botoes = document.createElement('div');
        botoes.className = 'sge-acesso-botoes';
        t.botoes.forEach(([rotulo, acao]) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.textContent = rotulo;
            b.onclick = acao;
            botoes.appendChild(b);
        });
        cartao.appendChild(botoes);
        fundo.appendChild(cartao);

        const html = document.documentElement;
        html.classList.remove('sge-acesso-pendente');
        html.classList.add('sge-acesso-bloqueado');
        document.body.appendChild(fundo);
        const primeiro = botoes.querySelector('button');
        if (primeiro) primeiro.focus();
    }

    // Estilo próprio, para funcionar mesmo se o sistema não carregar o sge-core.css.
    function _estiloAcesso() {
        if (document.getElementById('sge-acesso-estilo')) return;
        const s = document.createElement('style');
        s.id = 'sge-acesso-estilo';
        s.textContent = [
            'html.sge-acesso-pendente body>*:not(.sge-carregando):not(.sge-avisos):not(.sge-offline),',
            'html.sge-acesso-bloqueado body>*:not(.sge-acesso-tela):not(.sge-avisos):not(.sge-offline){visibility:hidden!important}',
            '.sge-acesso-tela{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(15,23,42,.92);font-family:var(--sge-fonte,system-ui,-apple-system,"Segoe UI",sans-serif)}',
            '.sge-acesso-cartao{background:#fff;color:#1e293b;border-radius:16px;padding:32px 24px;max-width:440px;width:100%;text-align:center;box-shadow:0 24px 64px rgba(0,0,0,.4)}',
            '.sge-acesso-cartao h2{margin:0 0 10px;font-size:21px;font-weight:800;color:var(--cor)}',
            '.sge-acesso-cartao p{margin:0 0 10px;font-size:15px;line-height:1.6;color:#475569}',
            '.sge-acesso-cartao .sge-acesso-extra{font-weight:600;color:#1e293b}',
            '.sge-acesso-botoes{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:20px}',
            '.sge-acesso-botoes button{min-height:44px;padding:10px 20px;border-radius:8px;font:600 15px inherit;font-family:inherit;cursor:pointer;border:1px solid #cbd5e1;background:#f1f5f9;color:#334155}',
            '.sge-acesso-botoes button:first-child{background:var(--cor);border-color:var(--cor);color:#fff}',
            '.sge-acesso-botoes button:focus-visible{outline:3px solid #f59e0b;outline-offset:2px}',
        ].join('\n');
        document.head.appendChild(s);
    }

    // ── O que a pessoa pode ver (lista nula = tudo, igual ao banco) ──
    function pode(tela) {
        const p = _acesso.perm;
        return !!(p && p.papel) && (p.telas == null || p.telas.indexOf(tela) !== -1);
    }

    function podeColuna(coluna) {
        const p = _acesso.perm;
        return !!(p && p.papel) && (p.colunas == null || p.colunas.indexOf(coluna) !== -1);
    }

    function temPapel() {
        const papel = _acesso.perm && _acesso.perm.papel;
        if (!papel) return false;
        const lista = [].concat.apply([], arguments).map((x) => String(x).trim().toUpperCase());
        return lista.indexOf(papel) !== -1;
    }

    const _SELETOR = '[data-sge-tela],[data-sge-coluna],[data-sge-papel]';

    // Esconde o que a pessoa não pode ver. Só esconde: quem barra de verdade é o banco.
    function aplicar(raiz) {
        if (!_acesso.perm) return;
        raiz = raiz || document;
        if (raiz.nodeType === 1 && raiz.matches(_SELETOR)) _aplicarEm(raiz);
        if (raiz.querySelectorAll) raiz.querySelectorAll(_SELETOR).forEach(_aplicarEm);
    }

    function _aplicarEm(el) {
        const d = el.dataset;
        const ok = (d.sgeTela == null || pode(d.sgeTela))
            && (d.sgeColuna == null || podeColuna(d.sgeColuna))
            && (d.sgePapel == null || temPapel(d.sgePapel.split(',')));
        const oculto = el.hasAttribute('data-sge-oculto');
        if (!ok && !oculto) {
            el.setAttribute('data-sge-oculto', el.style.getPropertyValue('display')); // guarda o display original
            el.style.setProperty('display', 'none', 'important');
        } else if (ok && oculto) {
            const antes = el.getAttribute('data-sge-oculto');
            el.removeAttribute('data-sge-oculto');
            if (antes) el.style.setProperty('display', antes); else el.style.removeProperty('display');
        }
    }

    // Conteúdo criado depois (tabelas, menus) também passa pelo filtro.
    function _vigiarPagina() {
        if (_acesso.observador || typeof MutationObserver === 'undefined') return;
        _acesso.observador = new MutationObserver((mudancas) => {
            mudancas.forEach((m) => {
                if (m.type === 'attributes') _aplicarEm(m.target);
                else m.addedNodes.forEach((n) => { if (n.nodeType === 1) aplicar(n); });
            });
        });
        _acesso.observador.observe(document.documentElement, {
            childList: true, subtree: true, attributes: true,
            attributeFilter: ['data-sge-tela', 'data-sge-coluna', 'data-sge-papel'],
        });
    }

    // ── Radar de presença (canal "sge-radar" lido pela Central) ──
    function _id() {
        if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
        return 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2);
    }

    function _entrarNoRadar() {
        if (typeof _acesso.db.channel !== 'function') return;
        let sessao = null;
        try { sessao = sessionStorage.getItem('sge_acesso_sessao'); } catch (_) {}
        if (!sessao) {
            sessao = _id();
            try { sessionStorage.setItem('sge_acesso_sessao', sessao); } catch (_) {}
        }
        const u = _acesso.usuario;
        _acesso.presenca = {
            session_id: sessao, user_id: u.id, user_name: u.nome, user_email: u.email,
            app_slug: _acesso.slug, app_name: _acesso.perm.sistema_nome || _acesso.slug,
            status: 'online', tab_id: sessao.slice(0, 8), url: location.pathname,
            entrou_em: new Date().toISOString(),
        };
        const canal = _acesso.db.channel('sge-radar', { config: { presence: { key: sessao } } });
        _acesso.canal = canal;
        canal.subscribe((status) => { if (status === 'SUBSCRIBED') _marcar(); });
        ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'].forEach((ev) => document.addEventListener(ev, _ativo, { passive: true }));
        document.addEventListener('visibilitychange', _visibilidade);
        window.addEventListener('pagehide', _sairDoRadar);
        window.addEventListener('pageshow', _voltouDoCache);
        _ativo();
    }

    function _marcar() {
        const canal = _acesso.canal;
        if (!canal || !_acesso.presenca) return;
        Promise.resolve().then(() => canal.track(_acesso.presenca)).catch(() => {});
    }

    function _sairDoRadar() {
        const canal = _acesso.canal;
        if (canal) Promise.resolve().then(() => canal.untrack()).catch(() => {});
    }

    // Página restaurada do cache do navegador (botão voltar): volta ao radar e confere de novo.
    function _voltouDoCache(ev) {
        if (!ev.persisted || _acesso.encerrado) return;
        _marcar();
        reconferir();
    }

    function _status(s) {
        if (!_acesso.presenca || _acesso.presenca.status === s) return;
        _acesso.presenca.status = s;
        _marcar();
    }

    function _ativo() {
        if (_acesso.encerrado) return;
        clearTimeout(_acesso.timerAusente);
        _status('online');
        _acesso.timerAusente = setTimeout(() => _status('away'), ACESSO.ausenteMs);
    }

    function _visibilidade() {
        if (document.hidden) { _status('away'); return; }
        _ativo();
        // Aba ficou escondida muito tempo (o navegador atrasa os relógios): confere agora.
        if (Date.now() - _acesso.ultimaConferencia >= ACESSO.reconferirMs) reconferir();
    }

    // ── Reconferência periódica (bloqueio, acesso retirado, manutenção) ──
    async function reconferir() {
        if (!_acesso.perm || _acesso.encerrado) return null;
        _acesso.ultimaConferencia = Date.now();
        let r;
        try { r = await _conferir(); } catch (e) { r = { situacao: 'erro', erro: e }; }
        if (_acesso.encerrado) return null;
        if (r.situacao === 'erro') {
            // Falha de rede não derruba quem já entrou; o banco continua barrando o que não pode.
            console.warn('[SGE] Não consegui reconferir o acesso; tento de novo em 5 minutos.', r.erro);
            return 'erro';
        }
        if (r.situacao !== 'ok') { _derrubar(r); return r.situacao; }
        _acesso.perm = r.perm;
        aplicar();
        return 'ok';
    }

    function _encerrar() {
        _acesso.encerrado = true;
        _acesso.perm = null;
        clearInterval(_acesso.timerConferir);
        clearTimeout(_acesso.timerAusente);
        if (_acesso.observador) { _acesso.observador.disconnect(); _acesso.observador = null; }
        ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'].forEach((ev) => document.removeEventListener(ev, _ativo));
        document.removeEventListener('visibilitychange', _visibilidade);
        window.removeEventListener('pagehide', _sairDoRadar);
        window.removeEventListener('pageshow', _voltouDoCache);
        const canal = _acesso.canal;
        _acesso.canal = null;
        if (canal) {
            Promise.resolve().then(() => canal.untrack()).catch(() => {});
            try { _acesso.db.removeChannel(canal); } catch (_) {}
        }
    }

    async function sair(slug) {
        _encerrar();
        if (!_acesso.db) { try { _acesso.db = cliente(ACESSO.url, ACESSO.chave); } catch (_) {} }
        try { if (_acesso.db) await _acesso.db.auth.signOut({ scope: 'local' }); } catch (_) {}
        try { sessionStorage.removeItem(_CHAVE_VOLTAS); } catch (_) {}
        return _irParaLogin(slug);
    }

    function tipoDeErro(e) {
        if (_eErroDeLogin(e)) return 'login';
        if (_eErroDeRede(e)) return 'rede';
        return 'outro';
    }

    const acesso = {
        entrar,
        pode,
        podeColuna,
        temPapel,
        aplicar,
        reconferir,
        sair,
        irParaLogin: (slug) => _irParaLogin(slug),
        tipoDeErro,
        conexao: () => cliente(ACESSO.url, ACESSO.chave), // conexão da Central (usada pela barra)
        get central() { return ACESSO.central; },
        get usuario() { return _acesso.perm ? Object.assign({}, _acesso.usuario) : null; },
        get papel() { return _acesso.perm ? _acesso.perm.papel : null; },
        get permissoes() { return _acesso.perm ? JSON.parse(JSON.stringify(_acesso.perm)) : null; },
        _ir: (url) => window.location.assign(url), // troca de página (substituível nos testes)
    };

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
        acesso,
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
