import { NextRequest, NextResponse } from "next/server";
import driver from "@/app/lib/neo4j";
import pg from "@/app/lib/postgres";

export async function GET(req: NextRequest) {
  const session = driver.session();
  const client = await pg.connect();

  const party = req.nextUrl.searchParams.get("party");
  const status = req.nextUrl.searchParams.get("status");

  try {
    const whereConditions: string[] = [];
    const params: Record<string, any> = {};

    if (party && party !== "ทั้งหมด") {
      whereConditions.push("party.name = $party");
      params.party = party;
    }

    if (status && status !== "ทั้งหมด") {
      whereConditions.push("p.status = $status");
      params.status = status;
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(" AND ")}`
      : "";

    const result = await session.run(
      `
      MATCH (p:Policy)
MATCH (p)-[:BELONGS_TO]->(party:Party)
OPTIONAL MATCH (p)-[:HAS_CATEGORY]->(c:Category)

      ${whereClause}
      RETURN 
        p.id AS policyId, 
        p.name AS policyName,
        p.description AS description,
        p.status AS status,
        p.progress AS progress,
        p.like AS like,
        party.name AS partyName,
        party.id AS partyId,  
        c.name AS categoryName
      ORDER BY p.id
      `,
      params
    );

    const neoPolicies = result.records.map((r, idx) => {
      const rawId = r.get("policyId");
      let policyId: number;

      if (typeof rawId === "number") {
        policyId = rawId;
      } else if (typeof rawId === "object" && rawId?.low !== undefined) {
        policyId = rawId.low;
      } else if (typeof rawId === "string") {
        const parsed = parseInt(rawId, 10);
        policyId = isNaN(parsed) ? (1000000 + idx) : parsed;
      } else {
        policyId = 1000000 + idx;
      }

      return {
        policyId,
        policyName: r.get("policyName"),
        description: r.get("description"),
        status: r.get("status"),
        progress: r.get("progress"),
        like: r.get("like"),
        partyName: r.get("partyName"),
        partyId: r.get("partyId"),
        categoryName: r.get("categoryName"),
        uniqueKey: `neo_policy_${policyId}_${idx}`,
      };
    });

    const validPolicyIds = neoPolicies
      .map((p) => p.policyId)
      .filter((id) => typeof id === "number" && Number.isFinite(id) && id < 1000000);

    let budgetMap: Record<number, number> = {};

    if (validPolicyIds.length > 0) {
      const pgRes = await client.query(
        `SELECT id, total_budget FROM public.policies WHERE id = ANY($1::int[])`,
        [validPolicyIds]
      );

      for (const row of pgRes.rows) {
        budgetMap[row.id] = Number(row.total_budget) || 0;
      }
    }

    const combined = neoPolicies.map((p) => ({
      policyId: p.policyId,
      policyName: String(p.policyName || ""),
      description: String(p.description || ""),
      status: String(p.status || ""),
      progress: Number(p.progress) || 0,
      like: Number(p.like) || 0,
      partyName: String(p.partyName || ""),
      partyId: Number(p.partyId) || 0,
      categoryName: String(p.categoryName || ""),
      budget: budgetMap[p.policyId] ?? 0,
      uniqueKey: p.uniqueKey,
    }));

    return NextResponse.json(combined);

  } catch (err) {
    console.error("API /api/policycategory error:", err);
    return NextResponse.json({
      error: "Internal error",
      message: err instanceof Error ? err.message : "Unknown error"
    }, { status: 500 });
  } finally {
    await session.close();
    client.release();
  }
}