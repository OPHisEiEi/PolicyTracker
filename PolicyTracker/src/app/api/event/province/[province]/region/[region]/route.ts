import { NextRequest, NextResponse } from "next/server";
import driver from "@/app/lib/neo4j";

export async function GET(
  req: NextRequest,
  context: { params: { province: string; region: string } }
) {
  const { province, region } = await context.params;
  const decodedProvince = decodeURIComponent(province);
  const decodedRegion = decodeURIComponent(region);

  const session = driver.session();
  try {
    const result = await session.run(
      `
      MATCH (e:Event)-[:LOCATED_IN]->(p:Province {name: $province})
      WHERE EXISTS {
        MATCH (p)-[:IN_REGION]->(r:Region {name: $region})
      }
      OPTIONAL MATCH (e)-[:ORGANIZED_BY]->(party:Party)
      RETURN 
        e.id AS id,
        e.name AS name,
        e.description AS description,
        e.date AS date,
        e.time AS time,
        e.location AS location,
        party.name AS party,
        party.id AS partyId,
        $province AS province,
        $region AS region
      ORDER BY e.date DESC
      `,
      { province: decodedProvince, region: decodedRegion }
    );

    const events = result.records.map((record) => ({
      id:
        typeof record.get("id")?.toNumber === "function"
          ? record.get("id").toNumber()
          : record.get("id"),
      name: record.get("name") ?? "",
      description: record.get("description") ?? "",
      date: record.get("date") ?? "",
      time: record.get("time") ?? "",
      location: record.get("location") ?? "",
      party: record.get("party") ?? null,
      partyId:
        typeof record.get("partyId")?.toNumber === "function"
          ? record.get("partyId").toNumber()
          : record.get("partyId") ?? null,
      province: record.get("province") ?? decodedProvince,
      region: record.get("region") ?? decodedRegion,
    }));

    return NextResponse.json(events);
  } catch (err) {
    console.error("Neo4j Error:", err);
    return NextResponse.json(
      { error: "ไม่สามารถโหลดกิจกรรมจากจังหวัดและภาคนี้ได้" },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}