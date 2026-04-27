"""
PSI Fetcher — corre a cada 8 horas via GitHub Actions (ou manualmente).
1. Vai buscar contratos atribuídos HOJE a PMEs >= $25M (USASpending.gov)
2. Para cada empresa, tenta descobrir se tem ticker em bolsa (NYSE/NASDAQ)
3. Verifica se é disponível na Revolut (proxy: listada em NYSE/NASDAQ/AMEX)
4. Guarda em:
   - data/contracts_YYYY-MM-DD_HH.json  (histórico)
   - data/latest.json                    (sempre o mais recente)
   - data/ticker_map.json               (mapa acumulado empresa→ticker)
   - frontend/public/data/latest.json   (servido pelo GitHub Pages)
   - frontend/public/data/ticker_map.json
"""

import requests
import json
import os
import time
import logging
from datetime import date, datetime

# ── Config ────────────────────────────────────────────────────────────────────
API_URL           = "https://api.usaspending.gov/api/v2/search/spending_by_award/"
YF_SEARCH_URL     = "https://query2.finance.yahoo.com/v1/finance/search"
ROOT_DIR          = os.path.dirname(os.path.abspath(__file__))
DATA_DIR          = os.path.join(ROOT_DIR, "data")
PUBLIC_DATA_DIR   = os.path.join(ROOT_DIR, "frontend", "public", "data")
MIN_AMOUNT        = 25_000_000
REVOLUT_EXCHANGES = {"NMS", "NYQ", "NGM", "PCX", "ASE", "AMEX", "NYSE", "NASDAQ"}

SMB_SET_ASIDE_CODES = [
    "SBA", "SBP", "8A", "HZC", "HZS",
    "WOSB", "EDWOSB", "VSB", "SDVOSBC", "SDVOSBS",
]

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(os.path.join(ROOT_DIR, "fetcher.log")),
        logging.StreamHandler(),
    ],
)
log = logging.getLogger(__name__)


# ── USASpending ────────────────────────────────────────────────────────────────
def fetch_today_contracts():
    today = str(date.today())
    log.info(f"A pesquisar contratos para {today} >= ${MIN_AMOUNT/1e6:.0f}M...")
    all_results, page = [], 1

    while True:
        payload = {
            "filters": {
                "award_type_codes": ["A", "B", "C", "D"],
                "set_aside_type_codes": SMB_SET_ASIDE_CODES,
                "award_amounts": [{"lower_bound": float(MIN_AMOUNT)}],
                "time_period": [{"start_date": today, "end_date": today}],
            },
            "fields": [
                "Award ID", "Recipient Name", "Award Amount", "Award Date",
                "Description", "Awarding Agency", "Awarding Sub Agency",
                "NAICS Code", "NAICS Description",
                "Place of Performance State Code",
                "Period of Performance Start Date",
                "Period of Performance Current End Date",
                "Type of Set Aside",
            ],
            "limit": 100,
            "page": page,
            "sort": "Award Amount",
            "order": "desc",
        }
        try:
            resp = requests.post(API_URL, json=payload, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            results = data.get("results", [])
            all_results.extend(results)
            log.info(f"  Página {page}: {len(results)} contratos")
            if not data.get("page_metadata", {}).get("hasNext", False):
                break
            page += 1
            time.sleep(0.5)
        except Exception as e:
            log.error(f"Erro na API USASpending (página {page}): {e}")
            break

    log.info(f"Total contratos encontrados: {len(all_results)}")
    return all_results


# ── Stock Lookup ───────────────────────────────────────────────────────────────
def search_ticker(company_name: str):
    clean_name = company_name
    for suffix in [
        ", INC.", " INC.", ", LLC", " LLC", ", LTD.", " LTD.", ", CORP.",
        " CORP.", ", CO.", " CO.", " L.P.", ", LP", " DBA ", " DBA,",
        " INC,", " INCORPORATED", " CORPORATION",
    ]:
        clean_name = clean_name.upper().replace(suffix, "").strip()
    clean_name = clean_name.title()

    headers = {"User-Agent": "Mozilla/5.0 (compatible; PSI-Fetcher/1.0)"}
    params  = {"q": clean_name, "quotesCount": 5, "newsCount": 0, "enableFuzzyQuery": False}

    try:
        resp = requests.get(YF_SEARCH_URL, params=params, headers=headers, timeout=10)
        resp.raise_for_status()
        quotes = resp.json().get("quotes", [])
    except Exception as e:
        log.warning(f"  Yahoo Finance falhou para '{company_name}': {e}")
        return None

    for q in quotes:
        if q.get("quoteType") == "EQUITY" and q.get("exchange", "") in REVOLUT_EXCHANGES:
            return {"ticker": q["symbol"], "exchange": q["exchange"],
                    "name": q.get("shortname") or q.get("longname", ""), "revolut": True}

    for q in quotes:
        if q.get("quoteType") == "EQUITY":
            ex = q.get("exchange", "")
            return {"ticker": q["symbol"], "exchange": ex,
                    "name": q.get("shortname") or q.get("longname", ""),
                    "revolut": ex in REVOLUT_EXCHANGES}
    return None


def load_ticker_map() -> dict:
    path = os.path.join(DATA_DIR, "ticker_map.json")
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_ticker_map(ticker_map: dict):
    os.makedirs(DATA_DIR, exist_ok=True)
    path = os.path.join(DATA_DIR, "ticker_map.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(ticker_map, f, ensure_ascii=False, indent=2)


def enrich_with_stock_info(contracts: list, ticker_map: dict) -> list:
    enriched = []
    for i, c in enumerate(contracts):
        recipient = c.get("Recipient Name", "")
        log.info(f"  [{i+1}/{len(contracts)}] Lookup: {recipient}")

        if recipient in ticker_map:
            stock = ticker_map[recipient]
        else:
            stock = search_ticker(recipient)
            ticker_map[recipient] = stock if stock else {
                "ticker": None, "exchange": None, "name": None, "revolut": False
            }
            time.sleep(0.3)

        c["stock"] = ticker_map[recipient]
        enriched.append(c)

    return enriched


# ── Save ───────────────────────────────────────────────────────────────────────
def write_json(path: str, data: dict):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def save_results(contracts: list):
    payload = {"fetched_at": datetime.now().isoformat(), "contracts": contracts}
    ts       = datetime.now().strftime("%Y-%m-%d_%H")

    # Histórico
    write_json(os.path.join(DATA_DIR, f"contracts_{ts}.json"), payload)
    # Latest (data/ — para uso local)
    write_json(os.path.join(DATA_DIR, "latest.json"), payload)
    # Latest (public/ — servido pelo GitHub Pages)
    write_json(os.path.join(PUBLIC_DATA_DIR, "latest.json"), payload)

    log.info(f"Guardado: data/latest.json + frontend/public/data/latest.json")


def save_ticker_map_public(ticker_map: dict):
    save_ticker_map(ticker_map)
    write_json(os.path.join(PUBLIC_DATA_DIR, "ticker_map.json"), ticker_map)
    log.info("Guardado: data/ticker_map.json + frontend/public/data/ticker_map.json")


# ── Main ───────────────────────────────────────────────────────────────────────
def run():
    log.info("=" * 60)
    log.info("PSI Fetcher iniciado")
    log.info("=" * 60)

    contracts  = fetch_today_contracts()
    ticker_map = load_ticker_map()

    if not contracts:
        log.info("Nenhum contrato encontrado para hoje.")
        save_results([])
        save_ticker_map_public(ticker_map)
        return

    log.info(f"A verificar tickers para {len(contracts)} empresas...")
    enriched = enrich_with_stock_info(contracts, ticker_map)

    on_revolut = [c for c in enriched if c["stock"]["revolut"]]
    log.info(f"Empresas na Revolut: {len(on_revolut)}/{len(enriched)}")

    save_results(enriched)
    save_ticker_map_public(ticker_map)
    log.info("Concluído.")


if __name__ == "__main__":
    run()
