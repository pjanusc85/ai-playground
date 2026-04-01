import { NextRequest, NextResponse } from "next/server";
import { listComparisons, saveComparison } from "@/lib/queries";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const savedOnly = searchParams.get("saved") === "true";

  const result = await listComparisons(page, limit, savedOnly);
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { prompt, system, responses } = body;

  if (!prompt || !responses) {
    return NextResponse.json(
      { error: "prompt and responses are required" },
      { status: 400 }
    );
  }

  const comparison = await saveComparison(prompt, system || null, responses);
  return NextResponse.json(comparison, { status: 201 });
}
