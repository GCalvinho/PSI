import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

export async function POST() {
  const scriptPath = path.join(process.cwd(), "..", "fetcher.py");

  return new Promise<NextResponse>((resolve) => {
    const python = spawn("python3", [scriptPath], {
      cwd: path.join(process.cwd(), ".."),
    });

    const logs: string[] = [];

    python.stdout.on("data", (d) => logs.push(d.toString()));
    python.stderr.on("data", (d) => logs.push(d.toString()));

    python.on("close", (code) => {
      if (code === 0) {
        resolve(NextResponse.json({ ok: true, logs: logs.join("") }));
      } else {
        resolve(
          NextResponse.json({ ok: false, logs: logs.join("") }, { status: 500 })
        );
      }
    });

    python.on("error", (err) => {
      resolve(
        NextResponse.json({ ok: false, logs: err.message }, { status: 500 })
      );
    });
  });
}
