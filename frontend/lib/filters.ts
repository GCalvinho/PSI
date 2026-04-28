export type FilterKey = "all" | "pme" | "small" | "medium";

export type FilterConfig = {
  key: FilterKey;
  label: string;
  description: string;
  codes: string[] | null; // null = sem filtro (todas as empresas)
};

export const FILTERS: FilterConfig[] = [
  {
    key: "all",
    label: "Todas as Empresas",
    description: "Inclui grandes, médias e pequenas empresas",
    codes: null,
  },
  {
    key: "pme",
    label: "PME",
    description: "Pequenas e médias empresas (todos os programas)",
    codes: ["SBA", "SBP", "8A", "HZC", "HZS", "WOSB", "EDWOSB", "VSB", "SDVOSBC", "SDVOSBS"],
  },
  {
    key: "small",
    label: "Pequenas Empresas",
    description: "Programas SBA, SBP e 8(a)",
    codes: ["SBA", "SBP", "8A"],
  },
  {
    key: "medium",
    label: "Médias Empresas",
    description: "HUBZone, Women-Owned, Veteranos",
    codes: ["HZC", "HZS", "WOSB", "EDWOSB", "VSB", "SDVOSBC", "SDVOSBS"],
  },
];

export const FILTER_MAP = Object.fromEntries(
  FILTERS.map((f) => [f.key, f])
) as Record<FilterKey, FilterConfig>;

/** Filtra contratos já carregados pelo set-aside type */
export function filterContracts(contracts: import("./types").Contract[], key: FilterKey) {
  const config = FILTER_MAP[key];
  if (!config.codes) return contracts; // "Todas" — sem filtro
  if (key === "pme") return contracts;  // PME já tem todos os tipos da static data
  const codeSet = new Set(config.codes);
  return contracts.filter((c) => codeSet.has(c["Type of Set Aside"]));
}
