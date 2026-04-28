import { Contract, FetcherData } from "./types";

const API_URL = "https://api.usaspending.gov/api/v2/search/spending_by_award/";

const SMB_SET_ASIDE_CODES = [
  "SBA", "SBP", "8A", "HZC", "HZS",
  "WOSB", "EDWOSB", "VSB", "SDVOSBC", "SDVOSBS",
];

const FIELDS = [
  "Award ID", "Recipient Name", "Award Amount", "Award Date",
  "Description", "Awarding Agency", "Awarding Sub Agency",
  "NAICS Code", "NAICS Description",
  "Place of Performance State Code",
  "Type of Set Aside",
];

export async function fetchTodayContracts(
  minAmount = 25_000_000,
  setAsideCodes: string[] | null = SMB_SET_ASIDE_CODES
): Promise<Contract[]> {
  const today = new Date().toISOString().split("T")[0];
  const all: Contract[] = [];
  let page = 1;

  while (true) {
    const filters: Record<string, unknown> = {
      award_type_codes: ["A", "B", "C", "D"],
      award_amounts: [{ lower_bound: minAmount }],
      time_period: [{ start_date: today, end_date: today }],
    };
    if (setAsideCodes) filters.set_aside_type_codes = setAsideCodes;

    const payload = { filters,
      fields: FIELDS,
      limit: 100,
      page,
      sort: "Award Amount",
      order: "desc",
    };

    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(`USASpending API error: ${res.status}`);

    const data = await res.json();
    const results: Contract[] = (data.results ?? []).map((c: Contract) => ({
      ...c,
      stock: { ticker: null, exchange: null, name: null, revolut: false },
    }));

    all.push(...results);
    if (!data.page_metadata?.hasNext) break;
    page++;
  }

  return all;
}

export async function loadStaticData(basePath = ""): Promise<FetcherData> {
  const res = await fetch(`${basePath}/data/latest.json`, { cache: "no-store" });
  if (!res.ok) return { fetched_at: null, contracts: [] };
  return res.json();
}

export async function loadTickerMap(basePath = ""): Promise<Record<string, { ticker: string | null; exchange: string | null; name: string | null; revolut: boolean }>> {
  try {
    const res = await fetch(`${basePath}/data/ticker_map.json`, { cache: "no-store" });
    if (!res.ok) return {};
    return res.json();
  } catch {
    return {};
  }
}

export function applyTickerMap(
  contracts: Contract[],
  tickerMap: Record<string, { ticker: string | null; exchange: string | null; name: string | null; revolut: boolean }>
): Contract[] {
  return contracts.map((c) => {
    const name = c["Recipient Name"];
    // Exact match first
    if (tickerMap[name]) return { ...c, stock: tickerMap[name] };
    // Case-insensitive match
    const key = Object.keys(tickerMap).find(
      (k) => k.toLowerCase() === name.toLowerCase()
    );
    if (key) return { ...c, stock: tickerMap[key] };
    return c;
  });
}
