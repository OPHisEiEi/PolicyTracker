import { NextRequest, NextResponse } from "next/server";
import driver from "@/app/lib/neo4j";
import pool from "@/app/lib/postgres";
import neo4j from "neo4j-driver";

export async function GET() {
  const session = driver.session();

  try {
    const result = await session.run(`
      MATCH (p:Party)
      RETURN p.id AS id, p.name AS name, p.description AS description, p.link AS link
      ORDER BY p.id
    `);

    const parties = result.records.map((record) => ({
      id: record.get("id").toNumber?.() ?? record.get("id"),
      name: record.get("name"),
      description: record.get("description"),
      link: record.get("link"),
    }));

    return NextResponse.json(parties);
  } catch (err) {
    console.error("Error loading parties:", err);
    return NextResponse.json({ error: "โหลดข้อมูลพรรคไม่สำเร็จ" }, { status: 500 });
  } finally {
    await session.close();
  }
}

export async function POST(req: NextRequest) {
  const { name, description, link } = await req.json();
  const trimmedName = name.trim();

  const session = driver.session();
  const client = await pool.connect();

  try {

    const result = await client.query(
      "INSERT INTO public.parties (name) VALUES ($1) RETURNING id::int",
      [trimmedName]
    );
    const idRaw = result.rows[0].id;
    const id = parseInt(idRaw);


    await session.run(
      `
      CREATE (p:Party {
        id: $id,
        name: $name,
        description: $description,
        link: $link
      })
      `,
      {
        id: neo4j.int(id),
        name: trimmedName,
        description: description || "",
        link: link || "",
      }
    );

    return NextResponse.json({ id });
  } catch (err) {
    console.error("เพิ่มพรรคล้มเหลว:", err);
    return NextResponse.json({ error: "เพิ่มพรรคล้มเหลว" }, { status: 500 });
  } finally {
    await session.close();
    client.release();
  }
}
