import { NextRequest, NextResponse } from "next/server";

const TRAKKER_BASE = "https://mytrakker.tpltrakker.com/TrakkerServices/Api";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const res = await fetch(`${TRAKKER_BASE}/Services/GetToken`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Failed to reach Trakker API" },
            { status: 502 }
        );
    }
}
