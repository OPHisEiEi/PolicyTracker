import { NextRequest, NextResponse } from "next/server";
import driver from "@/app/lib/neo4j";
import pg from "@/app/lib/postgres";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ name: string }> }
) {
  const { name } = await context.params;
  const categoryName = decodeURIComponent(name).trim();

  if (!categoryName) {
    return NextResponse.json({ error: "Missing category name" }, { status: 400 });
  }

  const party = req.nextUrl.searchParams.get("party");
  const status = req.nextUrl.searchParams.get("status");

  const session = driver.session();
  const client = await pg.connect();

  try {
    const whereConditions: string[] = ["c.name = $category"];
    const params: Record<string, any> = { category: categoryName };

    if (party && party !== "ทั้งหมด") {
      whereConditions.push("party.name = $party");
      params.party = party;
    }

    if (status && status !== "ทั้งหมด") {
      whereConditions.push("p.status = $status");
      params.status = status;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

    const result = await session.run(
      `
      MATCH (p:Policy)-[:HAS_CATEGORY]->(c:Category)
      MATCH (p)-[:BELONGS_TO]->(party:Party)
      ${whereClause}
      RETURN 
        p.id AS policyId,
        p.name AS policyName,
        p.description AS description,
        p.progress AS progress,
        p.status AS status,
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

      if (typeof rawId?.toNumber === "function") {
        policyId = rawId.toNumber();
      } else if (typeof rawId === "number") {
        policyId = rawId;
      } else if (typeof rawId === "object" && rawId !== null && typeof rawId.low === "number") {
        policyId = rawId.low;
      } else if (typeof rawId === "string") {
        const parsed = parseInt(rawId, 10);
        policyId = isNaN(parsed) ? (idx + 1) : parsed;
      } else {
        policyId = idx + 1; 
      }

      if (!Number.isFinite(policyId) || policyId <= 0) {
        policyId = idx + 1;
      }

      const rawProgress = r.get("progress");
      let progress = 0;

      if (typeof rawProgress?.toNumber === "function") {
        progress = rawProgress.toNumber();
      } else if (typeof rawProgress === "number") {
        progress = rawProgress;
      } else if (typeof rawProgress === "string") {
        progress = parseFloat(rawProgress) || 0;
      }

      return {
        policyId,
        policyName: r.get("policyName") ?? "-",
        description: r.get("description") ?? "-",
        status: r.get("status") ?? "-",
        progress: Math.max(0, Math.min(100, progress)), 
        partyName: r.get("partyName") ?? "ไม่ระบุพรรค",
        partyId: (() => {
          const raw = r.get("partyId");
          if (typeof raw?.toNumber === "function") return raw.toNumber();
          if (typeof raw === "object" && raw?.low !== undefined) return raw.low;
          return Number(raw) || 0;
        })(),
        categoryName: r.get("categoryName") ?? categoryName, 
      };
    });

    const validPolicyIds = neoPolicies
      .map((p) => p.policyId)
      .filter((id): id is number => typeof id === "number" && Number.isFinite(id) && id > 0);

    let budgetMap: Record<number, number> = {};

    if (validPolicyIds.length > 0) {
      try {
        const budgetRes = await client.query(
          `SELECT id, total_budget FROM policies WHERE id = ANY($1::int[])`,
          [validPolicyIds]
        );

        budgetMap = budgetRes.rows.reduce((acc, row) => {
          const budget = Number(row.total_budget);
          acc[row.id] = isNaN(budget) ? 0 : budget;
          return acc;
        }, {} as Record<number, number>);
      } catch (budgetError) {
        console.warn("Error fetching budget data:", budgetError);
      }
    }

    const policies = neoPolicies.map((p) => ({
      ...p,
      budget: budgetMap[p.policyId] || null, 
    }));

    return NextResponse.json(policies);
  } catch (err) {
    console.error("Error in /api/policycategory/[name]:", err);
    return NextResponse.json({
      error: "Internal server error",
      message: err instanceof Error ? err.message : "Unknown error"
    }, { status: 500 });
  } finally {
    await session.close();
    client.release();
  }
}