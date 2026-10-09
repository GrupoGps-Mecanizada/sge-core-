# Mudanças do SGE Core

## v1.2.0 · 2026-10-09
- Novo `sge-icones.js`: `SGE.icone(nome, tamanho)` e `SGE.icones` — ícones de linha (Lucide, licença ISC) para os sistemas e a barra.
- Novo `sge-barra.js`: `SGE.barra.montar({...})` — barra de topo universal (logo SGE com a grade de sistemas, menus do sistema com permissão por tela, busca Ctrl+K, tema claro/escuro, usuário e Sair; gaveta no celular). Estilo isolado (Shadow DOM). Marca a tela atual por caminho ou por `#`.
- `SGE.acesso.conexao()`: a conexão da Central (usada pela barra).
- Página de demonstração `teste-barra.html` (dados de exemplo). Testes: 65.
- Ícones da grade neutros (cinza; azul no sistema atual e ao passar o mouse), sem a cor de cada sistema — pedido do Warlison.
- Revisão final: a fonte do sistema não entra na barra; redesenhar com painel aberto não perde a busca, o foco nem a rolagem; no tablet (até 1100 px) os menus viram só ícones; tela ativa acompanha SPA; lista de sistemas guardada por usuário; toque fora fecha no iPad.

## v1.1.1 · 2026-10-08
- Login da Central no mesmo endereço em que o sistema está aberto (portal ou github.io), para a sessão ser a mesma; novos `SGE.acesso.central`, `irParaLogin(slug)`, `sair(slug)` e `tipoDeErro(e)`.
- Teste local sem o portal: `window.SGE_CENTRAL_URL_OVERRIDE` continua valendo e vence a regra automática.
- Testes automáticos (`npm test`): 38 testes.

## v1.1.0 · 2026-10-08
- Novo `SGE.acesso` (Fase 3 da Central de Acesso): `await SGE.acesso.entrar('slug')` usa a sessão real do Supabase Auth da Central, manda para o login quando precisa, carrega as permissões de `sge_minhas_permissoes`, mostra as telas "Sem acesso", "Manutenção" e "Não consegui conferir", esconde `data-sge-tela` / `data-sge-coluna` / `data-sge-papel`, entra no radar `sge-radar` e reconfere acesso e manutenção a cada 5 minutos.
- Segurança: sem token caseiro (o `sso_token` antigo é ignorado e tirado da URL); erro de rede na entrada nunca deixa entrar; proteção contra vai-e-volta infinito com o login.
- `SGE.cliente()` sem parâmetros e sem `sso_client.js` na página passa a usar o projeto da Central.
- Testes automáticos (`npm test`): 33 testes do núcleo e do acesso.
- Compatível: sistemas com `sso_client.js` continuam iguais até serem migrados.

## v1.0.1 · 2026-10-04
- O núcleo descobre o próprio endereço sozinho: o logo funciona com qualquer nome de repositório.

## v1.0.0 · 2026-10-04
- Primeira versão: visual padrão (claro e escuro), avisos, erros em linguagem simples, carregando, rascunho de formulário, formatos brasileiros, conexão Supabase única com bloqueio de chave secreta e faixa "sem internet".
