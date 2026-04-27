import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { MOCK_DATA } from "@/lib/mockData";

export async function GET() {
  const dataDir = path.join(process.cwd(), "..", "data");

  try {
    if (!fs.existsSync(dataDir)) {
      return NextResponse.json(MOCK_DATA);
    }

    const files = fs
      .readdirSync(dataDir)
      .filter((f) => f.startsWith("contracts_") && f.endsWith(".json"))
      .sort()
      .reverse();

    if (files.length === 0) {
      return NextResponse.json(MOCK_DATA);
    }

    const latest = fs.readFileSync(path.join(dataDir, files[0]), "utf-8");
    const parsed = JSON.parse(latest);

    // Se o ficheiro real estiver vazio, usa mock
    if (!parsed.contracts || parsed.contracts.length === 0) {
      return NextResponse.json(MOCK_DATA);
    }

    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json(MOCK_DATA);
  }
}
