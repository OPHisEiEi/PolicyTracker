import { NextResponse, NextRequest } from "next/server";
import pg from "@/app/lib/postgres";
import driver from "@/app/lib/neo4j";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const rawPartyId = url.searchParams.get("partyId");
const partyId = rawPartyId && rawPartyId !== "all" && !isNaN(Number(rawPartyId))
  ? Number(rawPartyId)
  : "all";

  const session = driver.session();

  let policyProgress = 0;
  let projectProgress = 0;
  let specialProgress = 0;
  let topSpecial = null;

  try {
    const policyRes = await session.run(
      partyId === "all"
        ? `
      MATCH (p:Policy)
      OPTIONAL MATCH (p)<-[:PART_OF]-(c:Campaign)
      WITH p,
          CASE c.size WHEN 'เล็ก' THEN 1 WHEN 'กลาง' THEN 2 WHEN 'ใหญ่' THEN 3 ELSE 0 END AS weight,
          toFloat(c.progress) AS progress
      WITH p,
          collect(progress * weight) AS weightedScores,
          collect(weight) AS weights
      WITH p,
          reduce(s=0.0, x IN weightedScores | s + toFloat(x)) AS totalWeighted,
          reduce(s=0.0, x IN weights | s + toFloat(x)) AS totalWeight
      WITH p,
          CASE WHEN totalWeight > 0 THEN totalWeighted / totalWeight ELSE 0 END AS weightedAvg
      RETURN avg(weightedAvg) AS policyProgress
    `
        : `
      MATCH (party:Party {id: $partyId})<-[:BELONGS_TO]-(p:Policy)
      OPTIONAL MATCH (p)<-[:PART_OF]-(c:Campaign)
      WITH p,
          CASE c.size WHEN 'เล็ก' THEN 1 WHEN 'กลาง' THEN 2 WHEN 'ใหญ่' THEN 3 ELSE 0 END AS weight,
          toFloat(c.progress) AS progress
      WITH p,
          collect(progress * weight) AS weightedScores,
          collect(weight) AS weights
      WITH p,
          reduce(s=0.0, x IN weightedScores | s + toFloat(x)) AS totalWeighted,
          reduce(s=0.0, x IN weights | s + toFloat(x)) AS totalWeight
      WITH p,
          CASE WHEN totalWeight > 0 THEN totalWeighted / totalWeight ELSE 0 END AS weightedAvg
      RETURN avg(weightedAvg) AS policyProgress
    `,
      partyId === "all" ? {} : { partyId: Number(partyId) }
    );
    policyProgress = policyRes.records[0]?.get("policyProgress") || 0;

    const projectRes = await session.run(
      partyId === "all"
        ? `MATCH (c:Campaign) RETURN avg(toFloat(c.progress)) AS projectProgress`
        : `
      MATCH (party:Party {id: $partyId})
      MATCH (party)<-[:BELONGS_TO]-(p:Policy)<-[:PART_OF]-(c:Campaign)
      RETURN avg(toFloat(c.progress)) AS projectProgress
    `,
      partyId === "all" ? {} : { partyId: Number(partyId) }
    );
    projectProgress = projectRes.records[0]?.get("projectProgress") || 0;

    const specialRes = await session.run(`
      MATCH (c:SpecialCampaign)-[:CREATED_BY]->(party:Party)
      WHERE (c.size = 'ใหญ่' OR c.impact = 'สูง')
      ${partyId === "all" ? "" : "AND party.id = toInteger($partyId)"}
      RETURN avg(toFloat(c.progress)) AS specialProgress
    `, partyId === "all" ? {} : { partyId: Number(partyId) });
    specialProgress = specialRes.records[0]?.get("specialProgress") || 0;

    const topSpecialRes = await session.run(
      `
      MATCH (s:SpecialCampaign)-[:CREATED_BY]->(party:Party)
      ${partyId === "all" ? "" : "WHERE party.id = toInteger($partyId)"}
      RETURN s.id AS id, s.name AS name
      ORDER BY s.id DESC LIMIT 1
    `,
      partyId === "all" ? {} : { partyId: Number(partyId) }
    );

    const specialNode = topSpecialRes.records[0];
    if (specialNode) {
      const sid = specialNode.get("id")?.toNumber?.();
      const sname = specialNode.get("name");

      const pgRes = await pg.query(
        `SELECT allocated_budget FROM campaigns WHERE id = $1`,
        [sid]
      );

      const budget = pgRes.rows[0]?.allocated_budget;
      topSpecial = {
        id: sid,
        name: sname,
        allocated_budget: Number(budget || 0),
      };
    }
  } catch (err) {
    console.error("Failed in Neo4j:", err);
  } finally {
    await session.close();
  }

  const client = await pg.connect();

  try {
    const partyFilter = partyId === "all" ? "" : "WHERE party_id = $1";
    const partyParam = partyId === "all" ? [] : [partyId];

    const policyRes = await client.query(`SELECT * FROM policies ${partyFilter}`, partyParam);
    const policies = policyRes.rows;

    const campaignRes = await client.query(`SELECT * FROM campaigns ${partyFilter}`, partyParam);
    const campaigns = campaignRes.rows;

    const expenseRes = await client.query(`SELECT * FROM expenses`);
    const expenses = expenseRes.rows;

    const partiesRes = await client.query(
      `SELECT id, name FROM parties ${partyId === "all" ? "" : "WHERE id = $1"}`,
      partyParam
    );
    const parties = partiesRes.rows;

    const policyCount = policies.length;
    const campaignCount = campaigns.length;

    const totalBudget = policies.reduce((sum, p) => sum + Number(p.total_budget || 0), 0);
    const totalAllocated = campaigns.reduce((sum, c) => sum + Number(c.allocated_budget || 0), 0);
    const campaignIds = campaigns.map(c => c.id);
    const totalExpense = expenses
      .filter(e => campaignIds.includes(e.campaign_id))
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const netBudget = totalAllocated - totalExpense;

    const topPolicy = [...policies].sort((a, b) => Number(b.total_budget) - Number(a.total_budget))[0] || null;

    const top3Policies = [...policies]
      .sort((a, b) => Number(b.total_budget) - Number(a.total_budget))
      .slice(0, 3);

    const top3Campaigns = [...campaigns]
      .filter(c => c.policy_id !== null)
      .sort((a, b) => Number(b.allocated_budget) - Number(a.allocated_budget))
      .slice(0, 3);

    return NextResponse.json({
      policies,
      campaigns,
      expenses,
      parties,
      policyCount,
      campaignCount,
      totalBudget,
      totalAllocated,
      totalExpense,
      netBudget,
      policyProgress,
      projectProgress,
      specialProgress,
      topPolicy,
      top3Policies,
      top3Campaigns,
      topSpecial,
    });
  } catch (err) {
    console.error("Dashboard API error:", err);
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  } finally {
    client.release();
  }
}
