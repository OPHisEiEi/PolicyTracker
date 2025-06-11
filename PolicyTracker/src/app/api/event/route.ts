import { NextRequest, NextResponse } from "next/server";
import driver from "@/app/lib/neo4j";

export async function GET(req: NextRequest) {
  const session = driver.session();

  try {
    const result = await session.run(`
      MATCH (e:Event)
      OPTIONAL MATCH (e)-[:ORGANIZED_BY]->(p:Party)
      RETURN 
        e.id AS id,
        e.name AS name,
        e.description AS description,
        e.date AS date,
        e.location AS location,
        p.name AS partyName,
        p.id AS partyId
      ORDER BY e.date DESC
    `);

    const events = result.records.map((r) => ({
      id: typeof r.get("id")?.toNumber === "function" ? r.get("id").toNumber() : r.get("id"),
      name: r.get("name") ?? "",
      description: r.get("description") ?? "",
      date: r.get("date") ?? "",
      location: r.get("location") ?? "",
      party: r.get("partyName") ?? null,
      partyId: r.get("partyId")?.toNumber?.() ?? null,
    }));

    return NextResponse.json(events);
  } catch (err) {
    console.error("Neo4j error:", err);
    return NextResponse.json({ error: "ไม่สามารถโหลดข้อมูลกิจกรรมได้" }, { status: 500 });
  } finally {
    await session.close();
  }
}