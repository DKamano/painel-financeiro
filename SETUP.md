# Casa — Finanças a dois

O site é publicado pelo GitHub Pages, a partir de `main / (root)`.
Abra https://dkamano.github.io/painel-financeiro/.

## Serviço de leitura e gravação

1. Na conta `camanodiogo@gmail.com`, crie um projeto no Google Apps Script.
2. Copie `server/Code.gs` para o editor.
3. Em Configurações do projeto → Propriedades do script, adicione `ACCESS_PASSWORD` com a senha de acesso. Não coloque a senha neste repositório.
4. Publique como Aplicativo da Web, executando como proprietário, com acesso “Qualquer pessoa”. O código exige sessão válida antes de ler ou gravar dados.
5. Autorize o acesso à planilha e copie a URL terminada em `/exec`.
6. Configure a URL em `dist/config.js` e publique, ou use a tela Configurações do painel para salvar a URL neste navegador.

O serviço aceita apenas os dois e-mails configurados e senha. Não comprova a propriedade do e-mail por OTP. A sessão vence após uma hora. Escritas usam identificadores únicos e trava para evitar duplicidades; só mostram sucesso depois de ler o registro salvo.

## Dados

- Os blocos da aba `2025/2026` incluem os anos 2022 a 2026. Cada ano e mês é separado.
- Linhas de totais, saldos e resumos anuais não são transações. A linha “Renda por mês” fornece receitas.
- Casa é a visão inicial. Diogo considera somente novos lançamentos, por solicitação do usuário.
- Maina importa os blocos pessoais Cash e Outros débitos/créditos com competência explícita. Detalhes de cartão já incluídos na casa e blocos com datas ambíguas ficam disponíveis apenas na consulta original.
- Cada conta possui filtros e limite mensal próprios. Não se presume divisão de despesas em 50/50.
- Novos lançamentos são gravados na aba `Lançamentos Painel` da mesma planilha. O painel soma essa aba ao histórico; as fórmulas antigas da aba principal não são modificadas.
- Sem serviço configurado, o painel é somente consulta e bloqueia a gravação. Nenhum lançamento é simulado como salvo.

## Limitações de privacidade existentes

A leitura CSV sem serviço depende do compartilhamento atual da planilha. A validação local de senha só oculta a interface. Para restringir efetivamente os dados, use o serviço e altere o compartilhamento da planilha para restrito depois de confirmar os dois acessos. A senha anterior já foi incluída no histórico público de Git; use uma nova senha no serviço para proteção efetiva. Alterações de compartilhamento e de senha não são feitas automaticamente.

## Verificação

`node --test tests/data.test.mjs` verifica leitura de CSV, separação anual, exclusão de totais e cálculos. `node --test tests/server.test.mjs` verifica autenticação, validação e idempotência com um serviço de planilha simulado. Testes locais não substituem a validação de uma gravação real.
