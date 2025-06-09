import { NextRequest, NextResponse } from "next/server";
import driver from "@/app/lib/neo4j";

export async function POST(req: NextRequest) {
  const session = driver.session();
  try {
    const { partyId } = await req.json();
    if (partyId === undefined || partyId === null) {
      return NextResponse.json({ error: "Missing partyId" }, { status: 400 });
    }

    const query = `
      MATCH (e:Event)-[:ORGANIZED_BY]->(p:Party)
      WHERE p.id = toInteger($partyId)
      RETURN e.id AS id, e.name AS event_name, e.description AS event_des,
             e.date AS event_date, e.time AS event_time, e.location AS event_location,
             e.status AS event_status
    `;

    const result = await session.run(query, { partyId: parseInt(partyId) });

    const events = result.records
      .filter((record) => record.get("id"))
      .map((record) => ({
        id: record.get("id").toNumber(),
        event_name: record.get("event_name"),
        event_des: record.get("event_des"),
        event_date: record.get("event_date"),
        event_time: record.get("event_time"),
        event_location: record.get("event_location"),
        event_status: record.get("event_status"),
      }));

    return NextResponse.json(events);
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  } finally {
    await session.close();
  }
}

export async function GET() {
  return NextResponse.json({ message: "This API expects a POST request." });
}
