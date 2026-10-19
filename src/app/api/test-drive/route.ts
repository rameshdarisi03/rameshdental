import { NextResponse } from "next/server";

export async function GET() {
  // Test endpoint disabled for production security
  return NextResponse.json(
    { success: false, error: "Not found." },
    { status: 404 }
  );
}
