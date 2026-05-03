import { NextRequest, NextResponse } from "next/server";

const TRAKKER_BASE = "https://mytrakker.tpltrakker.com/TrakkerServices/Api";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const phone = searchParams.get("phone");
        const year = searchParams.get("year");

        if (!phone || !year) {
            return NextResponse.json({ error: "phone and year are required" }, { status: 400 });
        }

        const userId = req.headers.get("x-tracker-userid");
        const token = req.headers.get("x-tracker-token");

        if (!userId || !token) {
            return NextResponse.json({ error: "Missing x-tracker-userid or x-tracker-token headers" }, { status: 400 });
        }

        const res = await fetch(`${TRAKKER_BASE}/Home/GetVLL/${phone}/${year}`, {
            method: "GET",
            headers: {
                UserID: userId,
                Token: token,
            },
        });

        const text = await res.text();
        let data: unknown;
        try {
            data = JSON.parse(text);
        } catch {
            data = { raw: text };
        }

        return NextResponse.json(data, { status: res.status });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Failed to reach Trakker API" },
            { status: 502 }
        );
    }
}
