import { NextRequest, NextResponse } from "next/server";
import driver from "@/app/lib/neo4j";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("policyId");
  if (!id) {
    return NextResponse.json({ error: "ระบุ id ของนโยบายด้วย" }, { status: 400 });
  }

  const session = driver.session();
  try {
    const result = await session.run(
      `
      MATCH (:Policy {id: $id})<-[:PART_OF]-(c:Campaign)
      RETURN avg(toInteger(c.progress)) AS avgProgress
      `,
      { id: parseInt(id) }
    );

    const progress = result.records[0]?.get("avgProgress") ?? 0;
    return NextResponse.json({ progress });
  } catch (err) {
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  } finally {
    await session.close();
  }
}
