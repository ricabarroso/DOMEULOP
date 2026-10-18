export type AntirabicoOption = {
  value: string;
  label: string;
};

type TextField = {
  key: string;
  label: string;
  type: "text" | "date" | "textarea";
  maxLength?: number;
};

type SelectField = {
  key: string;
  label: string;
  type: "select";
  options: readonly AntirabicoOption[];
};

type CheckboxField = {
  key: string;
  label: string;
  type: "checkboxes";
  options: readonly AntirabicoOption[];
};

export type AntirabicoField = TextField | SelectField | CheckboxField;

export type AntirabicoValue = string | string[];
export type AntirabicoValues = Record<string, AntirabicoValue>;

export type AntirabicoSection = {
  title: string;
  fields: readonly AntirabicoField[];
};

const ageUnits: readonly AntirabicoOption[] = [
  { value: "1", label: "1 — Hora" },
  { value: "2", label: "2 — Dia" },
  { value: "3", label: "3 — Mês" },
  { value: "4", label: "4 — Ano" },
];

const yesNoUnknown: readonly AntirabicoOption[] = [
  { value: "1", label: "1 — Sim" },
  { value: "2", label: "2 — Não" },
  { value: "9", label: "9 — Ignorado" },
];

const sexOptions: readonly AntirabicoOption[] = [
  { value: "M", label: "M — Masculino" },
  { value: "F", label: "F — Feminino" },
  { value: "I", label: "I — Ignorado" },
];

const animalSpecies: readonly AntirabicoOption[] = [
  { value: "1", label: "1 — Canina" },
  { value: "2", label: "2 — Felina" },
  { value: "3", label: "3 — Quiróptera (Morcego)" },
  { value: "4", label: "4 — Primata (Macaco)" },
  { value: "5", label: "5 — Raposa" },
  { value: "6", label: "6 — Herbívoro doméstico" },
  { value: "7", label: "7 — Outra" },
];

const vaccineProducers: readonly AntirabicoOption[] = [
  { value: "1", label: "1 — Instituto Butantan" },
  { value: "2", label: "2 — Instituto Vital Brasil" },
  { value: "3", label: "3 — Aventis Pasteur" },
  { value: "4", label: "4 — Outro (especificar)" },
];

export const antirabicoSections: readonly AntirabicoSection[] = [
  {
    title: "Notificação e identificação",
    fields: [
      { key: "notificationNumber", label: "Nº da notificação", type: "text", maxLength: 20 },
      { key: "notificationDate", label: "3. Data da Notificação", type: "date" },
      { key: "notificationState", label: "4. UF", type: "text", maxLength: 2 },
      { key: "notificationCity", label: "5. Município de Notificação", type: "text", maxLength: 70 },
      { key: "notificationIbge", label: "5. Código (IBGE)", type: "text", maxLength: 7 },
      { key: "notificationUnit", label: "6. Unidade de Saúde (ou outra fonte notificadora)", type: "text", maxLength: 80 },
      { key: "notificationCnes", label: "6. Código da unidade de saúde", type: "text", maxLength: 7 },
      { key: "attendanceDate", label: "7. Data do Atendimento", type: "date" },
      { key: "patientName", label: "8. Nome do Paciente", type: "text", maxLength: 100 },
      { key: "birthDate", label: "9. Data de Nascimento", type: "date" },
      { key: "age", label: "10. (ou) Idade", type: "text", maxLength: 3 },
      { key: "ageUnit", label: "10. Unidade da idade", type: "select", options: ageUnits },
      { key: "sex", label: "11. Sexo", type: "select", options: sexOptions },
      {
        key: "pregnancy",
        label: "12. Gestante",
        type: "select",
        options: [
          { value: "1", label: "1 — 1º trimestre" },
          { value: "2", label: "2 — 2º trimestre" },
          { value: "3", label: "3 — 3º trimestre" },
          { value: "4", label: "4 — Idade gestacional ignorada" },
          { value: "5", label: "5 — Não" },
          { value: "6", label: "6 — Não se aplica" },
          { value: "9", label: "9 — Ignorado" },
        ],
      },
      {
        key: "race",
        label: "13. Raça/Cor",
        type: "select",
        options: [
          { value: "1", label: "1 — Branca" },
          { value: "2", label: "2 — Preta" },
          { value: "3", label: "3 — Amarela" },
          { value: "4", label: "4 — Parda" },
          { value: "5", label: "5 — Indígena" },
          { value: "9", label: "9 — Ignorado" },
        ],
      },
      {
        key: "education",
        label: "14. Escolaridade",
        type: "select",
        options: [
          { value: "0", label: "0 — Analfabeto" },
          { value: "1", label: "1 — 1ª a 4ª série incompleta do EF" },
          { value: "2", label: "2 — 4ª série completa do EF" },
          { value: "3", label: "3 — 5ª a 8ª série incompleta do EF" },
          { value: "4", label: "4 — Ensino fundamental completo" },
          { value: "5", label: "5 — Ensino médio incompleto" },
          { value: "6", label: "6 — Ensino médio completo" },
          { value: "7", label: "7 — Educação superior incompleta" },
          { value: "8", label: "8 — Educação superior completa" },
          { value: "9", label: "9 — Ignorado" },
          { value: "10", label: "10 — Não se aplica" },
        ],
      },
      { key: "patientCns", label: "15. Número do Cartão SUS", type: "text", maxLength: 15 },
      { key: "motherName", label: "16. Nome da mãe", type: "text", maxLength: 100 },
    ],
  },
  {
    title: "Dados de residência",
    fields: [
      { key: "residenceState", label: "17. UF", type: "text", maxLength: 2 },
      { key: "residenceCity", label: "18. Município de Residência", type: "text", maxLength: 70 },
      { key: "residenceIbge", label: "18. Código (IBGE)", type: "text", maxLength: 7 },
      { key: "district", label: "19. Distrito", type: "text", maxLength: 70 },
      { key: "neighborhood", label: "20. Bairro", type: "text", maxLength: 70 },
      { key: "street", label: "21. Logradouro (rua, avenida,...)", type: "text", maxLength: 100 },
      { key: "streetCode", label: "21. Código", type: "text", maxLength: 10 },
      { key: "streetNumber", label: "22. Número", type: "text", maxLength: 20 },
      { key: "complement", label: "23. Complemento (apto., casa,...)", type: "text", maxLength: 70 },
      { key: "geo1", label: "24. Geo campo 1", type: "text", maxLength: 20 },
      { key: "geo2", label: "25. Geo campo 2", type: "text", maxLength: 20 },
      { key: "reference", label: "26. Ponto de Referência", type: "text", maxLength: 100 },
      { key: "cep", label: "27. CEP", type: "text", maxLength: 8 },
      { key: "phone", label: "28. (DDD) Telefone", type: "text", maxLength: 15 },
      {
        key: "zone",
        label: "29. Zona",
        type: "select",
        options: [
          { value: "1", label: "1 — Urbana" },
          { value: "2", label: "2 — Rural" },
          { value: "3", label: "3 — Periurbana" },
          { value: "9", label: "9 — Ignorado" },
        ],
      },
      { key: "country", label: "30. País (se residente fora do Brasil)", type: "text", maxLength: 70 },
      { key: "occupation", label: "31. Ocupação", type: "text", maxLength: 100 },
    ],
  },
  {
    title: "Antecedentes epidemiológicos",
    fields: [
      { key: "exposureStatus", label: "32. Tipo de Exposição ao Vírus Rábico", type: "select", options: yesNoUnknown },
      {
        key: "exposureTypes",
        label: "32. Tipo de exposição",
        type: "checkboxes",
        options: [
          { value: "indirect", label: "Contato indireto" },
          { value: "scratch", label: "Arranhadura" },
          { value: "lick", label: "Lambedura" },
          { value: "bite", label: "Mordedura" },
          { value: "other", label: "Outro" },
        ],
      },
      {
        key: "locationStatus",
        label: "33. Localização",
        type: "select",
        options: [
          { value: "1", label: "1 — Sim" },
          { value: "2", label: "2 — Não" },
          { value: "3", label: "3 — Desconhecida" },
        ],
      },
      {
        key: "locations",
        label: "33. Localização do ferimento",
        type: "checkboxes",
        options: [
          { value: "mucosa", label: "Mucosa" },
          { value: "head-neck", label: "Cabeça/Pescoço" },
          { value: "hands-feet", label: "Mãos/Pés" },
          { value: "trunk", label: "Tronco" },
          { value: "upper-limbs", label: "Membros Superiores" },
          { value: "lower-limbs", label: "Membros Inferiores" },
        ],
      },
      {
        key: "injuryType",
        label: "34. Ferimento",
        type: "select",
        options: [
          { value: "1", label: "1 — Único" },
          { value: "2", label: "2 — Múltiplo" },
          { value: "3", label: "3 — Sem ferimento" },
          { value: "9", label: "9 — Ignorado" },
        ],
      },
      { key: "injuryStatus", label: "35. Tipo de Ferimento", type: "select", options: yesNoUnknown },
      {
        key: "injuryTypes",
        label: "35. Tipo de ferimento",
        type: "checkboxes",
        options: [
          { value: "deep", label: "Profundo" },
          { value: "superficial", label: "Superficial" },
          { value: "lacerating", label: "Dilacerante" },
        ],
      },
      { key: "exposureDate", label: "36. Data da Exposição", type: "date" },
      { key: "previousTreatment", label: "37. Tem Antecedentes de Tratamento Anti-Rábico?", type: "select", options: yesNoUnknown },
      {
        key: "previousTreatmentTypes",
        label: "37. Tipo de tratamento anterior",
        type: "checkboxes",
        options: [
          { value: "pre-exposure", label: "Pré-Exposição" },
          { value: "post-exposure", label: "Pós-Exposição" },
        ],
      },
      {
        key: "previousTreatmentCompleted",
        label: "38. Se houve, quando foi concluído?",
        type: "select",
        options: [
          { value: "1", label: "1 — Até 90 dias" },
          { value: "2", label: "2 — Após 90 dias" },
        ],
      },
      { key: "dosesApplied", label: "39. Nº de Doses Aplicadas", type: "text", maxLength: 2 },
      { key: "animalSpecies", label: "40. Espécie do Animal Agressor", type: "select", options: animalSpecies },
      { key: "otherSpecies", label: "40. Outra espécie (especificar)", type: "text", maxLength: 60 },
      {
        key: "animalCondition",
        label: "41. Condição do Animal para Fins de Conduta do Tratamento",
        type: "select",
        options: [
          { value: "1", label: "1 — Sadio" },
          { value: "2", label: "2 — Suspeito" },
          { value: "3", label: "3 — Raivoso" },
          { value: "4", label: "4 — Morto/Desaparecido" },
        ],
      },
      {
        key: "animalObservable",
        label: "42. Animal Passível de Observação? (Somente para Cão ou Gato)",
        type: "select",
        options: [
          { value: "1", label: "1 — Sim" },
          { value: "2", label: "2 — Não" },
        ],
      },
      {
        key: "recommendedTreatment",
        label: "43. Tratamento Indicado",
        type: "select",
        options: [
          { value: "1", label: "1 — Pré Exposição" },
          { value: "2", label: "2 — Dispensa de Tratamento" },
          { value: "3", label: "3 — Observação do animal (se cão ou gato)" },
          { value: "4", label: "4 — Observação + Vacina" },
          { value: "5", label: "5 — Vacina" },
          { value: "6", label: "6 — Soro + Vacina" },
          { value: "7", label: "7 — Esquema de Reexposição" },
        ],
      },
      { key: "vaccineProducer", label: "44. Laboratório Produtor da Vacina", type: "select", options: vaccineProducers },
      { key: "otherVaccineProducer", label: "44. Outro laboratório (especificar)", type: "text", maxLength: 60 },
      { key: "vaccineLot", label: "45. Número do Lote", type: "text", maxLength: 30 },
      { key: "vaccineExpiry", label: "46. Data do Vencimento", type: "date" },
    ],
  },
  {
    title: "Tratamento atual e encerramento",
    fields: [
      { key: "doseDate1", label: "47. Data da 1ª dose", type: "date" },
      { key: "doseDate2", label: "47. Data da 2ª dose", type: "date" },
      { key: "doseDate3", label: "47. Data da 3ª dose", type: "date" },
      { key: "doseDate4", label: "47. Data da 4ª dose", type: "date" },
      { key: "doseDate5", label: "47. Data da 5ª dose", type: "date" },
      {
        key: "animalFinalCondition",
        label: "48. Condição Final do Animal (após período de observação)",
        type: "select",
        options: [
          { value: "1", label: "1 — Negativo para Raiva (Clínica)" },
          { value: "2", label: "2 — Negativo para Raiva (Laboratório)" },
          { value: "3", label: "3 — Positivo para Raiva (Clínica)" },
          { value: "4", label: "4 — Positivo para Raiva (Laboratório)" },
          { value: "5", label: "5 — Morto/Sacrificado/Sem Diagnóstico" },
          { value: "9", label: "9 — Ignorado" },
        ],
      },
      { key: "treatmentInterrupted", label: "49. Houve Interrupção do Tratamento?", type: "select", options: [
        { value: "1", label: "1 — Sim" },
        { value: "2", label: "2 — Não" },
      ] },
      {
        key: "interruptionReason",
        label: "50. Qual o Motivo da Interrupção",
        type: "select",
        options: [
          { value: "1", label: "1 — Indicação da Unidade de Saúde" },
          { value: "2", label: "2 — Abandono" },
          { value: "3", label: "3 — Transferência" },
        ],
      },
      {
        key: "unitContactedPatient",
        label: "51. Se houve abandono do tratamento, a Unidade de Saúde Procurou o Paciente?",
        type: "select",
        options: [
          { value: "1", label: "1 — Sim" },
          { value: "2", label: "2 — Não" },
        ],
      },
      { key: "adverseVaccine", label: "52. Evento Adverso à Vacina", type: "select", options: yesNoUnknown },
      { key: "serumIndication", label: "53. Indicação do Soro Anti-Rábico", type: "select", options: yesNoUnknown },
      { key: "patientWeight", label: "54. Peso do Paciente (Kg.)", type: "text", maxLength: 6 },
      { key: "serumAmount", label: "55. Quantidade de Soro Aplicada (ml)", type: "text", maxLength: 8 },
      {
        key: "serumType",
        label: "55. Tipo de soro",
        type: "select",
        options: [
          { value: "1", label: "1 — Heterólogo" },
          { value: "2", label: "2 — Homólogo" },
        ],
      },
      { key: "serumInfiltration", label: "56. Infiltração de Soro no(s) Local(is) do(s) Ferimento(s)", type: "select", options: [
        { value: "1", label: "1 — Sim" },
        { value: "2", label: "2 — Não" },
      ] },
      {
        key: "infiltrationExtent",
        label: "56. Infiltração",
        type: "checkboxes",
        options: [
          { value: "total", label: "Total" },
          { value: "partial", label: "Parcial" },
        ],
      },
      { key: "serumProducer", label: "57. Laboratório Produtor do Soro Anti-Rábico", type: "select", options: vaccineProducers },
      { key: "otherSerumProducer", label: "57. Outro laboratório (especificar)", type: "text", maxLength: 60 },
      { key: "serumBatch", label: "58. Número da Partida", type: "text", maxLength: 30 },
      { key: "adverseSerum", label: "59. Evento Adverso ao Soro Anti-Rábico", type: "select", options: yesNoUnknown },
      { key: "caseClosureDate", label: "60. Data do Encerramento do Caso", type: "date" },
    ],
  },
  {
    title: "Observações e investigador",
    fields: [
      { key: "observations", label: "Observações", type: "textarea", maxLength: 1600 },
      { key: "investigatorUnit", label: "Município/Unidade de Saúde", type: "text", maxLength: 100 },
      { key: "investigatorUnitCode", label: "Cód. da Unid. de Saúde", type: "text", maxLength: 10 },
      { key: "investigatorName", label: "Nome", type: "text", maxLength: 100 },
      { key: "investigatorRole", label: "Função", type: "text", maxLength: 60 },
      { key: "investigatorSignature", label: "Assinatura", type: "text", maxLength: 100 },
    ],
  },
];

export const initialAntirabicoValues: AntirabicoValues = Object.fromEntries(
  antirabicoSections.flatMap((section) =>
    section.fields.map((field) => [field.key, field.type === "checkboxes" ? [] : ""]),
  ),
);
