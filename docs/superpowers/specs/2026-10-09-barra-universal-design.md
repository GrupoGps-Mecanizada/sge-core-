# Barra Universal SGE — desenho

Data: 2026-10-09 · Aprovado em conversa pelo Warlison (modelo "estilo Google/Microsoft").
Ligados: Plano do Portal SGE (cofre) · barra do SST (`SST - Mecanizada/sistema/src/components/barra-superior.tsx`, modelo visual).

## 1. Objetivo
Uma barra de topo **igual em todos os sistemas do SGE**, no visual da barra do SST:
- **Esquerda:** logo SGE → abre a **grade de sistemas** que a pessoa tem liberados (ícone elegante + cor de cada sistema). Clicou, o sistema abre **no lugar** (tela inteira, mesma sessão).
- **Meio:** nome do sistema + **menus próprios** de cada sistema (com submenus explicados). Item com permissão de tela só aparece para quem pode.
- **Direita (área de login):** busca Ctrl+K, tema claro/escuro e usuário (nome, e-mail, papel, Sair).

Sucesso = o SST e o portal usam a mesma barra; um sistema novo ganha a barra com ~15 linhas de configuração; nada do CSS do sistema quebra a barra e vice-versa.

**Fora do escopo desta entrega:** colocar a barra no SST e nos sistemas antigos (cada um em sua etapa); busca que procura dentro de vários sistemas ao mesmo tempo.

## 2. Modelo de navegação
- Cada sistema abre em **página inteira** no endereço do portal (`https://sge-portal.pages.dev/<Caminho>/`), então a sessão do Supabase é a mesma em todos.
- O portal deixa de ter molduras/abas/botão flutuante: vira só a **página inicial** (grade grande) com a própria barra.
- Sistemas sem a barra continuam abrindo normalmente (voltar pelo navegador ou pelo endereço do portal) até serem atualizados.

## 3. Peças (sge-core v1.2.0)
| Arquivo | Faz | Depende de |
|---|---|---|
| `v1/sge-icones.js` | `SGE.icones` (lista dos nomes) e `SGE.icone(nome, tamanho)` → elemento `<svg>`. ~35 ícones de linha (Lucide, licença ISC, livre; aviso de licença no arquivo). Nome desconhecido → `grade`. | nada |
| `v1/sge-barra.js` | Componente `<sge-barra>` + `SGE.barra.montar(opcoes)`. | `sge-core.js`, `sge-icones.js`, supabase-js |
| `sge-core.js` | Versão 1.2.0 e `SGE.acesso.conexao()` (a conexão da Central, usada pela barra). | — |

Ordem na página: supabase-js → `sge-core.js` → `sge-icones.js` → `sge-barra.js`.
Os arquivos ficam separados para quem não usa a barra não carregar nada a mais (o `sge-core.js` já tem ~720 linhas).

### 3.1 Ícones
Nomes já usados no banco (`truck, clipboard, tablet, ruler, wrench, box, users, check-circle, clock, shield, default`) + extras para sistemas e para a própria barra:
`grade, home, user, truck, clipboard, clipboard-check, tablet, ruler, wrench, box, check-circle, clock, shield, shield-check, hard-hat, file-text, chart, calendar, map-pin, settings, search, bell, alert, gauge, fuel, flask, briefcase, building, activity, layers, tema, sair, menu, seta-baixo, fechar, abrir-fora`.
`default` é apelido de `grade`. Traço 1,75 px, cantos redondos, `currentColor`.

### 3.2 Configuração que cada sistema passa
```js
const barra = SGE.barra.montar({
  sistema: 'sst',                 // slug: marca o sistema atual na grade
  nome: 'SST',                    // nome curto na barra
  area: 'Mecanizada',             // subtítulo (opcional)
  inicio: '/sst/',                // para onde o nome leva
  secoes: [                       // menus próprios (opcional; sem secoes = só logo, nome e área de login)
    { rotulo: 'Início', icone: 'home', href: '/sst/' },              // link direto
    { rotulo: 'Colaboradores', icone: 'users', texto: 'Consultar e cadastrar pessoas',
      itens: [ { rotulo: 'Matriz', texto: 'Quem tem cada requisito', href: '/sst/matriz',
                 icone: 'clipboard-check', grupo: 'Consultas', tela: 'matriz' } ] },
  ],
  atual: () => location.pathname, // tela ativa (padrão: o caminho mais longo que bate com location.pathname)
  aoNavegar: (href, ev) => {},    // opcional: sistemas SPA/Next trocam de tela sem recarregar
  aoBuscar: () => {},             // opcional: Ctrl+K e botão de busca chamam isto; sem ele, a busca procura sistemas
  aoSair: () => {},               // opcional: só se o sistema NÃO usa SGE.acesso
  alvo: document.body,            // opcional: onde a barra entra (padrão: primeiro filho do body)
});
barra.contador('/sst/pendencias', 12); // número ao lado de um item/seção (some com 0)
barra.atualizar({ secoes });           // troca menus (ex.: depois de carregar permissões)
barra.destruir();
```

### 3.3 Regras de exibição
- Item com `tela` só aparece se `SGE.acesso.pode(tela)`; seção sem itens visíveis some. Se o sistema não usa `SGE.acesso` (`SGE.acesso.permissoes === null`), a barra mostra o que recebeu (o sistema filtra antes).
- Usuário: `SGE.acesso.usuario` / `SGE.acesso.papel`; sem `SGE.acesso`, e-mail da sessão do Supabase (`SGE.cliente().auth.getSession()`); sem sessão, mostra "Entrar" (leva ao login da Central).
- Sair: `SGE.acesso.sair(sistema)`; sem `SGE.acesso`, `aoSair()`.
- Tema: alterna `data-tema="escuro|claro"` no `<html>`, guarda em `localStorage.sge_tema` e avisa com o evento `sge:tema` (o SST e outros podem ouvir).

## 4. Visual
- Altura 62 px (computador) / 56 px (celular), fixa no topo (`position: sticky`).
- Fundo `--sge-marca-escura`, textos claros, botões arredondados 8 px, menu do meio numa "cápsula" translúcida (igual SST). Submenus e grade em cartão claro (`--sge-superficie`), sombra forte, raio 12 px.
- **Shadow DOM** (estilo isolado): o CSS do sistema não entra na barra e o da barra não vaza. Usa as variáveis `--sge-*` quando o sistema carrega `sge-core.css`; senão, valores padrão iguais aos do sge-core.
- **Grade de sistemas** (painel de ~380 px abaixo do logo): grupos por `area_menu` (ordem: `ordem`, depois nome); cada sistema = quadrado 52 px, raio 14 px, fundo claro neutro com borda fina e ícone cinza 24 px (azul de destaque ao passar o mouse e no sistema atual), nome embaixo (2 linhas no máximo). **Sem cor por sistema** (decisão do Warlison em 2026-10-09). Rodapé: "Página inicial do SGE" (portal). Carregando: quadrados cinza piscando. Erro: "Não consegui carregar seus sistemas" + Tentar de novo.
- **Celular (< 768 px):** logo (abre a grade), nome do sistema + tela atual, busca e ☰. O ☰ abre uma gaveta à direita com os menus, o usuário e Sair.
- Acessibilidade: botões com `aria-expanded`/`aria-haspopup`, Esc fecha, clique fora fecha, foco volta ao botão, alvos de toque ≥ 44 px no celular, respeita "reduzir movimento".

## 5. Dados
- Lista de sistemas: `rpc('sge_meus_sistemas')` (já existe). **Mudança no banco:** incluir `cor` no retorno (migração nova em `SGE-CENTRAL/supabase/migrations/`; o Warlison aplica).
- Guardada em `sessionStorage` por 5 min (`sge_barra_sistemas`) para não consultar a cada troca de página; zera ao sair.
- Endereço de cada sistema: mesma regra do portal (`enderecoNoPortal`): github.io da organização → caminho no endereço atual; só `http(s)`; barra invertida, caracteres de controle e `//` recusados. `abre_fora` → nova aba (`noopener`).

## 6. Segurança
- Todo texto por `textContent` (nada de `innerHTML` com dado do banco ou do sistema). Ícones montados por `createElementNS` com desenhos fixos do arquivo.
- A barra **só mostra**; quem barra é o `SGE.acesso` de cada sistema e o RLS do banco.
- Nenhuma chave nova; usa a conexão do `SGE.cliente()`.

## 7. Erros
| Situação | O que acontece |
|---|---|
| Sem internet / erro ao listar sistemas | Grade mostra aviso + Tentar de novo; o resto da barra funciona |
| Sem sessão | Área de login mostra "Entrar" |
| Ícone desconhecido | Ícone `grade` |
| `cor` vazia ou inválida (não `#rrggbb`) | `--sge-marca` |
| `sge-icones.js` não carregado | `SGE.barra.montar` avisa no console e desenha sem ícones |

## 8. Testes (Node + jsdom, como os atuais)
- Ícones: nome conhecido gera `<svg>`; desconhecido cai em `grade`; `default` = `grade`.
- Barra: desenha logo/nome/seções; item com `tela` some sem permissão; seção vazia some; tela ativa marcada; `contador` mostra e esconde número.
- Grade: agrupa por área e ordem; sistema atual marcado; endereço do github.io vira caminho; `javascript:`/`//`/barra invertida recusados; `abre_fora` abre em nova aba; erro mostra Tentar de novo; cache de 5 min.
- Teclado: Ctrl+K chama `aoBuscar` (ou abre a grade com busca); Esc fecha e devolve o foco.
- Usuário: Sair chama `SGE.acesso.sair`; sem sessão aparece "Entrar"; nome com `<img onerror>` aparece como texto.
- Tema: alterna `data-tema`, grava e dispara `sge:tema`.
- Manual: `teste-barra.html` no sge-core (página de demonstração com dados de exemplo, sem dados reais).

## 9. Entregas
1. **sge-core v1.2.0**: `sge-icones.js`, `sge-barra.js`, testes, `teste-barra.html`, CHANGELOG/LEIA-ME. Publicar.
2. **Banco**: `sge_meus_sistemas` devolve `cor`.
3. **Portal v0.3.0**: só a página inicial (barra + grade grande com os mesmos ícones); remove molduras, abas e botão flutuante. O roteador do Cloudflare (que serve cada sistema no endereço do portal) **continua**.
4. **Central**: seletor de ícone (lista do `SGE.icones`) e de cor na tela de Sistemas.
5. **SST** (etapa própria): trocar a `BarraSuperior` pela `<sge-barra>` com as mesmas seções e contadores; paleta Ctrl+K do SST ligada em `aoBuscar`.
6. Demais sistemas, aos poucos.
