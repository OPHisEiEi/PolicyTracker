import { NextRequest, NextResponse } from "next/server";
import driver from "@/app/lib/neo4j";
import pg from "@/app/lib/postgres";

export async function GET(req: NextRequest) {
  const partyId = parseInt(req.nextUrl.searchParams.get("party") || "0", 10);
  const session = driver.session();
  const client = await pg.connect();

  try {
    const query = `
      MATCH (c:Campaign)-[:PART_OF]->(p:Policy)-[:BELONGS_TO]->(party:Party)
      ${partyId ? "WHERE toInteger(party.id) = $partyId" : ""}
      RETURN 
        c.id AS id, 
        c.name AS name,
        c.description AS description,
        c.status AS status,
        c.size AS size,
        p.id AS policyId,
        p.name AS policyName,
        party.id AS partyId,
        party.name AS partyName
    `;

    const result = await session.run(query, { partyId });

    const normalCampaigns = [];
    const specialCampaigns = [];

    for (const record of result.records) {
      const id = record.get("id")?.toNumber?.() ?? null;
      const name = record.get("name");
      const description = record.get("description") || "";
      const status = record.get("status") || "-";
      const size = record.get("size") ?? "-";
      const policyId = record.get("policyId")?.toNumber?.() ?? null;
      const policyName = record.get("policyName") || "";
      const partyId = record.get("partyId")?.toNumber?.() ?? null;
      const partyName = record.get("partyName") || "";

      const isSpecial = policyName.includes("โครงการพิเศษ");

      
      const budgetResult = await client.query(
        `SELECT allocated_budget FROM campaigns WHERE id = $1 LIMIT 1`,
        [id]
      );
      const budget = budgetResult.rows[0]?.allocated_budget ?? null;

      const data = {
        id,
        name,
        description,
        status,
        policy: policyName,
        party: partyName,
        party_id: partyId,
        size,
        budget,
      };

      if (isSpecial) {
        specialCampaigns.push(data);
      } else {
        normalCampaigns.push(data);
      }
    }

    return NextResponse.json({ normal: normalCampaigns, special: specialCampaigns });
  } catch (err) {
    console.error("Error loading campaigns:", err);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  } finally {
    await session.close();
    try {
      client.release();
    } catch (e) {
      console.error("Failed to release Postgres client", e);
    }
  }
}