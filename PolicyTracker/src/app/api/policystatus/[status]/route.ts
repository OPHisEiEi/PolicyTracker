
import { NextRequest, NextResponse } from "next/server";
import driver from "@/app/lib/neo4j";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const key = decodeURIComponent(name);
  if (!key) {
    return NextResponse.json(
      { error: "Missing status parameter" },
      { status: 400 }
    );
  }

  const session = driver.session();
  try {
    const result = await session.run(
      `
      MATCH (p:Policy {status: $key})
      OPTIONAL MATCH (p)-[:BELONGS_TO]->(party:Party)
      RETURN
        p.name        AS policyName,
        p.description AS description,
        p.budget      AS budget,
        p.progress    AS progress,
        p.status      AS status,
        p.like        AS like,
        party.name    AS partyName
      `,
      { key }
    );

    const policies = result.records.map((r) => ({
      policyName:  r.get("policyName"),
      description: r.get("description"),
      budget:      r.get("budget")?.toNumber?.()  ?? 0,
      progress:    r.get("progress")?.toString?.() ?? "-",
      status:      r.get("status")?.toString?.()   ?? "-",
      like:        r.get("like")?.toNumber?.()     ?? 0,
      partyName:   r.get("partyName") || "ไม่ระบุพรรค",
    }));

    return NextResponse.json(policies);
  } catch (e) {
    console.error("Neo4j error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}