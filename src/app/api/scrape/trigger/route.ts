import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const scraperName: string = body.scraper_name ?? body.scraperName ?? "";
  if (!scraperName) {
    return NextResponse.json({ error: "scraper_name required" }, { status: 400 });
  }

  const workerUrl = process.env.WORKER_API_URL || "http://localhost:8765";
  try {
    const r = await fetch(`${workerUrl}/trigger`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scraper_name: scraperName }),
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) {
      const text = await r.text();
      return NextResponse.json(
        { error: `worker returned ${r.status}: ${text}` },
        { status: 502 },
      );
    }
    const data = await r.json();
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `worker unreachable at ${workerUrl} — start Celery + FastAPI: bash scripts/run-workers.sh`, detail: msg },
      { status: 503 },
    );
  }
}
