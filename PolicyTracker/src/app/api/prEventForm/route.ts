import { NextRequest, NextResponse } from "next/server";
import driver from "@/app/lib/neo4j";
import { provinceToRegion } from "@/app/lib/provinceRegions";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}

export async function GET(req: NextRequest) {
  const partyId = req.nextUrl.searchParams.get("party");
  const policy = req.nextUrl.searchParams.get("policy");

  const session = driver.session();
  try {
    if (partyId) {
      const result = await session.run(
        `
        MATCH (p:Party {id: toInteger($partyId)})<-[:BELONGS_TO]-(policy:Policy)
        RETURN policy.name AS name
        `,
        { partyId: parseInt(partyId) }
      );
      const policies = result.records.map((r) => r.get("name"));
      return NextResponse.json({ policies });
    } else if (policy) {
      const result = await session.run(
        `
        MATCH (c:Campaign)-[:PART_OF]->(:Policy {name: $policy})
        RETURN c.name AS name
        `,
        { policy }
      );
      const campaigns = result.records.map((r) => r.get("name"));
      return NextResponse.json({ campaigns });
    } else {
      return NextResponse.json(
        { error: "กรุณาระบุ query ?party= หรือ ?policy=" },
        { status: 400 }
      );
    }
  } catch (err) {
    console.error("Neo4j error:", err);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์" }, { status: 500 });
  } finally {
    await session.close();
  }
}

export async function POST(req: NextRequest) {
  const {
    name,
    description,
    date,
    time,
    location,
    map,
    policy,
    partyId,
    province,
    campaign,
    status,
  } = await req.json();

  const region = provinceToRegion[province];
  if (!region) {
    return NextResponse.json({ error: "ไม่พบภาคของจังหวัดนี้" }, { status: 400 });
  }

  const session = driver.session();

  try {
    const check = await session.run(
      `MATCH (e:Event {name: $name}) RETURN e LIMIT 1`,
      { name }
    );
    if (check.records.length > 0) {
      return NextResponse.json({ error: "มีชื่อกิจกรรมนี้อยู่แล้ว กรุณาใช้ชื่ออื่น" }, { status: 400 });
    }

    const maxIdResult = await session.run(`MATCH (e:Event) RETURN MAX(e.id) AS maxId`);
    const maxIdRecord = maxIdResult.records[0];
    const nextId = (maxIdRecord?.get("maxId")?.toNumber?.() || 0) + 1;

    const result = await session.run(
      `
      CREATE (e:Event {
        id: toInteger($id),
        name: $name,
        description: $description,
        date: $date,
        time: $time,
        location: $location,
        map: $map,
        status: $status
      })
      MERGE (prov:Province {name: $province})
      MERGE (reg:Region {name: $region})
      MERGE (prov)-[:IN_REGION]->(reg)
      MERGE (e)-[:LOCATED_IN]->(prov)

      WITH e
      OPTIONAL MATCH (p:Policy {name: $policy})
      OPTIONAL MATCH (pt:Party {id: toInteger($partyId)})
      OPTIONAL MATCH (c:Campaign {name: $campaign})

      FOREACH (_ IN CASE WHEN p IS NOT NULL THEN [1] ELSE [] END |
        MERGE (e)-[:RELATED_POLICY]->(p)
      )

      FOREACH (_ IN CASE WHEN pt IS NOT NULL THEN [1] ELSE [] END |
        MERGE (e)-[:ORGANIZED_BY]->(pt)
      )

      FOREACH (_ IN CASE WHEN c IS NOT NULL THEN [1] ELSE [] END |
        MERGE (e)-[:UNDER_CAMPAIGN]->(c)
      )

      RETURN e.name AS name, e.id AS id
      `,
      {
        id: nextId,
        name,
        description,
        date,
        time,
        location,
        map,
        policy,
        partyId,
        province,
        campaign,
        region,
        status,
      }
    );

    const record = result.records[0];
    if (!record) {
      return NextResponse.json({ error: "สร้างกิจกรรมไม่สำเร็จ: ไม่พบ ID" }, { status: 500 });
    }

    const rawId = record.get("id");
    const newEventId = typeof rawId?.toNumber === "function" ? rawId.toNumber() : rawId;

    return NextResponse.json({ message: "สร้างกิจกรรมสำเร็จ", id: newEventId });
  } catch (err) {
    console.error("Neo4j error:", err);
    return new NextResponse(JSON.stringify({ error: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์" }), {
      status: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  } finally {
    await session.close();
  }
}

export async function PUT(req: NextRequest) {
  const {
    id, name, description, date, time, location,
    map, province, policy, partyId, campaign, status
  } = await req.json();

  const session = driver.session();
  try {
    const region = provinceToRegion[province];
    if (!region) {
      return NextResponse.json({ error: "ไม่พบภาคของจังหวัดนี้" }, { status: 400 });
    }

    await session.run(
      `
      MATCH (e:Event {id: toInteger($id)})
      SET e.name = $name,
          e.description = $description,
          e.date = $date,
          e.time = $time,
          e.location = $location,
          e.map = $map,
          e.status = $status
      `,
      { id, name, description, date, time, location, map, status }
    );

    await session.run(
      `
      MATCH (e:Event {id: toInteger($id)})
      OPTIONAL MATCH (e)-[r1:RELATED_POLICY]->()
      OPTIONAL MATCH (e)-[r2:UNDER_CAMPAIGN]->()
      OPTIONAL MATCH (e)-[r3:LOCATED_IN]->()
      DELETE r1, r2, r3
      `,
      { id }
    );

    if (policy) {
      await session.run(
        `
        MATCH (e:Event {id: toInteger($id)}), (p:Policy {name: $policy})
        MERGE (e)-[:RELATED_POLICY]->(p)
        `,
        { id, policy }
      );
    }

    if (campaign && campaign.trim() !== "") {
      await session.run(
        `
        MATCH (e:Event {id: toInteger($id)}), (c:Campaign {name: $campaign})
        MERGE (e)-[:UNDER_CAMPAIGN]->(c)
        `,
        { id, campaign }
      );
    }

    if (province && region) {
      await session.run(
        `
        MATCH (e:Event {id: toInteger($id)})
        MERGE (prov:Province {name: $province})
        MERGE (reg:Region {name: $region})
        MERGE (prov)-[:IN_REGION]->(reg)
        MERGE (e)-[:LOCATED_IN]->(prov)
        `,
        { id, province, region }
      );
    }

    return NextResponse.json({ message: "แก้ไขกิจกรรมสำเร็จ" });
  } catch (err) {
    console.error("PUT error:", err);
    return NextResponse.json({ error: "ไม่สามารถแก้ไขกิจกรรมได้" }, { status: 500 });
  } finally {
    await session.close();
  }
}

