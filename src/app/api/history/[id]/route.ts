import { NextRequest, NextResponse } from "next/server";
import { toggleSaved, deleteComparison } from "@/lib/queries";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  if (typeof body.saved !== "boolean") {
    return NextResponse.json(
      { error: "saved (boolean) is required" },
      { status: 400 }
    );
  }

  const comparison = await toggleSaved(id, body.saved);
  return NextResponse.json(comparison);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await deleteComparison(id);
  return new Response(null, { status: 204 });
}
