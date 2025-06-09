import { NextResponse } from "next/server";
import pool from "@/app/lib/postgres"; 

export async function GET() {
  try {
    const result = await pool.query("SELECT id, name FROM campaigns ORDER BY id");
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Load campaigns error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
