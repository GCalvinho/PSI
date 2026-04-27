export type StockInfo = {
  ticker: string | null;
  exchange: string | null;
  name: string | null;
  revolut: boolean;
};

export type Contract = {
  "Award ID": string;
  "Recipient Name": string;
  "Award Amount": number;
  "Award Date": string;
  "Description": string;
  "Awarding Agency": string;
  "Awarding Sub Agency": string;
  "NAICS Code": string;
  "NAICS Description": string;
  "Place of Performance State Code": string;
  "Type of Set Aside": string;
  stock: StockInfo;
};

export type FetcherData = {
  fetched_at: string;
  contracts: Contract[];
};

export const MOCK_DATA: FetcherData = {
  fetched_at: new Date().toISOString(),
  contracts: [
    {
      "Award ID": "W52P1J24C0031",
      "Recipient Name": "LEIDOS INC.",
      "Award Amount": 487200000,
      "Award Date": new Date().toISOString().split("T")[0],
      "Description": "IT ENTERPRISE SERVICES AND SOLUTIONS FOR ARMY SYSTEMS",
      "Awarding Agency": "Department of Defense",
      "Awarding Sub Agency": "Dept. of the Army",
      "NAICS Code": "541512",
      "NAICS Description": "Computer Systems Design Services",
      "Place of Performance State Code": "VA",
      "Type of Set Aside": "SBA",
      stock: { ticker: "LDOS", exchange: "NYQ", name: "Leidos Holdings, Inc.", revolut: true },
    },
    {
      "Award ID": "FA8621-24-C-6027",
      "Recipient Name": "BOOZ ALLEN HAMILTON INC.",
      "Award Amount": 312500000,
      "Award Date": new Date().toISOString().split("T")[0],
      "Description": "CYBERSECURITY AND DATA ANALYTICS SUPPORT FOR AIR FORCE SYSTEMS COMMAND",
      "Awarding Agency": "Department of Defense",
      "Awarding Sub Agency": "Dept. of the Air Force",
      "NAICS Code": "541519",
      "NAICS Description": "Other Computer Related Services",
      "Place of Performance State Code": "MD",
      "Type of Set Aside": "SBA",
      stock: { ticker: "BAH", exchange: "NYQ", name: "Booz Allen Hamilton Holding Corp", revolut: true },
    },
    {
      "Award ID": "HHS-2024-0094",
      "Recipient Name": "SCIENCE APPLICATIONS INTERNATIONAL CORP",
      "Award Amount": 278900000,
      "Award Date": new Date().toISOString().split("T")[0],
      "Description": "HEALTH IT MODERNIZATION AND CLOUD MIGRATION SERVICES",
      "Awarding Agency": "Department of Health and Human Services",
      "Awarding Sub Agency": "Centers for Medicare & Medicaid Services",
      "NAICS Code": "541511",
      "NAICS Description": "Custom Computer Programming Services",
      "Place of Performance State Code": "MD",
      "Type of Set Aside": "SBP",
      stock: { ticker: "SAIC", exchange: "NMS", name: "Science Applications International", revolut: true },
    },
    {
      "Award ID": "N00019-24-C-0112",
      "Recipient Name": "CACI INTERNATIONAL INC",
      "Award Amount": 195600000,
      "Award Date": new Date().toISOString().split("T")[0],
      "Description": "INTELLIGENCE ANALYSIS AND CYBER OPERATIONS SUPPORT FOR NAVAL SYSTEMS",
      "Awarding Agency": "Department of Defense",
      "Awarding Sub Agency": "Dept. of the Navy",
      "NAICS Code": "541690",
      "NAICS Description": "Other Scientific and Technical Consulting Services",
      "Place of Performance State Code": "VA",
      "Type of Set Aside": "8A",
      stock: { ticker: "CACI", exchange: "NYQ", name: "CACI International Inc.", revolut: true },
    },
    {
      "Award ID": "DHS-2024-CISA-0078",
      "Recipient Name": "CLASSIC AIR CHARTER INC.",
      "Award Amount": 794300000,
      "Award Date": new Date().toISOString().split("T")[0],
      "Description": "AVIATION LOGISTICS AND CHARTER TRANSPORT SERVICES FOR FEDERAL AGENCIES",
      "Awarding Agency": "Department of Homeland Security",
      "Awarding Sub Agency": "Customs and Border Protection",
      "NAICS Code": "481211",
      "NAICS Description": "Nonscheduled Air Transportation",
      "Place of Performance State Code": "TX",
      "Type of Set Aside": "WOSB",
      stock: { ticker: null, exchange: null, name: null, revolut: false },
    },
    {
      "Award ID": "NASA-2024-JSC-0043",
      "Recipient Name": "SCIENCE SYSTEMS AND APPLICATIONS, INC.",
      "Award Amount": 670400000,
      "Award Date": new Date().toISOString().split("T")[0],
      "Description": "EARTH SCIENCE DATA PROCESSING AND ANALYSIS SYSTEMS",
      "Awarding Agency": "National Aeronautics and Space Administration",
      "Awarding Sub Agency": "Goddard Space Flight Center",
      "NAICS Code": "541712",
      "NAICS Description": "Research and Development in Physical, Engineering Sciences",
      "Place of Performance State Code": "MD",
      "Type of Set Aside": "SBA",
      stock: { ticker: null, exchange: null, name: null, revolut: false },
    },
    {
      "Award ID": "VA-2024-IT-0221",
      "Recipient Name": "MANTECH INTERNATIONAL CORP",
      "Award Amount": 142000000,
      "Award Date": new Date().toISOString().split("T")[0],
      "Description": "VETERANS INFORMATION SYSTEMS AND TECHNOLOGY ARCHITECTURE SUPPORT",
      "Awarding Agency": "Department of Veterans Affairs",
      "Awarding Sub Agency": "Veterans Health Administration",
      "NAICS Code": "541512",
      "NAICS Description": "Computer Systems Design Services",
      "Place of Performance State Code": "DC",
      "Type of Set Aside": "SDVOSBC",
      stock: { ticker: "MAN", exchange: "NYQ", name: "ManTech International Corporation", revolut: true },
    },
    {
      "Award ID": "DOE-2024-NNL-0089",
      "Recipient Name": "SECURIGENCE LLC",
      "Award Amount": 618300000,
      "Award Date": new Date().toISOString().split("T")[0],
      "Description": "CYBERSECURITY OPERATIONS AND NETWORK DEFENSE SERVICES",
      "Awarding Agency": "Department of Defense",
      "Awarding Sub Agency": "Defense Information Systems Agency",
      "NAICS Code": "541519",
      "NAICS Description": "Other Computer Related Services",
      "Place of Performance State Code": "VA",
      "Type of Set Aside": "HZC",
      stock: { ticker: null, exchange: null, name: null, revolut: false },
    },
    {
      "Award ID": "DOT-2024-FAA-0056",
      "Recipient Name": "VENTECH SOLUTIONS INC",
      "Award Amount": 793600000,
      "Award Date": new Date().toISOString().split("T")[0],
      "Description": "AIR TRAFFIC CONTROL SYSTEMS MODERNIZATION AND MAINTENANCE",
      "Awarding Agency": "Department of Transportation",
      "Awarding Sub Agency": "Federal Aviation Administration",
      "NAICS Code": "541330",
      "NAICS Description": "Engineering Services",
      "Place of Performance State Code": "OK",
      "Type of Set Aside": "8A",
      stock: { ticker: null, exchange: null, name: null, revolut: false },
    },
    {
      "Award ID": "GSA-2024-PBS-0034",
      "Recipient Name": "ICF INCORPORATED LLC",
      "Award Amount": 89500000,
      "Award Date": new Date().toISOString().split("T")[0],
      "Description": "POLICY ANALYSIS AND PROGRAM EVALUATION SERVICES",
      "Awarding Agency": "General Services Administration",
      "Awarding Sub Agency": "Federal Acquisition Service",
      "NAICS Code": "541611",
      "NAICS Description": "Administrative Management and General Management Consulting Services",
      "Place of Performance State Code": "VA",
      "Type of Set Aside": "WOSB",
      stock: { ticker: "ICFI", exchange: "NMS", name: "ICF International Inc.", revolut: true },
    },
    {
      "Award ID": "HUD-2024-0012",
      "Recipient Name": "T-REX SOLUTIONS LLC",
      "Award Amount": 1480200000,
      "Award Date": new Date().toISOString().split("T")[0],
      "Description": "FINANCIAL SYSTEMS MODERNIZATION AND DIGITAL TRANSFORMATION",
      "Awarding Agency": "Department of Commerce",
      "Awarding Sub Agency": "Census Bureau",
      "NAICS Code": "541511",
      "NAICS Description": "Custom Computer Programming Services",
      "Place of Performance State Code": "MD",
      "Type of Set Aside": "SBA",
      stock: { ticker: null, exchange: null, name: null, revolut: false },
    },
    {
      "Award ID": "EPA-2024-0078",
      "Recipient Name": "PERATON INC.",
      "Award Amount": 56700000,
      "Award Date": new Date().toISOString().split("T")[0],
      "Description": "ENVIRONMENTAL DATA MANAGEMENT AND SATELLITE GROUND SYSTEMS SUPPORT",
      "Awarding Agency": "Environmental Protection Agency",
      "Awarding Sub Agency": "Office of Environmental Information",
      "NAICS Code": "541712",
      "NAICS Description": "Research and Development in Physical, Engineering Sciences",
      "Place of Performance State Code": "CO",
      "Type of Set Aside": "HZS",
      stock: { ticker: null, exchange: null, name: null, revolut: false },
    },
  ],
};
