import { NextRequest, NextResponse } from "next/server";
import driver from "@/app/lib/neo4j";

export async function GET(req: NextRequest) {
  const session = driver.session();

  try {
    const result = await session.run(
      `MATCH (party:Party) RETURN party.name AS name ORDER BY party.name`
    );

    const parties = result.records.map((record) => {
      const name = record.get("name");
      return typeof name === 'string' ? name : String(name || "");
    }).filter(name => name.length > 0);

    console.log("Parties fetched:", parties);
    return NextResponse.json(parties);

  } catch (err) {
    console.error("Error fetching parties:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    await session.close();
  }
}
