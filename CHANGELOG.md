# Mudanças do SGE Core

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
