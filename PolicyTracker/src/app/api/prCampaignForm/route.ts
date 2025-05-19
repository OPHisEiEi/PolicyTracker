import { NextRequest, NextResponse } from "next/server";
import driver from "@/app/lib/neo4j";
import pg from "@/app/lib/postgres";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}

export async function POST(req: NextRequest) {
  
  const {
    name,
    description,
    status,
    policyId,
    partyId,
    banner,
    budget,
    expenses,
    area,
    impact,
    size,
  } = await req.json();
console.log("🎯 req.body =", { name, partyId, policyId });

  const session = driver.session();
  const client = await pg.connect();

  try {
    await client.query("BEGIN");

    const existing = await client.query("SELECT id FROM campaigns WHERE name = $1", [name]);
    if ((existing?.rowCount ?? 0) > 0) {
      await client.query("ROLLBACK");
      client.release();
      return new NextResponse(JSON.stringify({ error: "ชื่อโครงการนี้ถูกใช้ไปแล้ว" }), { status: 400 });
    }

    const progressMap: Record<string, number> = {
      "เริ่มโครงการ": 20,
      "วางแผน": 40,
      "ตัดสินใจ": 60,
      "ดำเนินการ": 80,
      "ประเมินผล": 100,
    };
    const progress = progressMap[status];
    const isSpecial = policyId === null;

    if (!partyId) throw new Error("❌ ต้องระบุ partyId");

    const partyRes = await client.query("SELECT name FROM parties WHERE id = $1", [partyId]);
    const partyName = partyRes.rows[0]?.name;
    if (!partyName) throw new Error("❌ ไม่พบชื่อพรรคจาก id");

    if (isSpecial) {
      const result = await client.query(
        `INSERT INTO campaigns (name, policy_id, allocated_budget, area, impact, size, created_at, party_id)
         VALUES ($1, NULL, $2, $3, $4, $5, NOW(), $6)
         RETURNING id`,
        [name, budget, area, impact, size, partyId]
      );

      const campaignId = result.rows[0]?.id;
      if (!campaignId) throw new Error("❌ สร้าง campaign พิเศษไม่สำเร็จ");

      await session.run(
        `MATCH (party:Party {id: toInteger($partyId)})
         CREATE (c:SpecialCampaign {
           id: toInteger($id),
           name: $name,
           description: $description,
           status: $status,
           progress: $progress,
           banner: $banner,
           area: $area,
           impact: $impact,
           size: $size
         })-[:BELONGS_TO]->(party)`,
        { id: campaignId, name, description, status, progress, banner, area, impact, size, partyId }
      );

      if (Array.isArray(expenses)) {
        for (const exp of expenses) {
          const amount = Number(exp.amount);
          if (exp.description && !isNaN(amount)) {
            await client.query(
              `INSERT INTO expenses (campaign_id, description, amount, category)
               VALUES ($1, $2, $3, $4)`,
              [campaignId, exp.description, amount, "ไม่ระบุ"]
            );
          }
        }
      }

      await client.query("COMMIT");
      client.release();
      return new NextResponse(JSON.stringify({ message: "สร้างโครงการพิเศษสำเร็จ", id: campaignId }), { status: 200 });
    }

    const campaignRes = await client.query(
      `INSERT INTO campaigns (name, policy_id, allocated_budget, area, impact, size, created_at, party_id)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
       RETURNING id`,
      [name, policyId, budget, area, impact, size, partyId]
    );

    const campaignId = campaignRes.rows[0]?.id;
    if (!campaignId) throw new Error("❌ สร้าง campaign ไม่สำเร็จ");

    await session.run(
      `
      MATCH (p:Policy {id: toInteger($policyId)})
      MATCH (party:Party {id: toInteger($partyId)})
      MERGE (c:Campaign {id: toInteger($id)})
      SET c.name = $name,
          c.description = $description,
          c.status = $status,
          c.progress = $progress,
          c.banner = $banner,
          c.area = $area,
          c.impact = $impact,
          c.size = $size
      MERGE (c)-[:PART_OF]->(p)
      MERGE (c)-[:CREATED_BY]->(party)
      `,
      { id: campaignId, name, description, status, progress, banner, area, impact, size, policyId, partyId }
    );

    if (Array.isArray(expenses)) {
      for (const exp of expenses) {
        const amount = Number(exp.amount);
        if (exp.description && !isNaN(amount)) {
          await client.query(
            `INSERT INTO expenses (campaign_id, description, amount, category)
             VALUES ($1, $2, $3, $4)`,
            [campaignId, exp.description, amount, "ไม่ระบุ"]
          );
        }
      }
    }

    await client.query("COMMIT");
    client.release();

    return new NextResponse(JSON.stringify({ message: "สร้างโครงการสำเร็จ", id: campaignId }), { status: 200 });
  } catch (err) {
    console.error("❌ Neo4j/PG Error:", err);
    await client.query("ROLLBACK");
    client.release();
    return new NextResponse(JSON.stringify({ error: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์" }), { status: 500 });
  } finally {
    await session.close();
  }
}


export async function GET(req: NextRequest) {
  const partyId = req.nextUrl.searchParams.get("party_id");
  if (!partyId) {
    return NextResponse.json([]);
  }

  const session = driver.session();

  try {
    const result = await session.run(
      `MATCH (p:Policy)-[:BELONGS_TO]->(:Party {id: toInteger($partyId)})
       RETURN p.id AS id, p.name AS name`,
      { partyId }
    );

    const policies = result.records.map((r) => ({
      id: r.get("id")?.toNumber?.() ?? null,
      name: r.get("name"),
    }));

    return NextResponse.json(policies);
  } catch (err) {
    console.error("Error fetching policies:", err);
    return NextResponse.json([], { status: 500 });
  } finally {
    await session.close();
  }
}

