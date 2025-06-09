import { NextRequest, NextResponse } from "next/server";
import driver from "@/app/lib/neo4j";
import pg from "@/app/lib/postgres";
import { storage } from "@/app/lib/firebase";
import { ref, deleteObject, listAll } from "firebase/storage";

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const idNumber = parseInt(id);
  if (isNaN(idNumber)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const session = driver.session();
  try {
    const campaignResult = await pg.query(
      `SELECT c.id, c.name, c.policy_id, c.allocated_budget, p.name as policy, c.area, c.impact, c.size
       FROM campaigns c
       LEFT JOIN policies p ON c.policy_id = p.id
       WHERE c.id = $1`,
      [idNumber]
    );

    if (campaignResult.rows.length === 0) {
      return NextResponse.json({ error: "ไม่พบโครงการ" }, { status: 404 });
    }

    const campaign = campaignResult.rows[0];
    const policyName = campaign.policy ?? "";

    const neoResult = await session.run(
      `
      MATCH (c)
      WHERE (c:Campaign OR c:SpecialCampaign) AND c.id = toInteger($id)
      RETURN labels(c) AS labels, 
             c.name AS name, 
             c.description AS description, 
             c.status AS status, 
             c.progress AS progress, 
             c.area AS area, 
             c.impact AS impact, 
             c.size AS size
      `,
      { id: idNumber }
    );

    const neo = neoResult.records[0];
    if (!neo) return NextResponse.json({ error: "ไม่พบโครงการใน Neo4j" }, { status: 404 });

    const labels: string[] = neo.get("labels");
    const isSpecial = labels.includes("SpecialCampaign");

    const name = neo.get("name") ?? campaign.name;
    const description = neo.get("description") ?? "";
    const status = neo.get("status") ?? "";
    const progress = neo.get("progress") ?? 0;
    const area = neo.get("area") ?? campaign.area ?? "เขตเดียว";
    const impact = neo.get("impact") ?? campaign.impact ?? "ต่ำ";
    const size = neo.get("size") ?? campaign.size ?? "เล็ก";

    const expensesResult = await pg.query(
      `SELECT description, amount FROM expenses WHERE campaign_id = $1`,
      [idNumber]
    );

    return NextResponse.json({
      id: campaign.id,
      name,
      policy: isSpecial ? "โครงการพิเศษ" : policyName,
      policyId: isSpecial ? null : campaign.policy_id,
      description,
      status,
      progress,
      budget: campaign.allocated_budget,
      area,
      impact,
      size,
      expenses: expensesResult.rows,
      isSpecial,
    });
  } catch (err) {
    console.error("GET error:", err);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  } finally {
    await session.close();
  }
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const idNumber = parseInt(id);
  if (isNaN(idNumber)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const session = driver.session();
  const idStr = String(idNumber);

  try {
    try {
      const pdfRef = ref(storage, `campaign/reference/${idStr}.pdf`);
      await deleteObject(pdfRef);
    } catch { }

    try {
      const folderRef = ref(storage, `campaign/picture/${idStr}`);
      const result = await listAll(folderRef);
      await Promise.all(result.items.map((item) => deleteObject(item)));
    } catch { }

    await session.run(
      `MATCH (c) WHERE (c:Campaign OR c:SpecialCampaign) AND c.id = $id DETACH DELETE c`,
      { id: idNumber }
    );

    await pg.query(`DELETE FROM expenses WHERE campaign_id = $1`, [idNumber]);
    await pg.query(`DELETE FROM campaigns WHERE id = $1`, [idNumber]);

    return NextResponse.json({ message: "ลบโครงการสำเร็จ" });
  } catch (err) {
    console.error("DELETE error:", err);
    return NextResponse.json({ error: "ลบโครงการไม่สำเร็จ" }, { status: 500 });
  } finally {
    await session.close();
  }
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const idNumber = parseInt(id);
  if (isNaN(idNumber)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const {
    name,
    description,
    status,
    policyId,
    partyId,
    budget,
    expenses,
    area,
    impact,
    size,
  } = await req.json();

  const progressMap: Record<string, number> = {
    "เริ่มโครงการ": 20,
    "วางแผน": 40,
    "ตัดสินใจ": 60,
    "ดำเนินการ": 80,
    "ประเมินผล": 100,
  };
  const progress = progressMap[status] ?? 0;
  const isSpecial = policyId === null;

  const session = driver.session();

  try {
    if (isSpecial) {
      await session.run(
        `
       MATCH (c:SpecialCampaign {id: $id})
  WITH c, labels(c) AS lbls
  FOREACH (_ IN CASE WHEN 'Campaign' IN lbls THEN [1] ELSE [] END | REMOVE c:Campaign)
  FOREACH (_ IN CASE WHEN 'SpecialCampaign' NOT IN lbls THEN [1] ELSE [] END | SET c:SpecialCampaign)
  WITH c
  OPTIONAL MATCH (c)-[r:PART_OF]->()
  DELETE r
  WITH c
  OPTIONAL MATCH (c)-[r2:CREATED_BY]->()
  DELETE r2
  WITH c
  MATCH (party:Party {id: toInteger($partyId)})
  MERGE (c)-[:CREATED_BY]->(party)
  SET c.name = $name,
      c.description = $description,
      c.status = $status,
      c.progress = $progress,
      c.area = $area,
      c.impact = $impact,
      c.size = $size
  `,
        { id: idNumber, name, description, status, progress, area, impact, size, partyId }
      );
    } else {
      await session.run(
        `
        MATCH (c:Campaign {id: $id})
  WITH c, labels(c) AS lbls
  FOREACH (_ IN CASE WHEN 'SpecialCampaign' IN lbls THEN [1] ELSE [] END | REMOVE c:SpecialCampaign)
  FOREACH (_ IN CASE WHEN 'Campaign' NOT IN lbls THEN [1] ELSE [] END | SET c:Campaign)
  WITH c
  OPTIONAL MATCH (c)-[r:PART_OF]->()
  DELETE r
  WITH c
  OPTIONAL MATCH (c)-[r2:CREATED_BY]->()
  DELETE r2
  WITH c
  MATCH (p:Policy {id: toInteger($policyId)})
  MATCH (party:Party {id: toInteger($partyId)})
  MERGE (c)-[:PART_OF]->(p)
  MERGE (c)-[:CREATED_BY]->(party)
  SET c.name = $name,
      c.description = $description,
      c.status = $status,
      c.progress = $progress,
      c.area = $area,
      c.impact = $impact,
      c.size = $size
  `,
        { id: idNumber, policyId, name, description, status, progress, area, impact, size, partyId }
      );
    }

    await pg.query(
      `UPDATE campaigns SET allocated_budget = $1, name = $2, area = $3, impact = $4, size = $5 WHERE id = $6`,
      [budget, name, area, impact, size, idNumber]
    );

    await pg.query(`DELETE FROM expenses WHERE campaign_id = $1`, [idNumber]);

    if (Array.isArray(expenses)) {
      for (const exp of expenses) {
        const amount = Number(exp.amount);
        if (exp.description && !isNaN(amount)) {
          await pg.query(
            `INSERT INTO expenses (campaign_id, description, amount, category)
             VALUES ($1, $2, $3, $4)`,
            [idNumber, exp.description, amount, "ไม่ระบุ"]
          );
        }
      }
    }

    return NextResponse.json({ message: "แก้ไขโครงการสำเร็จ" });
  } catch (err) {
    console.error("PUT error:", err);
    return NextResponse.json({ error: "ไม่สามารถแก้ไขโครงการได้" }, { status: 500 });
  } finally {
    await session.close();
  }
}
