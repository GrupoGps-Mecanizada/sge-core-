# SGE Core

Peças comuns a todos os sistemas do SGE: visual (cores, botões, tabelas, tema escuro), avisos na tela, erros em linguagem simples, tela de "carregando", formulário que não perde o que foi digitado, formatos brasileiros e uma conexão única com o Supabase.

**Não mexe no login.** O login continua no `sso_client.js` (SGE_GRUPOGPS) e a presença no `sge-session-ping.js` (SGE-CENTRAL).

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

Também fica em `window.SGECore`. Se o sistema já tiver um `window.SGE` próprio, o núcleo só acrescenta o que falta e não apaga nada.

## Versões
- A pasta `v1/` nunca recebe mudança que quebre os sistemas. Mudança grande vai para uma pasta `v2/`.
- Veja o `CHANGELOG.md`.

## Testar
Abra o `index.html` no navegador. É uma página de exemplo, com dados falsos.

## Publicar (grátis)
Repositório `sge-core` na organização GrupoGps-Mecanizada → Settings → Pages → branch `main`.
