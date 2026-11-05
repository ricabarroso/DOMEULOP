# Gerador de Documentos Médicos

Aplicação em Next.js para auxiliar a criação de receitas, atestados, pedidos de exames e APAC, além de disponibilizar o PDF original da ficha de Atendimento Anti-Rábico Humano, com foco em uso clínico seguro, organização e privacidade.

## Funcionalidades

- Geração de texto estruturado para receitas médicas
- Inclusão de vários medicamentos por receita, impressos no formato “medicamento/concentração — quantidade” com a posologia logo abaixo
- Data do documento preenchida com a data local atual; cidade/estado é informado manualmente
- Atestado médico com período de afastamento e observações
- Pedido de exames com descrição clínica e orientação de coleta
- APAC com justificativa, procedimentos e critérios de segurança
- Preenchimento dos campos da ficha original de Atendimento Anti-Rábico Humano
- Geração local de uma cópia preenchida sobre o PDF original, mantendo as duas páginas e o layout da ficha
- Consulta automática do estabelecimento pelo código CNES
- Páginas dedicadas para cada tipo de documento
- Modelos PDF com seções visuais para receita, atestado e pedido de exames; a APAC mantém sua estrutura de campos
- Layout das receitas, atestados e pedidos de exames em verde-claro, com opção de incluir logo PNG/JPEG
- Geração de PDF no navegador com abertura da visualização em nova aba
- Sugestões de profissionais e estabelecimentos usados durante a sessão, com dados de paciente e profissional compartilhados entre os documentos
- Receita de medicamento manipulado em texto livre
- Modelos de prescrição por doença, salvos na conta e carregados com um clique
- Login com e-mail e senha, recuperação de senha por e-mail, aprovação administrativa de novas contas e revogação de acessos
- Link de recuperação compatível com abertura em outro navegador ou pelo aplicativo de e-mail do celular
- Aviso explícito sobre privacidade e necessidade de consentimento
- Visualização em tempo real do documento pronto para copiar e usar

## Páginas de documentos

- `/receita` — receita médica
- `/atestado` — atestado médico
- `/pedido-exames` — pedido de exames
- `/apac` — APAC
- `/login` — login com e-mail e senha
- `/reset-password` — criação de uma nova senha após validar o link enviado por e-mail
- `/pending` — aviso de cadastro aguardando aprovação
- `/atendimento-antirrabico` — preenchimento, pré-visualização, impressão e download da ficha de Atendimento Anti-Rábico Humano

O caminho `/atendimento-antirrabico` usa como base, sem alterar o conteúdo impresso, o PDF original indicado pelo usuário e baixado do [portal oficial do SINAN](https://portalsinan.saude.gov.br/images/documentos/Agravos/Atendimento%20Anti-rabico/anti_rabico_v5.pdf), armazenado em `public/atendimento-antirrabico.pdf`. A aplicação coloca os dados digitados sobre uma cópia local desse arquivo para gerar o PDF preenchido. O PDF indica SVS — 27/09/2005; confirme a versão e as orientações vigentes antes de usar.

Nas páginas editáveis, preencha e confira a pré-visualização. Na página antirrábica, preencha os campos correspondentes à ficha e gere o PDF para visualizar, imprimir ou baixar.

## Consulta CNES

Ao informar os 7 dígitos do CNES, a aplicação consulta a API pública de Dados Abertos do Ministério da Saúde e mostra nome, endereço e CEP do estabelecimento, quando disponíveis.

Na página APAC, solicitante e executante são estabelecimentos independentes e têm campos e consultas CNES separados. A consulta de um não preenche nem altera os dados do outro. Escolher CNS como documento do profissional solicitante e informar 15 dígitos consulta a busca pública de profissionais do CNES (`/services/profissionais?cns=...`). Quando localizado, o nome do profissional é preenchido para conferência. A consulta é limitada ao CNS do profissional no cadastro público do CNES; o CNS do paciente permanece no formulário e no PDF, sem ser enviado para a API. A geração do PDF também acontece localmente no navegador.

## Regras de privacidade

- O formulário solicita apenas os dados indispensáveis para cada documento.
- Sugere-se evitar armazenamento em planilhas ou canais inseguros.
- Não há busca automática de CPF.
- Os dados de paciente e profissional usados para preencher os documentos ficam apenas na memória da sessão do navegador. Não são gravados no Supabase e são descartados ao recarregar ou encerrar a página.
- Os modelos de prescrição persistidos contêm somente doença/diagnóstico e dados da prescrição. Eles são vinculados à conta autenticada e protegidos por políticas RLS para que cada usuário acesse somente os próprios modelos.
- O login é fornecido pelo Supabase Auth com e-mail e senha (confirmação de e-mail obrigatória). Os três endereços autorizados abaixo têm acesso imediato e podem aprovar novos cadastros ou revogar o acesso de outras contas; outros usuários aguardam aprovação.
- A página de atendimento antirrábico não consulta nem transmite dados clínicos; a ficha preenchida é gerada localmente no navegador e não é salva pela aplicação.
- A consulta de CNS é somente para identificar profissionais na fonte pública do CNES; dados de pacientes não são pesquisados nem enviados a esse serviço.
- O uso de CNES e CNS deve seguir as regras de acesso e privacidade da instituição.

## Como executar

```bash
npm ci
npm run dev
```

A aplicação fica disponível em `http://localhost:3000`. O projeto requer uma versão do Node.js compatível com Next.js 16 (20.9 ou superior).

## Configuração de contas e modelos de prescrição

O login e o armazenamento por conta exigem um projeto Supabase configurado:

1. Aplique as migrations `supabase/migrations/20261028000000_account_prescription_templates.sql` e `supabase/migrations/20261104000000_revoke_app_user_approval.sql` no banco do projeto.
2. Crie `.env.local` na raiz com os valores do projeto Supabase:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sua_chave_publicavel
   ```

3. No Supabase Auth, mantenha o provedor Email habilitado com "Confirm email" ligado (não desligue: evita cadastro com e-mail de administrador alheio).
   - Configure um servidor SMTP próprio em **Authentication → SMTP Settings** para cadastro e recuperação de senha em produção. O serviço de e-mail padrão do Supabase limita o projeto a 2 e-mails por hora, compartilhados entre cadastro e recuperação; trocar de endereço não contorna esse limite. Consulte os [limites de autenticação do Supabase](https://supabase.com/docs/guides/auth/rate-limits).
   - Aplique também a migração `supabase/migrations/20261105000000_account_saved_entries.sql`: ela guarda, por conta, os prescritores (nome, CRM, cidade/estado, CNS ou CPF) e os estabelecimentos (CNES, nome, endereço) usados, que aparecem como listas de seleção rápida nos campos.
4. No Supabase Auth, configure a URL do site e inclua o callback na lista de redirecionamentos permitidos:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/reset-password`
   - A URL equivalente com o domínio de produção.

   Provedores OAuth habilitados também precisam ter o callback configurado no respectivo provedor.
5. Os endereços `ricardobarroso.med@gmail.com`, `ricardo-barroso@hotmail.com` e `rica_bol@hotmail.com` são aprovados automaticamente e podem aceitar cadastros pendentes na página inicial. Outros emails entram como pendentes até um desses administradores aprovar.

Na Vercel, configure `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` nas variáveis de ambiente do projeto e inclua o domínio de produção no site URL e nas URLs de callback permitidas do Supabase e dos provedores.

Não use a chave `service_role` no navegador nem a envie ao repositório. Os modelos ficam vinculados ao usuário por políticas RLS; não são armazenados dados de pacientes nesses modelos.

## Build

```bash
npm run build
```
