import { NextRequest, NextResponse } from 'next/server';
import driver from '@/app/lib/neo4j';

export async function GET(_req: NextRequest) {
  const session = driver.session();

  try {
    const result = await session.run(`
      MATCH (p:Policy)-[:BELONGS_TO]->(party:Party)
      OPTIONAL MATCH (p)-[:HAS_CATEGORY]->(c:Category)
      RETURN 
        p.id AS policyId, 
        p.name AS policyName, 
        p.description AS description, 
        p.budget AS budget,
        p.like AS like,
        p.progress AS progress, 
        party.id AS partyId, 
        party.name AS partyName, 
        c.id AS categoryId, 
        c.name AS categoryName
    `);

    const policies = result.records.map((record) => ({
      id: record.get("policyId")?.toNumber?.() ?? null,
      policyName: record.get("policyName"),
      description: record.get("description"),
      budget: record.get("budget")?.toNumber?.() ?? 0,
      like: record.get("like")?.toNumber?.() ?? 0,
      progress: record.get("progress"),
      partyId: record.get("partyId")?.toNumber?.() ?? null,
      partyName: record.get("partyName"),
      categoryId: record.get("categoryId")?.toNumber?.() ?? null,
      categoryName: record.get("categoryName") || "-",
    }));

    return NextResponse.json(policies);
  } catch (error) {
    console.error("Neo4j Error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  } finally {
    await session.close();
  }
}
