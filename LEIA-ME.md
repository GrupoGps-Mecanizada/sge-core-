# SGE Core

Peças comuns a todos os sistemas do SGE: visual (cores, botões, tabelas, tema escuro), avisos na tela, erros em linguagem simples, tela de "carregando", formulário que não perde o que foi digitado, formatos brasileiros e uma conexão única com o Supabase.

Desde a v1.1, também traz o **acesso** (`SGE.acesso`): login único da Central + o que cada pessoa pode ver em cada sistema. Os sistemas que ainda usam `sso_client.js` + `sge-session-ping.js` continuam funcionando: o `SGE.acesso` só age quando o sistema chama `SGE.acesso.entrar()`.

## Como usar num sistema
No `<head>`:
```html
<link rel="stylesheet" href="https://grupogps-mecanizada.github.io/sge-core/v1/sge-core.css">
```
No fim do `<body>`, **depois** do supabase-js e do sso_client.js:
```html
<script src="https://grupogps-mecanizada.github.io/sge-core/v1/sge-core.js"></script>
```
O visual novo só vale dentro de elementos com a classe `sge` (ex.: `<body class="sge">`). Assim, os sistemas antigos não mudam de aparência sem querer.

## Funções
| Função | Para quê |
|---|---|
| `SGE.cliente()` | conexão Supabase única. Sem parâmetros, usa o mesmo projeto do login. Recusa chave secreta. |
| `SGE.aviso('Salvo!', 'sucesso')` | aviso rápido (`sucesso`, `erro`, `alerta`, `info`) |
| `SGE.erro(e, 'salvar turno')` | mostra o erro em linguagem simples |
| `SGE.seguro(() => db.from('x').insert(...), { sucesso: 'Salvo!' })` | carregando + erro tratado numa linha |
| `SGE.rascunho.ligar(form)` | guarda o que foi digitado (nunca guarda senha) |
| `SGE.formatar.data / dataHora / numero / moeda` | padrão brasileiro |
| `SGE.logo()` | endereço do logo oficial |

## Acesso (v1.1): uma linha por sistema
```html
<html lang="pt-BR" class="sge-acesso-pendente">   <!-- opcional: esconde a página até conferir -->
...
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="https://grupogps-mecanizada.github.io/sge-core/v1/sge-core.js"></script>
<script>
  SGE.acesso.entrar('slug_do_sistema').then(iniciarSistema); // só roda se a pessoa PODE entrar
</script>
```
O que o `entrar` faz: usa a sessão real do login da Central (Supabase Auth); sem sessão, manda para o `sso_login.html` e volta; pergunta ao banco (`sge_minhas_permissoes`); mostra a tela "Sem acesso", "Manutenção" ou "Não consegui conferir" quando for o caso (**erro de rede nunca deixa entrar**); esconde o que a pessoa não pode ver; coloca a pessoa no radar da Central e reconfere acesso e manutenção a cada 5 minutos, derrubando na hora se for bloqueada.

| Peça | Para quê |
|---|---|
| `SGE.acesso.usuario` | `{ id, nome, email }` |
| `SGE.acesso.papel` | `ADMIN`, `GESTOR`, `SUPERVISOR`, `OPERADOR`, `LEITURA` ou `AUDITOR` |
| `SGE.acesso.permissoes` | tudo o que o banco devolveu (telas, colunas, setores, aprovação, admin da Central) |
| `SGE.acesso.pode('tela')` / `podeColuna('col')` | lista vazia de telas = nenhuma; lista **nula** = todas (igual ao banco) |
| `SGE.acesso.temPapel('ADMIN', 'GESTOR')` | a pessoa tem um desses papéis? |
| `SGE.acesso.aplicar(elemento?)` | reaplica o filtro (já roda sozinho, inclusive em conteúdo criado depois) |
| `SGE.acesso.reconferir()` | confere agora, sem esperar os 5 minutos |
| `SGE.acesso.sair(slug?)` | sai neste navegador e volta para o login (o `slug` é opcional se já chamou `entrar`) |
| `SGE.acesso.irParaLogin(slug?)` | vai para o login da Central (com a proteção contra vai-e-volta); a promessa nunca resolve |
| `SGE.acesso.tipoDeErro(e)` | devolve `'login'`, `'rede'` ou `'outro'` |
| `SGE.acesso.central` | endereço da Central (o mesmo em que o sistema está aberto: portal ou github.io) |

Teste local sem o portal: `window.SGE_CENTRAL_URL_OVERRIDE = 'https://grupogps-mecanizada.github.io/SGE-CENTRAL'` antes do sge-core.

No HTML, para esconder sozinho:
```html
<a data-sge-tela="relatorios">Relatórios</a>
<th data-sge-coluna="salario">Salário</th>
<button data-sge-papel="ADMIN,GESTOR">Aprovar</button>
```
**Esconder não é proteger.** Quem barra de verdade é o banco: as tabelas do sistema usam as funções `acesso_priv.tem_papel`, `pode_tela`, `coluna_permitida` e `setor_permitido` no RLS.

Ao migrar um sistema (Fase 5): tirar o `sso_client.js` e o `sge-session-ping.js` (para não aparecer duas vezes no radar) e trocar o `checkAuth()` pelo `SGE.acesso.entrar()`.

Também fica em `window.SGECore`. Se o sistema já tiver um `window.SGE` próprio, o núcleo só acrescenta o que falta e não apaga nada.

## Barra universal (v1.2)
A mesma barra de topo em todos os sistemas: logo SGE (abre a grade com os sistemas da pessoa), menus do sistema, busca Ctrl+K, tema e usuário.
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js"></script>
<script src="/sge-core-/v1/sge-core.js"></script>
<script src="/sge-core-/v1/sge-icones.js"></script>
<script src="/sge-core-/v1/sge-barra.js"></script>
<script>
(async () => {
  const barra = SGE.barra.montar({
    sistema: 'gestao_efetivo_mec', nome: 'Gestão de Efetivo', area: 'Mecanizada', inicio: '/Gest-o-Efetivo/',
    secoes: [
      { rotulo: 'Início', icone: 'home', href: '/Gest-o-Efetivo/' },
      { rotulo: 'Equipes', icone: 'users', texto: 'Quem está em cada equipe', itens: [
        { rotulo: 'Quadro', texto: 'Equipes do dia', href: '/Gest-o-Efetivo/quadro', icone: 'clipboard', grupo: 'Consultas', tela: 'quadro' } ] },
    ],
    // aoBuscar: () => abrirMinhaBusca(),   // opcional: Ctrl+K abre a busca do sistema
    // aoNavegar: (href) => router.push(href), // opcional: sistemas que trocam de tela sem recarregar
  });
  await SGE.acesso.entrar('gestao_efetivo_mec');
  barra.atualizar(); // depois do login: esconde o que a pessoa não pode ver e mostra o nome dela
})();
</script>
```
- Sistema que troca de tela sem recarregar (React/Next, `history.pushState`): chame `barra.atualizar()` a cada troca de tela (no Next: num `useEffect` com o `usePathname()`), e monte a barra só depois que a página carregar (`useEffect`).
- `tela` no item = só aparece para quem tem essa tela liberada. `barra.contador(href, n)` põe um número ao lado (0 esconde).
- O visual fica isolado (Shadow DOM): o CSS do sistema não estraga a barra. Deixe o `<body>` sem margem (`margin: 0`) para a barra encostar nas bordas.
- Ícones: `SGE.icone('truck', 20)` e a lista em `SGE.icones`. Ícone e cor de cada sistema vêm da tela de Sistemas da Central.
- Teste visual: `teste-barra.html` (dados de exemplo; `?abrir=grade` abre a grade).

## Versões
- A pasta `v1/` nunca recebe mudança que quebre os sistemas. Mudança grande vai para uma pasta `v2/`.
- Veja o `CHANGELOG.md`.

## Testar
- Testes automáticos: `npm install` (uma vez) e depois `npm test`. Usam uma página e um Supabase falsos, sem tocar no banco.
- Visual: abra o `index.html` no navegador. É uma página de exemplo, com dados falsos.

## Publicar (grátis)
Repositório `sge-core` na organização GrupoGps-Mecanizada → Settings → Pages → branch `main`.
