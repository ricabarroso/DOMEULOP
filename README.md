# Gerador de Documentos Médicos

Aplicação em Next.js para auxiliar a criação de receitas, atestados, pedidos de exames e APAC com foco em uso clínico seguro, organização e privacidade.

## Funcionalidades

- Geração de texto estruturado para receitas médicas
- Inclusão de vários medicamentos por receita, impressos no formato “medicamento/concentração — quantidade” com a posologia logo abaixo
- Data do documento preenchida com a data local atual; cidade/estado é informado manualmente
- Atestado médico com período de afastamento e observações
- Pedido de exames com descrição clínica e orientação de coleta
- APAC com justificativa, procedimentos e critérios de segurança
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

Em cada página, preencha e confira a pré-visualização. **Abrir PDF para visualizar / imprimir** gera o arquivo localmente no navegador e abre a visualização do PDF em outra aba, de onde é possível imprimir ou baixar.

## Consulta CNES

Ao informar os 7 dígitos do CNES, a aplicação consulta a API pública de Dados Abertos do Ministério da Saúde e mostra nome, endereço e CEP do estabelecimento, quando disponíveis.

Na página APAC, solicitante e executante são estabelecimentos independentes e têm campos e consultas CNES separados. A consulta de um não preenche nem altera os dados do outro. Escolher CNS como documento do profissional solicitante e informar 15 dígitos consulta a busca pública de profissionais do CNES (`/services/profissionais?cns=...`). Quando localizado, o nome do profissional é preenchido para conferência. A consulta é limitada ao CNS do profissional no cadastro público do CNES; o CNS do paciente permanece no formulário e no PDF, sem ser enviado para a API. A geração do PDF também acontece localmente no navegador.

## Regras de privacidade

- O formulário solicita apenas os dados indispensáveis para cada documento.
- Sugere-se evitar armazenamento em planilhas ou canais inseguros.
- Não há busca automática de CPF.
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
