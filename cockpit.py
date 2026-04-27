import streamlit as st
import requests
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, date

st.set_page_config(
    page_title="PSI Cockpit — SMB Federal Contracts",
    page_icon="📊",
    layout="wide",
)

API_URL = "https://api.usaspending.gov/api/v2/search/spending_by_award/"

BUSINESS_TYPES = {
    "Small Business": "Small Business",
    "8(a) Program Participant": "8(a) Program Participant",
    "HUBZone Firm": "HUBZone Firm",
    "Small Disadvantaged Business": "Small Disadvantaged Business",
    "Women Owned Small Business": "Women Owned Small Business",
    "Minority Owned Business": "Minority Owned Business",
    "Veteran Owned Business": "Veteran-Owned Business",
    "Service-Disabled Veteran Owned": "Service-Disabled Veteran-Owned Business",
}


def fetch_contracts(business_types, min_amount, max_amount, start_date, end_date, page=1, limit=100):
    payload = {
        "filters": {
            "award_type_codes": ["A", "B", "C", "D"],
            "recipient_type_names": business_types,
            "award_amounts": [
                {
                    "lower_bound": float(min_amount),
                    **({"upper_bound": float(max_amount)} if max_amount else {}),
                }
            ],
            "time_period": [
                {
                    "start_date": str(start_date),
                    "end_date": str(end_date),
                }
            ],
        },
        "fields": [
            "Award ID",
            "Recipient Name",
            "Award Amount",
            "Award Date",
            "Description",
            "Awarding Agency",
            "Awarding Sub Agency",
            "Place of Performance State Code",
            "Place of Performance Country Code",
            "NAICS Code",
            "NAICS Description",
            "Period of Performance Start Date",
            "Period of Performance Current End Date",
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
    except requests.exceptions.RequestException as e:
        st.error(f"API error: {e}")
        return None


def fetch_all_pages(business_types, min_amount, max_amount, start_date, end_date, max_records=500):
    all_results = []
    page = 1
    limit = 100

    with st.spinner("A carregar dados do USASpending.gov..."):
        while len(all_results) < max_records:
            data = fetch_contracts(business_types, min_amount, max_amount, start_date, end_date, page, limit)
            if not data or not data.get("results"):
                break
            all_results.extend(data["results"])
            if not data.get("page_metadata", {}).get("hasNext", False):
                break
            page += 1

    return all_results


# ── Sidebar ──────────────────────────────────────────────────────────────────
st.sidebar.image("https://www.usaspending.gov/img/logo@2x.png", width=200)
st.sidebar.title("Filtros")

selected_types = st.sidebar.multiselect(
    "Tipo de Empresa",
    options=list(BUSINESS_TYPES.keys()),
    default=["Small Business", "Small Disadvantaged Business"],
)

min_amount = st.sidebar.number_input(
    "Valor Mínimo do Contrato ($)",
    min_value=0,
    value=25_000_000,
    step=1_000_000,
    format="%d",
)

max_amount = st.sidebar.number_input(
    "Valor Máximo do Contrato ($ — 0 = sem limite)",
    min_value=0,
    value=0,
    step=1_000_000,
    format="%d",
)

col1, col2 = st.sidebar.columns(2)
start_date = col1.date_input("Data Início", value=date(2023, 10, 1))
end_date = col2.date_input("Data Fim", value=date.today())

max_records = st.sidebar.selectbox("Máx. registos", [100, 250, 500], index=0)

search = st.sidebar.button("Pesquisar", type="primary", use_container_width=True)

# ── Header ────────────────────────────────────────────────────────────────────
st.title("📊 PSI Cockpit — Contratos Federais a PMEs")
st.caption("Fonte: USASpending.gov | Contratos ≥ $25M atribuídos a Pequenas e Médias Empresas")

if not search:
    st.info("Seleciona os filtros no painel lateral e clica em **Pesquisar** para carregar os dados.")
    st.stop()

if not selected_types:
    st.warning("Seleciona pelo menos um tipo de empresa.")
    st.stop()

max_val = max_amount if max_amount > 0 else None
results = fetch_all_pages(
    [BUSINESS_TYPES[t] for t in selected_types],
    min_amount,
    max_val,
    start_date,
    end_date,
    max_records,
)

if not results:
    st.warning("Nenhum resultado encontrado para os filtros selecionados.")
    st.stop()

df = pd.DataFrame(results)

# Normalise columns
df["Award Amount"] = pd.to_numeric(df.get("Award Amount", 0), errors="coerce").fillna(0)
df["Award Date"] = pd.to_datetime(df.get("Award Date", pd.NaT), errors="coerce")
df["Award Date Display"] = df["Award Date"].dt.strftime("%Y-%m-%d")

# ── KPIs ──────────────────────────────────────────────────────────────────────
k1, k2, k3, k4 = st.columns(4)
k1.metric("Total de Contratos", f"{len(df):,}")
k2.metric("Valor Total Atribuído", f"${df['Award Amount'].sum() / 1e9:.2f}B")
k3.metric("Valor Médio por Contrato", f"${df['Award Amount'].mean() / 1e6:.1f}M")
k4.metric("Empresas Únicas", f"{df['Recipient Name'].nunique():,}")

st.divider()

# ── Charts ────────────────────────────────────────────────────────────────────
c1, c2 = st.columns(2)

with c1:
    st.subheader("Top 15 Empresas por Valor Total")
    top_companies = (
        df.groupby("Recipient Name")["Award Amount"]
        .sum()
        .sort_values(ascending=False)
        .head(15)
        .reset_index()
    )
    top_companies["Award Amount (M$)"] = top_companies["Award Amount"] / 1e6
    fig = px.bar(
        top_companies,
        x="Award Amount (M$)",
        y="Recipient Name",
        orientation="h",
        color="Award Amount (M$)",
        color_continuous_scale="Blues",
        labels={"Recipient Name": "", "Award Amount (M$)": "Valor (M$)"},
    )
    fig.update_layout(yaxis=dict(autorange="reversed"), coloraxis_showscale=False, height=420)
    st.plotly_chart(fig, use_container_width=True)

with c2:
    st.subheader("Top 10 Agências por Valor Atribuído")
    if "Awarding Agency" in df.columns:
        top_agencies = (
            df.groupby("Awarding Agency")["Award Amount"]
            .sum()
            .sort_values(ascending=False)
            .head(10)
            .reset_index()
        )
        top_agencies["Award Amount (M$)"] = top_agencies["Award Amount"] / 1e6
        fig2 = px.pie(
            top_agencies,
            names="Awarding Agency",
            values="Award Amount (M$)",
            hole=0.4,
            color_discrete_sequence=px.colors.sequential.Blues_r,
        )
        fig2.update_layout(height=420)
        st.plotly_chart(fig2, use_container_width=True)

# Timeline
st.subheader("Evolução Temporal dos Contratos")
timeline = (
    df.dropna(subset=["Award Date"])
    .set_index("Award Date")
    .resample("ME")["Award Amount"]
    .sum()
    .reset_index()
)
timeline["Award Amount (M$)"] = timeline["Award Amount"] / 1e6
fig3 = px.area(
    timeline,
    x="Award Date",
    y="Award Amount (M$)",
    labels={"Award Date": "Mês", "Award Amount (M$)": "Valor (M$)"},
    color_discrete_sequence=["#1f77b4"],
)
fig3.update_layout(height=300)
st.plotly_chart(fig3, use_container_width=True)

st.divider()

# ── Table ─────────────────────────────────────────────────────────────────────
st.subheader("Contratos Detalhados")

search_text = st.text_input("Filtrar por empresa ou descrição", "")
display_df = df.copy()
if search_text:
    mask = (
        display_df["Recipient Name"].str.contains(search_text, case=False, na=False)
        | display_df.get("Description", pd.Series(dtype=str)).str.contains(search_text, case=False, na=False)
    )
    display_df = display_df[mask]

cols_to_show = [c for c in [
    "Recipient Name", "Award Amount", "Award Date Display",
    "Awarding Agency", "Awarding Sub Agency",
    "Description", "NAICS Description",
    "Place of Performance State Code", "Award ID",
] if c in display_df.columns]

display_df_show = display_df[cols_to_show].copy()
display_df_show["Award Amount"] = display_df_show["Award Amount"].apply(
    lambda x: f"${x/1e6:.2f}M"
)

st.dataframe(display_df_show, use_container_width=True, height=500)

# ── Export ────────────────────────────────────────────────────────────────────
csv = display_df[cols_to_show].to_csv(index=False).encode("utf-8")
st.download_button(
    "Exportar CSV",
    data=csv,
    file_name=f"psi_contratos_{date.today()}.csv",
    mime="text/csv",
)
