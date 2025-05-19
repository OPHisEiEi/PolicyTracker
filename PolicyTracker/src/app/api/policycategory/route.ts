import { NextRequest, NextResponse } from "next/server";
import driver from "@/app/lib/neo4j";

export async function GET(req: NextRequest) {
  const session = driver.session();
  const party = req.nextUrl.searchParams.get("party");
  const status = req.nextUrl.searchParams.get("status");

  try {
    // สร้างเงื่อนไข filter แบบ dynamic
    const whereConditions: string[] = [];
    const params: Record<string, any> = {};

    if (party) {
      whereConditions.push("party.name = $party");
      params.party = party;
    }

    if (status) {
      whereConditions.push("p.status = $status");
      params.status = status;
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(" AND ")}`
      : "";

    const result = await session.run(
      `
      MATCH (p:Policy)-[:BELONGS_TO]->(party:Party)
      OPTIONAL MATCH (p)-[:IN_CATEGORY]->(c:Category)
      ${whereClause}
      RETURN p.name AS policyName,
             p.description AS description,
             p.budget AS budget,
             p.status AS status,
             p.progress AS progress,
             p.like AS like,
             party.name AS partyName,
             c.name AS categoryName
      `,
      params
    );

    const policies = result.records.map((record) => ({
      policyName: record.get("policyName"),
      description: record.get("description"),
      budget: record.get("budget")?.toNumber?.() ?? "-",
      status: record.get("status")?.toString?.() ?? "-",
      progress: record.get("progress")?.toString?.() ?? "-",
      like: record.get("like")?.toNumber?.() ?? 0,
      partyName: record.get("partyName") || "ไม่ระบุพรรค",
      categoryName: record.get("categoryName") || "ไม่ระบุหมวดหมู่",
    }));

    return NextResponse.json(policies);
  } catch (err) {
    console.error("❌ Neo4j Error in /api/policycategory:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  } finally {
    await session.close();
  }
}
