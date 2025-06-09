// "use server";
// import { NextResponse } from "next/server";
// import neo4j, { int, isInt } from "neo4j-driver";
// import driver from "@/app/lib/neo4j";

// export async function GET(request: Request) {
//   const url = new URL(request.url);
//   const idParam = url.searchParams.get("id");

//   if (!idParam) {
//     return NextResponse.json({ error: "Missing campaign id" }, { status: 400 });
//   }

//   const id = int(parseInt(idParam, 10));
//   const session = driver.session();

//   try {
//     const result = await session.run(
//       `
//         MATCH (c:Campaign { id: $id })
//         RETURN c.like AS like
//       `,
//       { id }
//     );

//     let likeCount = 0;
//     if (result.records.length > 0) {
//       const raw = result.records[0].get("like");
//       likeCount = isInt(raw) ? raw.toNumber() : (raw as number) || 0;
//     }

//     return NextResponse.json({ like: likeCount });
//   } catch (error) {
//     console.error("GET /api/campaigndetaillike error:", error);
//     return NextResponse.json({ error: "Internal error" }, { status: 500 });
//   } finally {
//     await session.close();
//   }
// }

// export async function POST(request: Request) {
//   const body = await request.json();
//   const { id: rawId, action } = body as { id?: number; action?: string };

//   if (!rawId || !action || !["increment", "decrement"].includes(action)) {
//     return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
//   }

//   const id = int(rawId);
//   const delta = action === "increment" ? 1 : -1;

//   const session = driver.session();
//   try {
//     const result = await session.run(
//       `
//         MATCH (c:Campaign { id: $id })
//         SET c.like = coalesce(c.like, 0) + $delta
//         RETURN c.like AS like
//       `,
//       { id, delta: int(delta) }
//     );

//     const raw = result.records[0].get("like");
//     const newCount = isInt(raw) ? raw.toNumber() : (raw as number) || 0;

//     return NextResponse.json({ like: newCount });
//   } catch (error) {
//     console.error("POST /api/campaigndetaillike error:", error);
//     return NextResponse.json({ error: "Internal error" }, { status: 500 });
//   } finally {
//     await session.close();
//   }
// }
