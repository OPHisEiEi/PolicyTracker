// src/app/api/partycategory/[name]/route.ts
import { NextRequest, NextResponse } from "next/server";
import driver from "@/app/lib/neo4j";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ name: string }> }
) {
  // รอ resolve params ก่อน
  const { name } = await context.params;
  const party = decodeURIComponent(name).trim();

  if (!party) {
    return NextResponse.json(
      { error: "Missing party parameter" },
      { status: 400 }
    );
  }

  const session = driver.session();
  try {
    const result = await session.run(
      `
      MATCH (p:Policy)-[:BELONGS_TO]->(party:Party {name: $party})
      OPTIONAL MATCH (p)-[:HAS_CATEGORY]->(c:Category)
      RETURN
        p.name         AS policyName,
        p.description  AS description,
        p.budget       AS budget,
        p.progress     AS progress,
        c.name         AS categoryName,
        party.name     AS partyName
      `,
      { party }
    );

    const policies = result.records.map((record) => {
      // แปลง Neo4j Integer เป็น number หรือ fallback เป็น "-"
      const rawBudget = record.get("budget");
      const budget =
        rawBudget?.toNumber?.() ?? rawBudget ?? "-";

      // progress อาจเป็น string หรือ number
      const rawProgress = record.get("progress");
      const progress =
        typeof rawProgress === "string"
          ? rawProgress
          : rawProgress?.toString?.() ?? "-";

      return {
        policyName:   record.get("policyName"),
        description:  record.get("description"),
        budget,
        progress,
        categoryName: record.get("categoryName") || "-",
        partyName:    record.get("partyName")    || "-",
      };
    });

    return NextResponse.json(policies);
  } catch (error) {
    console.error("❌ Error in /api/partycategory:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}