import { NextRequest, NextResponse } from 'next/server'
import driver from '@/app/lib/neo4j'
import { storage } from '@/app/lib/firebase'
import { ref, getDownloadURL } from 'firebase/storage'
import pg from '@/app/lib/postgres'
import neo4j from "neo4j-driver";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id?: string }> }
) {
  
  const rawId = (await params).id;
  if (!rawId || isNaN(Number(rawId))) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const decodedId = decodeURIComponent(rawId);
  const cid = neo4j.int(parseInt(decodedId, 10));


  const session = driver.session()
  try {
    const result = await session.run(
      `
      MATCH (c:Campaign { id: $cid })-[:PART_OF]->(p:Policy)
      OPTIONAL MATCH (p)<-[:PART_OF]-(other:Campaign)
        WHERE other.id <> $cid
      WITH c, p, collect({ id: other.id, name: other.name, description: other.description }) AS relatedProjects

      OPTIONAL MATCH (p)-[:BELONGS_TO]->(party:Party)
      WITH c, p, relatedProjects, head(collect(party)) AS partyNode

      OPTIONAL MATCH (e:Event)-[:BELONGS_TO]->(p)
      WITH c, p, relatedProjects, partyNode,
           collect({ id: e.id, name: e.name, description: e.description }) AS relatedEvents

      RETURN {
  id:             toString(c.id),
  name:           c.name,
  description:    c.description,
  progress:       c.progress,
  status:         c.status,
  banner:         c.banner,
  like:           c.like,

  relatedProjects: [rp IN relatedProjects | {
    id: toString(rp.id),
    name: rp.name,
    description: rp.description
  }],

  policy: {
    id:          toString(p.id),
    name:        p.name,
    description: p.description,
    status:      p.status
  },

  party: CASE WHEN partyNode IS NULL THEN null ELSE {
    id:          toString(partyNode.id),
    name:        partyNode.name,
    description: partyNode.description,
    link:        partyNode.link
  } END,

  relatedEvents: [e IN relatedEvents | {
    id: toString(e.id),
    name: e.name,
    description: e.description
  }]
} AS campaign
      `,
      { cid }
    )

    if (result.records.length === 0) {
      return NextResponse.json({ error: `ไม่พบข้อมูลโครงการ id=${decodedId}` }, { status: 404 })
    }

    const campaign = result.records[0].get('campaign')

    const client = await pg.connect()
    try {
      const pgResult = await client.query(
        `SELECT allocated_budget FROM campaigns WHERE id = $1`,
        [decodedId]
      )

      const expenseResult = await client.query(
        `SELECT description, amount FROM expenses WHERE campaign_id = $1`,
        [decodedId]
      );

      const budget = pgResult.rows[0]?.allocated_budget || 0
      const expenses = expenseResult.rows || []

      return NextResponse.json({
        ...campaign,

        budget,
        expenses
      })
    } finally {
      client.release()
    }

  } catch (error: any) {
    console.error('Neo4j Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    await session.close()
  }
}