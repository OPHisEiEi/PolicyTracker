import { NextRequest, NextResponse } from "next/server";
import driver from "@/app/lib/neo4j";
import pool from "@/app/lib/postgres";
import neo4j from "neo4j-driver";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "id ไม่ถูกต้อง" }, { status: 400 });
  }

  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (p:Party {id: $id})
       RETURN p.id AS id, p.name AS name, p.description AS description, p.link AS link`,
      { id: neo4j.int(id) }
    );

    if (result.records.length === 0) {
      return NextResponse.json({ error: "ไม่พบพรรค" }, { status: 404 });
    }
    const rec = result.records[0];
    const party = {
      id: rec.get("id").toNumber(),
      name: rec.get("name"),
      description: rec.get("description"),
      link: rec.get("link"),
    };
    return NextResponse.json(party);
  } catch (err: any) {
    console.error("/api/admin/party/[id] GET error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: (err as any).message ?? "อัปเดตไม่สำเร็จ" }, { status: 500 });
  } finally {
    await session.close();
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const { id: idStr } = await context.params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "id ไม่ถูกต้อง" }, { status: 400 });
  }

  const body = await request.json();
  const { name, description, link } = body;

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "กรุณาใส่ชื่อพรรคให้ถูกต้อง" }, { status: 400 });
  }
  if (description && typeof description !== "string") {
    return NextResponse.json({ error: "คำอธิบายต้องเป็นข้อความ" }, { status: 400 });
  }
  if (link && typeof link !== "string") {
    return NextResponse.json({ error: "ลิงก์ต้องเป็นข้อความ" }, { status: 400 });
  }

  const pgClient = await pool.connect();
  const neoSession = driver.session();
  try {
    await pgClient.query(
      `UPDATE parties 
         SET name = $1,
             description = $2,
             link = $3
       WHERE id = $4`,
      [name.trim(), description || "", link || "", id]
    );

    await neoSession.run(
      `MATCH (p:Party {id: $id})
       SET p.name = $name,
           p.description = $description,
           p.link = $link`,
      {
        id: neo4j.int(id),
        name,
        description: description || "",
        link: link || "",
      }
    );

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("/api/admin/party/[id] PUT error:", err instanceof Error ? err.message : err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  } finally {
    try { pgClient.release(); } catch (e) { console.error(e); }
    try { await neoSession.close(); } catch (e) { console.error(e); }
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "id ไม่ถูกต้อง" }, { status: 400 });
  }

  const pgClient = await pool.connect();
  const neoSession = driver.session();
  try {
    const res = await pgClient.query(`DELETE FROM parties WHERE id = $1 RETURNING *`, [id]);
    if (res.rowCount === 0) {
      return NextResponse.json({ error: "ไม่พบพรรคในฐานข้อมูล" }, { status: 404 });
    }

    await neoSession.run(
      `MATCH (p:Party {id: $id}) DETACH DELETE p`,
      { id: neo4j.int(id) }
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("/api/admin/party/[id] DELETE error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "ลบไม่สำเร็จ" }, { status: 500 });
  } finally {
    pgClient.release();
    await neoSession.close();
  }
}
