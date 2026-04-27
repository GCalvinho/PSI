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
  fetched_at: string | null;
  contracts: Contract[];
};
