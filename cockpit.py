import streamlit as st
import requests
import pandas as pd
import plotly.express as px
import json
import os
import glob
from datetime import datetime, date

st.set_page_config(
    page_title="PSI Cockpit — SMB Federal Contracts",
    page_icon="📊",
    layout="wide",
)

API_URL  = "https://api.usaspending.gov/api/v2/search/spending_by_award/"
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

SMB_SET_ASIDE_OPTIONS = {
    "Small Business (SBA/SBP)":              ["SBA", "SBP"],
    "8(a) Program":                          ["8A"],
    "HUBZone":                               ["HZC", "HZS"],
    "Women Owned Small Business":            ["WOSB", "EDWOSB"],
    "Veteran Small Business":                ["VSB"],
    "Service Disabled Veteran Owned":        ["SDVOSBC", "SDVOSBS"],
}
ALL_SET_ASIDE_CODES = [c for codes in SMB_SET_ASIDE_OPTIONS.values() for c in codes]


# ════════════════════════════════════════════════════════════════════════════════
# Helpers
# ════════════════════════════════════════════════════════════════════════════════
def fmt_usd(val):
    if val >= 1e9:
        return f"${val/1e9:.2f}B"
    return f"${val/1e6:.1f}M"


def load_latest_fetcher_data():
    """Carrega o ficheiro JSON mais recente gerado pelo fetcher."""
    files = sorted(glob.glob(os.path.join(DATA_DIR, "contracts_*.json")), reverse=True)
    if not files:
        return None, None
    with open(files[0], encoding="utf-8") as f:
        data = json.load(f)
    return data.get("contracts", []), data.get("fetched_at")


def fetch_contracts_api(set_aside_codes, min_amount, max_amount, start_date, end_date, page=1, limit=100):
    payload = {
        "filters": {
            "award_type_codes": ["A", "B", "C", "D"],
            "set_aside_type_codes": set_aside_codes,
            "award_amounts": [
                {
                    "lower_bound": float(min_amount),
                    **({"upper_bound": float(max_amount)} if max_amount else {}),
                }
            ],
            "time_period": [{"start_date": str(start_date), "end_date": str(end_date)}],
        },
        "fields": [
            "Award ID", "Recipient Name", "Award Amount", "Award Date",
            "Description", "Awarding Agency", "Awarding Sub Agency",
            "Place of Performance State Code", "NAICS Code", "NAICS Description",
            "Type of Set Aside",
            "Period of Performance Start Date", "Period of Performance Current End Date",
        ],
        "limit": limit,
        "page": page,
        "sort": "Award Amount",
        "order": "desc",
    }
    try:
        resp = requests.post(API_URL, json=payload, timeout=30)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        st.error(f"Erro na API: {e}")
        return None


def fetch_all_pages(set_aside_codes, min_amount, max_amount, start_date, end_date, max_records=500):
    all_results, page = [], 1
    with st.spinner("A carregar dados do USASpending.gov..."):
        while len(all_results) < max_records:
            data = fetch_contracts_api(set_aside_codes, min_amount, max_amount, start_date, end_date, page)
            if not data or not data.get("results"):
                break
            all_results.extend(data["results"])
            if not data.get("page_metadata", {}).get("hasNext", False):
                break
            page += 1
    return all_results


def render_kpis(df, amount_col="Award Amount"):
    k1, k2, k3, k4 = st.columns(4)
    k1.metric("Total Contratos", f"{len(df):,}")
    k2.metric("Valor Total", fmt_usd(df[amount_col].sum()))
    k3.metric("Valor Médio", fmt_usd(df[amount_col].mean()))
    k4.metric("Empresas Únicas", f"{df['Recipient Name'].nunique():,}")


def render_charts(df, amount_col="Award Amount"):
    c1, c2 = st.columns(2)

    with c1:
        st.subheader("Top 15 Empresas por Valor Total")
        top = (
            df.groupby("Recipient Name")[amount_col]
            .sum().sort_values(ascending=False).head(15).reset_index()
        )
        top["M$"] = top[amount_col] / 1e6
        fig = px.bar(top, x="M$", y="Recipient Name", orientation="h",
                     color="M$", color_continuous_scale="Blues",
                     labels={"Recipient Name": "", "M$": "Valor (M$)"})
        fig.update_layout(yaxis=dict(autorange="reversed"), coloraxis_showscale=False, height=420)
        st.plotly_chart(fig, use_container_width=True)

    with c2:
        st.subheader("Top 10 Agências")
        if "Awarding Agency" in df.columns:
            ag = (
                df.groupby("Awarding Agency")[amount_col]
                .sum().sort_values(ascending=False).head(10).reset_index()
            )
            ag["M$"] = ag[amount_col] / 1e6
            fig2 = px.pie(ag, names="Awarding Agency", values="M$", hole=0.4,
                          color_discrete_sequence=px.colors.sequential.Blues_r)
            fig2.update_layout(height=420)
            st.plotly_chart(fig2, use_container_width=True)


def render_table(df, amount_col="Award Amount", extra_cols=None):
    st.subheader("Contratos Detalhados")
    q = st.text_input("Filtrar por empresa ou descrição", "", key=f"search_{amount_col}")
    show = df.copy()
    if q:
        mask = (
            show["Recipient Name"].str.contains(q, case=False, na=False)
            | show.get("Description", pd.Series(dtype=str)).str.contains(q, case=False, na=False)
        )
        show = show[mask]

    base_cols = ["Recipient Name", amount_col, "Award Date", "Awarding Agency",
                 "Description", "NAICS Description", "Place of Performance State Code", "Award ID"]
    if extra_cols:
        base_cols = extra_cols + [c for c in base_cols if c not in extra_cols]
    cols = [c for c in base_cols if c in show.columns]

    out = show[cols].copy()
    out[amount_col] = out[amount_col].apply(lambda x: f"${x/1e6:.2f}M")
    st.dataframe(out, use_container_width=True, height=480)

    csv = show[cols].to_csv(index=False).encode("utf-8")
    st.download_button("Exportar CSV", csv,
                       file_name=f"psi_{date.today()}.csv", mime="text/csv")


# ════════════════════════════════════════════════════════════════════════════════
# Layout
# ════════════════════════════════════════════════════════════════════════════════
st.title("📊 PSI Cockpit — Contratos Federais a PMEs")
st.caption("Fonte: USASpending.gov  |  Contratos ≥ $25M atribuídos a Pequenas e Médias Empresas")

tab_today, tab_search = st.tabs(["🟢 Hoje & Revolut", "🔍 Pesquisa Histórica"])


# ── TAB 1 — HOJE & REVOLUT ────────────────────────────────────────────────────
with tab_today:
    contracts_raw, fetched_at = load_latest_fetcher_data()

    if not contracts_raw:
        st.info(
            "Ainda não há dados para hoje. O fetcher corre automaticamente a cada 8h.\n\n"
            "Podes também correr manualmente:\n```bash\npython3 fetcher.py\n```"
        )
    else:
        ts_fmt = datetime.fromisoformat(fetched_at).strftime("%d/%m/%Y às %H:%M") if fetched_at else "—"
        st.caption(f"Última atualização: **{ts_fmt}**")

        df_today = pd.DataFrame(contracts_raw)
        df_today["Award Amount"] = pd.to_numeric(df_today.get("Award Amount", 0), errors="coerce").fillna(0)
        df_today["Award Date"]   = pd.to_datetime(df_today.get("Award Date", pd.NaT), errors="coerce")

        # Extrai info de stock
        df_today["Ticker"]   = df_today["stock"].apply(lambda s: s.get("ticker") if isinstance(s, dict) else None)
        df_today["Exchange"] = df_today["stock"].apply(lambda s: s.get("exchange") if isinstance(s, dict) else None)
        df_today["Revolut"]  = df_today["stock"].apply(lambda s: s.get("revolut", False) if isinstance(s, dict) else False)

        # ── Sub-tabs ──
        sub1, sub2 = st.tabs(["Todos os contratos de hoje", "Disponíveis na Revolut"])

        with sub1:
            render_kpis(df_today)
            render_charts(df_today)
            render_table(df_today)

        with sub2:
            df_revolut = df_today[df_today["Revolut"] == True].copy()

            if df_revolut.empty:
                st.warning("Nenhuma empresa cotada na Revolut encontrada nos contratos de hoje.")
            else:
                r1, r2, r3 = st.columns(3)
                r1.metric("Empresas na Revolut", f"{df_revolut['Recipient Name'].nunique()}")
                r2.metric("Contratos", f"{len(df_revolut)}")
                r3.metric("Valor Total", fmt_usd(df_revolut["Award Amount"].sum()))

                st.divider()

                for _, row in df_revolut.sort_values("Award Amount", ascending=False).iterrows():
                    with st.container(border=True):
                        col_a, col_b, col_c = st.columns([3, 1, 1])
                        col_a.markdown(f"**{row['Recipient Name']}**")
                        col_b.markdown(f"🏷️ `{row['Ticker']}`  ({row['Exchange']})")
                        col_c.markdown(f"💰 **{fmt_usd(row['Award Amount'])}**")

                        detail_cols = st.columns([2, 2, 1])
                        detail_cols[0].caption(f"Agência: {row.get('Awarding Agency', '—')}")
                        detail_cols[1].caption(f"NAICS: {row.get('NAICS Description', '—')}")
                        detail_cols[2].caption(f"Data: {row['Award Date'].strftime('%Y-%m-%d') if pd.notna(row['Award Date']) else '—'}")

                        if row.get("Description"):
                            st.caption(f"Descrição: {str(row['Description'])[:300]}...")


# ── TAB 2 — PESQUISA HISTÓRICA ────────────────────────────────────────────────
with tab_search:
    with st.sidebar:
        st.title("Filtros")
        selected_types = st.multiselect(
            "Tipo de Set-Aside",
            options=list(SMB_SET_ASIDE_OPTIONS.keys()),
            default=list(SMB_SET_ASIDE_OPTIONS.keys()),
        )
        min_amount = st.number_input("Valor Mínimo ($)", min_value=0, value=25_000_000,
                                     step=1_000_000, format="%d")
        max_amount = st.number_input("Valor Máximo ($ — 0=sem limite)", min_value=0, value=0,
                                     step=1_000_000, format="%d")
        c1s, c2s = st.columns(2)
        start_date = c1s.date_input("Data Início", value=date(2024, 10, 1))
        end_date   = c2s.date_input("Data Fim", value=date.today())
        max_records = st.selectbox("Máx. registos", [100, 250, 500], index=0)
        search_btn = st.button("Pesquisar", type="primary", use_container_width=True)

    if not search_btn:
        st.info("Usa os filtros no painel lateral e clica em **Pesquisar**.")
    else:
        if not selected_types:
            st.warning("Seleciona pelo menos um tipo de set-aside.")
            st.stop()

        codes = [c for t in selected_types for c in SMB_SET_ASIDE_OPTIONS[t]]
        max_val  = max_amount if max_amount > 0 else None
        results  = fetch_all_pages(
            codes,
            min_amount, max_val, start_date, end_date, max_records,
        )
        if not results:
            st.warning("Nenhum resultado encontrado.")
        else:
            df = pd.DataFrame(results)
            df["Award Amount"] = pd.to_numeric(df.get("Award Amount", 0), errors="coerce").fillna(0)
            df["Award Date"]   = pd.to_datetime(df.get("Award Date", pd.NaT), errors="coerce")

            render_kpis(df)
            st.divider()
            render_charts(df)

            st.subheader("Evolução Temporal")
            tl = (
                df.dropna(subset=["Award Date"])
                .set_index("Award Date")
                .resample("ME")["Award Amount"].sum().reset_index()
            )
            tl["M$"] = tl["Award Amount"] / 1e6
            fig_tl = px.area(tl, x="Award Date", y="M$",
                             labels={"Award Date": "Mês", "M$": "Valor (M$)"},
                             color_discrete_sequence=["#1f77b4"])
            fig_tl.update_layout(height=300)
            st.plotly_chart(fig_tl, use_container_width=True)

            st.divider()
            render_table(df)
