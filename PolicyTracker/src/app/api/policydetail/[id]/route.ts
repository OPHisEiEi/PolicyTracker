import { NextRequest, NextResponse } from "next/server";
import driver from "@/app/lib/neo4j";
import neo4j from "neo4j-driver";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id?: string }> }
) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing id param" }, { status: 400 });
  }
  const decodedId = decodeURIComponent(id);
  const pid = neo4j.int(parseInt(decodedId, 10));

  const session = driver.session();
  try {
    const nameResult = await session.run(
      `
      MATCH (p:Policy { id: $pid })
      RETURN p.name AS name
      `,
      { pid }
    );
    if (nameResult.records.length === 0) {
      return NextResponse.json({ error: "ไม่พบข้อมูลนโยบาย" }, { status: 404 });
    }
    const policyName = nameResult.records[0].get("name");

    const result = await session.run(
      `
      MATCH (p:Policy { name: $name })
      OPTIONAL MATCH (c:Campaign)-[:PART_OF]->(p)
      OPTIONAL MATCH (p)-[:BELONGS_TO]->(party:Party)
      WITH p,
        collect({
          id: toString((c.id)),
          name: c.name,
          description: c.description
        }) AS relatedProjects,
        party
      RETURN {
        name: p.name,
        description: p.description,
        status: p.status,
        relatedProjects: relatedProjects,
        party: CASE
          WHEN party IS NOT NULL THEN {
          id: toString(party.id),
            name: party.name,
            description: party.description,
            link: party.link
          }
          ELSE null END
      } AS policy
      `,
      { name: policyName }
    );

    if (result.records.length === 0) {
      return NextResponse.json({ error: "ไม่พบข้อมูลนโยบาย" }, { status: 404 });
    }

    const policy = result.records[0].get("policy");
    return NextResponse.json(policy);
  } catch (err) {
    console.error("Neo4j Error:", err);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}
