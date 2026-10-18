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
- Geração de PDF no navegador com abertura da visualização em nova aba
- Aviso explícito sobre privacidade e necessidade de consentimento
- Visualização em tempo real do documento pronto para copiar e usar

## Páginas de documentos

- `/receita` — receita médica
- `/atestado` — atestado médico
- `/pedido-exames` — pedido de exames
- `/apac` — APAC
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
- A página de atendimento antirrábico não consulta nem transmite dados clínicos; a ficha preenchida é gerada localmente no navegador e não é salva pela aplicação.
- A consulta de CNS é somente para identificar profissionais na fonte pública do CNES; dados de pacientes não são pesquisados nem enviados a esse serviço.
- O uso de CNES e CNS deve seguir as regras de acesso e privacidade da instituição.

## Como executar

```bash
npm install
npm run dev
```

A aplicação fica disponível em `http://localhost:3000`.

## Build

```bash
npm run build
```
