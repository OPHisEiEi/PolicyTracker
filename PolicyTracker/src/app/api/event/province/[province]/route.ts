import { NextRequest, NextResponse } from "next/server";
import driver from "@/app/lib/neo4j";

export async function GET(
  req: NextRequest,
  context: { params: { province: string } }
) {
  const { province } = await context.params;
  const decodedProvince = decodeURIComponent(province);
  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (e:Event)-[:LOCATED_IN]->(p:Province {name: $province})
      OPTIONAL MATCH (e)-[:ORGANIZED_BY]->(party:Party)
      RETURN e.name AS name,
             e.description AS description,
             e.date AS date,
             e.time AS time,
             e.location AS location,
             party.name AS party
      ORDER BY e.date DESC
      `,
      { province }
    );

    const events = result.records.map((record) => ({
      name: record.get("name"),
      description: record.get("description"),
      date: record.get("date"),
      time: record.get("time"),
      location: record.get("location"),
      party: record.get("party"),
    }));

    return NextResponse.json(events);
  } catch (err) {
    console.error("Neo4j Error:", err);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดระหว่างโหลดกิจกรรมจากจังหวัด" }, { status: 500 });
  } finally {
    await session.close();
  }
}
