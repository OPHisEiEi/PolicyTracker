import { NextRequest, NextResponse } from "next/server";
import driver from "@/app/lib/neo4j";
import pg from "@/app/lib/postgres";

export async function POST(req: NextRequest) {
  const session = driver.session();

  try {
    const { partyName } = await req.json();

    if (!partyName) {
      return NextResponse.json({ error: "Missing partyName" }, { status: 400 });
    }

    const result = await session.run(
      `
      MATCH (p:Policy)-[:BELONGS_TO]->(party:Party {name: $partyName})
      OPTIONAL MATCH (p)-[:HAS_CATEGORY]->(c:Category)
      RETURN p.id AS id, p.name AS policy_name, p.description AS policy_description, c.name AS policy_category
      `,
      { partyName }
    );

    const neo4jPolicies = result.records
      .map((record) => ({
        id: record.get("id")?.toNumber?.() ?? null,
        policy_name: record.get("policy_name"),
        policy_description: record.get("policy_description") || "-",
        policy_category: record.get("policy_category") || "-",
      }))
      .filter((p) => p.id !== null);

    const ids = neo4jPolicies.map((p) => p.id);

    let pgPolicies: Record<number, any> = {};
    if (ids.length > 0) {
      const pgResult = await pg.query(
        `SELECT id, total_budget, created_at, party_id FROM policies WHERE id = ANY($1::int[])`,
        [ids]
      );

      pgPolicies = pgResult.rows.reduce((acc, row) => {
        acc[row.id] = row;
        return acc;
      }, {} as Record<number, any>);
    }

    const combined = neo4jPolicies.map((p) => ({
      id: p.id,
      name: p.policy_name,
      description: p.policy_description,
      category: p.policy_category,
      total_budget: pgPolicies[p.id]?.total_budget ?? null,
      created_at: pgPolicies[p.id]?.created_at ?? null,
      party_id: pgPolicies[p.id]?.party_id ?? null,
    }));

    const sorted = combined.sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    });

    return NextResponse.json(sorted);
  } catch (error) {
    console.error("❌ Error fetching policies:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  } finally {
    await session.close();
  }
}

export async function GET() {
  return NextResponse.json({ message: "This API expects a POST request." });
}
