"""
PSI Fetcher — corre a cada 8 horas.
1. Vai buscar contratos atribuídos HOJE a PMEs >= $25M (USASpending.gov)
2. Para cada empresa, tenta descobrir se tem ticker em bolsa (NYSE/NASDAQ)
3. Verifica se é uma ação disponível na Revolut (proxy: listada em NYSE/NASDAQ/AMEX)
4. Guarda resultados em data/contracts_YYYY-MM-DD_HH.json
"""

import requests
import json
import os
import time
import logging
from datetime import date, datetime

# ── Config ────────────────────────────────────────────────────────────────────
API_URL         = "https://api.usaspending.gov/api/v2/search/spending_by_award/"
YF_SEARCH_URL   = "https://query2.finance.yahoo.com/v1/finance/search"
DATA_DIR        = os.path.join(os.path.dirname(__file__), "data")
MIN_AMOUNT      = 25_000_000
REVOLUT_EXCHANGES = {"NMS", "NYQ", "NGM", "PCX", "ASE", "AMEX", "NYSE", "NASDAQ"}

# Códigos FPDS de set-aside para pequenas e médias empresas
SMB_SET_ASIDE_CODES = [
    "SBA",      # Small Business Act
    "SBP",      # Small Business Program
    "8A",       # 8(a) Program
    "HZC",      # HUBZone Competitive
    "HZS",      # HUBZone Sole Source
    "WOSB",     # Women Owned Small Business
    "EDWOSB",   # Economically Disadvantaged WOSB
    "VSB",      # Veteran Small Business
    "SDVOSBC",  # Service Disabled Veteran Owned (Competitive)
    "SDVOSBS",  # Service Disabled Veteran Owned (Sole Source)
]

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(os.path.join(os.path.dirname(__file__), "fetcher.log")),
        logging.StreamHandler(),
    ],
)
log = logging.getLogger(__name__)


# ── USASpending ────────────────────────────────────────────────────────────────
def fetch_today_contracts():
    today = str(date.today())
    log.info(f"A pesquisar contratos para {today} >= ${MIN_AMOUNT/1e6:.0f}M...")

    all_results = []
    page = 1

    while True:
        payload = {
            "filters": {
                "award_type_codes": ["A", "B", "C", "D"],
                "set_aside_type_codes": SMB_SET_ASIDE_CODES,
                "award_amounts": [{"lower_bound": float(MIN_AMOUNT)}],
                "time_period": [{"start_date": today, "end_date": today}],
            },
            "fields": [
                "Award ID",
                "Recipient Name",
                "Award Amount",
                "Award Date",
                "Description",
                "Awarding Agency",
                "Awarding Sub Agency",
                "NAICS Code",
                "NAICS Description",
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
    """
    Usa a Yahoo Finance search API para encontrar o ticker de uma empresa.
    Retorna dict com ticker, exchange, shortName, ou None se não encontrado.
    """
    # Remove sufixos legais comuns que atrapalham a pesquisa
    clean_name = company_name
    for suffix in [
        ", INC.", " INC.", ", LLC", " LLC", ", LTD.", " LTD.", ", CORP.",
        " CORP.", ", CO.", " CO.", " L.P.", ", LP", " DBA ", " DBA,",
        " INC,", " INCORPORATED", " CORPORATION",
    ]:
        clean_name = clean_name.upper().replace(suffix, "").strip()
    clean_name = clean_name.title()

    headers = {"User-Agent": "Mozilla/5.0 (compatible; PSI-Fetcher/1.0)"}
    params = {"q": clean_name, "quotesCount": 5, "newsCount": 0, "enableFuzzyQuery": False}

    try:
        resp = requests.get(YF_SEARCH_URL, params=params, headers=headers, timeout=10)
        resp.raise_for_status()
        quotes = resp.json().get("quotes", [])
    except Exception as e:
        log.warning(f"  Yahoo Finance search falhou para '{company_name}': {e}")
        return None

    for q in quotes:
        exchange = q.get("exchange", "")
        q_type   = q.get("quoteType", "")
        if q_type == "EQUITY" and exchange in REVOLUT_EXCHANGES:
            return {
                "ticker":    q.get("symbol"),
                "exchange":  exchange,
                "name":      q.get("shortname") or q.get("longname", ""),
                "revolut":   True,
            }

    # Segunda tentativa: qualquer EQUITY mesmo fora das exchanges Revolut
    for q in quotes:
        if q.get("quoteType") == "EQUITY":
            exchange = q.get("exchange", "")
            return {
                "ticker":    q.get("symbol"),
                "exchange":  exchange,
                "name":      q.get("shortname") or q.get("longname", ""),
                "revolut":   exchange in REVOLUT_EXCHANGES,
            }

    return None


def enrich_with_stock_info(contracts: list) -> list:
    """Enriquece cada contrato com informação de bolsa."""
    seen = {}  # cache por nome para não repetir chamadas
    enriched = []

    for i, c in enumerate(contracts):
        recipient = c.get("Recipient Name", "")
        log.info(f"  [{i+1}/{len(contracts)}] Lookup: {recipient}")

        if recipient in seen:
            stock = seen[recipient]
        else:
            stock = search_ticker(recipient)
            seen[recipient] = stock
            time.sleep(0.3)  # rate limit

        c["stock"] = stock if stock else {
            "ticker": None,
            "exchange": None,
            "name": None,
            "revolut": False,
        }
        enriched.append(c)

    return enriched


# ── Save ───────────────────────────────────────────────────────────────────────
def save_results(contracts: list):
    os.makedirs(DATA_DIR, exist_ok=True)
    ts = datetime.now().strftime("%Y-%m-%d_%H")
    filename = os.path.join(DATA_DIR, f"contracts_{ts}.json")
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(
            {"fetched_at": datetime.now().isoformat(), "contracts": contracts},
            f,
            ensure_ascii=False,
            indent=2,
        )
    log.info(f"Resultados guardados em: {filename}")
    return filename


# ── Main ───────────────────────────────────────────────────────────────────────
def run():
    log.info("=" * 60)
    log.info("PSI Fetcher iniciado")
    log.info("=" * 60)

    contracts = fetch_today_contracts()

    if not contracts:
        log.info("Nenhum contrato encontrado para hoje.")
        save_results([])
        return

    log.info(f"A verificar tickers para {len(contracts)} empresas...")
    enriched = enrich_with_stock_info(contracts)

    on_revolut = [c for c in enriched if c["stock"]["revolut"]]
    log.info(f"Empresas disponíveis na Revolut: {len(on_revolut)}/{len(enriched)}")

    filename = save_results(enriched)
    log.info("Concluído.")
    return filename


if __name__ == "__main__":
    run()
