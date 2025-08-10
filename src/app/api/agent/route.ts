import { NextResponse } from "next/server";
import { Agent, run } from "@openai/agents";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { input } = (await request.json()) as { input?: string };
    if (!input || typeof input !== "string") {
      return NextResponse.json(
        { error: "Field 'input' is required as a non-empty string" },
        { status: 400 }
      );
    }

    const agent = new Agent({
      name: "Hotel Analytics Agent",
      instructions:
        "Anda adalah asisten untuk aplikasi Hotel Analytics. Jawab secara ringkas dan jelas. Jika relevan, beri langkah-langkah praktis.",
    });

    const result = await run(agent, input);

    return NextResponse.json({
      output: result.finalOutput ?? "",
    });
  } catch (error) {
    console.error("/api/agent error", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}