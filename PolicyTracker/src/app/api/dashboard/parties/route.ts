import { NextResponse } from "next/server";
import pg from "@/app/lib/postgres";

export async function GET() {
  try {
    const result = await pg.query("SELECT id, name FROM parties ORDER BY id");
    return NextResponse.json({ parties: result.rows });
  } catch (err) {
    console.error("Failed to fetch parties:", err);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
