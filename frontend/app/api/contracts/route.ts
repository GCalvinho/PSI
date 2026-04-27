import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  const dataDir = path.join(process.cwd(), "..", "data");

  try {
    if (!fs.existsSync(dataDir)) {
      return NextResponse.json({ fetched_at: null, contracts: [] });
    }

    const files = fs
      .readdirSync(dataDir)
      .filter((f) => f.startsWith("contracts_") && f.endsWith(".json"))
      .sort()
      .reverse();

    if (files.length === 0) {
      return NextResponse.json({ fetched_at: null, contracts: [] });
    }

    const latest = fs.readFileSync(path.join(dataDir, files[0]), "utf-8");
    const parsed = JSON.parse(latest);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ fetched_at: null, contracts: [] });
  }
}
