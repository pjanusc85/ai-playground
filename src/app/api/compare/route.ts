import { createCompareStream } from "@/lib/ai/stream-compare";
import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { prompt, system } = body;

  if (!prompt || typeof prompt !== "string") {
    return NextResponse.json(
      { error: "Prompt is required" },
      { status: 400 }
    );
  }

  if (prompt.length > 10000) {
    return NextResponse.json(
      { error: "Prompt must be under 10,000 characters" },
      { status: 400 }
    );
  }

  const { stream, completionPromise } = createCompareStream(prompt, system);

  // Use after() to keep the function alive until the DB save completes
  after(async () => {
    try {
      const collectedResponses = await completionPromise;
      const { saveComparisonFromStream } = await import("@/lib/queries");
      await saveComparisonFromStream(prompt, system || null, collectedResponses);
    } catch (e) {
      console.error("Failed to save comparison:", e);
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
