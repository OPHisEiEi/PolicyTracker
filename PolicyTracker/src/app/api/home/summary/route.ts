import { NextRequest, NextResponse } from "next/server";
import driver from "@/app/lib/neo4j";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);  
  const party = url.searchParams.get("party");

  const session = driver.session();
  try {
    const res = await session.run(
      `
      MATCH (p:Policy)-[:BELONGS_TO]->(party:Party)
      ${party ? "WHERE party.name = $party" : ""}
      OPTIONAL MATCH (p)<-[:PART_OF]-(c:Campaign)
      WITH
        avg(p.progress) AS policyProgress,
        avg(c.progress) AS projectProgress,
        count(c) AS totalProjects,
        avg(CASE WHEN c.type = "โครงการพิเศษ" THEN c.progress ELSE NULL END) AS specialProgress
      RETURN policyProgress, projectProgress, totalProjects, specialProgress
    `,
      party ? { party } : {}
    );

    const record = res.records[0];
    return NextResponse.json({
      policyProgress: record.get("policyProgress") || 0,
      projectProgress: record.get("projectProgress") || 0,
      totalProjects: record.get("totalProjects") || 0,
      specialProgress: record.get("specialProgress") || 0,
    });
  } catch (e) {
    console.error("Neo4j error:", e);
    return NextResponse.json({ error: "Fetch summary failed" }, { status: 500 });
  } finally {
    await session.close();
  }
}
