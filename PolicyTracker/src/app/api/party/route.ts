import { NextRequest, NextResponse } from "next/server";
import driver from "@/app/lib/neo4j";

export async function GET(req: NextRequest) {
  const session = driver.session();
  try {
    const result = await session.run(`
      MATCH (p:Party)
      RETURN p.id AS id, p.name AS name, p.description AS description, p.link AS link, p.logo AS logo
    `);

    const parties = result.records.map((r) => ({
      id: r.get("id")?.toNumber?.() ?? null,
      name: r.get("name"),
      description: r.get("description"),
      link: r.get("link"),
      logo: r.get("logo"),
    }));

    return NextResponse.json(parties);
  } catch (err) {
    console.error("Neo4j error:", err);
    return NextResponse.json({ error: "ไม่สามารถโหลดข้อมูลพรรคได้" }, { status: 500 });
  } finally {
    await session.close();
  }
}
