import { NextRequest, NextResponse } from "next/server";
import pg from "@/app/lib/postgres";

export async function GET(req: NextRequest) {
  const policyName = req.nextUrl.searchParams.get("policy");

  if (!policyName) {
    return NextResponse.json({ error: "กรุณาระบุชื่อนโยบาย (policy)" }, { status: 400 });
  }

  try {
    const result = await pg.query(
      `
      SELECT 
        p.name AS policy_name,
        COALESCE(SUM(c.allocated_budget), 0) AS total_budget,
        COALESCE(SUM(e.amount), 0) AS total_expense,
        (COALESCE(SUM(c.allocated_budget), 0) - COALESCE(SUM(e.amount), 0)) AS remaining
      FROM policies p
      LEFT JOIN campaigns c ON p.id = c.policy_id
      LEFT JOIN expenses e ON c.id = e.campaign_id
      WHERE p.name = $1
      GROUP BY p.name
      `,
      [policyName]
    );


    if (result.rows.length > 0) {
      return NextResponse.json(result.rows[0]);
    } else {
      return NextResponse.json({ total_budget: 0, total_expense: 0, remaining: 0 });
    }


  } catch (err) {
    console.error("Error fetching budget summary:", err);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" }, { status: 500 });
  }
}
