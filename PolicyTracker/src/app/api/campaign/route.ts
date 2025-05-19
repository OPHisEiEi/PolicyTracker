import { NextRequest, NextResponse } from "next/server";
import driver from "@/app/lib/neo4j";
import pg from "@/app/lib/postgres";

export async function GET(req: NextRequest) {
  const partyName = req.nextUrl.searchParams.get("party") || "";
  const session = driver.session();

  try {
    const query = `
      MATCH (c:Campaign)-[:PART_OF]->(p:Policy)-[:BELONGS_TO]->(party:Party)
      ${partyName ? "WHERE party.name = $party" : ""}
      RETURN c.name AS name, c.description AS description, c.status AS status, c.size AS size,
             p.name AS policyName, party.name AS partyName
    `;

    const result = await session.run(query, { party: partyName });

    const normalCampaigns = [];
    const specialCampaigns = [];

    for (const record of result.records) {
      const name = record.get("name");
      const description = record.get("description") || "";
      const status = record.get("status") || "-";
      const size = record.get("size") ?? "-";
      const policy = record.get("policyName") || "";
      const party = record.get("partyName") || "";

      const isSpecial = policy.includes("โครงการพิเศษ");

      const data = { name, description, status, policy, party, size };
      if (isSpecial) {
        specialCampaigns.push(data);
      } else {
        normalCampaigns.push(data);
      }
    }

    return NextResponse.json({ normal: normalCampaigns, special: specialCampaigns });
  } catch (err) {
    console.error("❌ Error loading campaigns:", err);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  } finally {
    await session.close();
  }
}
