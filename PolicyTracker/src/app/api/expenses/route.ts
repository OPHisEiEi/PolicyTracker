import { NextRequest, NextResponse } from "next/server";
import pool from "@/app/lib/postgres";

export async function POST(req: NextRequest) {
  try {
    const { campaign_id, description, amount, category } = await req.json();

    const check = await pool.query("SELECT id FROM campaigns WHERE id = $1", [campaign_id]);
    if (check.rows.length === 0) {
      return NextResponse.json({ error: "ไม่พบโครงการที่เลือก" }, { status: 400 });
    }

    await pool.query(
      `
      INSERT INTO expenses (campaign_id, description, amount, category)
      VALUES ($1, $2, $3, $4)
      `,
      [campaign_id, description, amount, category]
    );

    return NextResponse.json({ message: "บันทึกสำเร็จ" });
  } catch (error) {
    console.error("Server Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
