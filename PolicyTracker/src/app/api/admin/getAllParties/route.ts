import { NextResponse } from "next/server";
import driver from "@/app/lib/neo4j";

export async function GET() {
  const session = driver.session();
  try {
    const result = await session.run(`
      MATCH (p:Party)
      RETURN p.id AS id, p.name AS name
      ORDER BY name
    `);

    const parties = result.records.map((r) => ({
      id: r.get("id")?.toNumber?.() ?? null,
      name: r.get("name"),
    }));

    return NextResponse.json(parties);
  } catch (err) {
    console.error("Error fetching parties:", err);
    return NextResponse.json({ error: "Failed to load party names" }, { status: 500 });
  } finally {
    await session.close();
  }
}
