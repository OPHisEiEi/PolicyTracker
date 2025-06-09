"use server";

import { NextResponse } from 'next/server';
import neo4j, { int, isInt } from 'neo4j-driver';
import driver from '@/app/lib/neo4j';
import { createClient } from 'redis';

const redis = createClient({ url: process.env.REDIS_URL });
try {
  await redis.connect();
  console.log("Redis connected");
} catch (err) {
  console.error("Redis connect error:", err);
}

const RATE_LIMIT_WINDOW = 5 * 1000;
const MAX_GET_REQUESTS = 100;
const MAX_POST_REQUESTS = 5;
const LIKE_COOLDOWN = 1 * 1000;


async function safeGet(key: string): Promise<string | null> {
  try {
    return await redis.get(key);
  } catch (err) {
    console.error(`Redis GET error for ${key}:`, err);
    return null;
  }
}


async function safeSet(key: string, value: string, EX: number) {
  try {
    await redis.set(key, value, { EX });
  } catch (err) {
    console.error(`Redis SET error for ${key}:`, err);
  }
}

async function safeIncr(key: string) {
  try {
    await redis.incr(key);
  } catch (err) {
    console.error(`Redis INCR error for ${key}:`, err);
  }
}

async function checkRateLimit(ip: string, method: string): Promise<boolean> {
  const key = `rate_limit:${method}:${ip}`;
  const current = await safeGet(key);

  const limit = method === 'GET' ? MAX_GET_REQUESTS : MAX_POST_REQUESTS;

  if (!current) {
    await safeSet(key, "1", Math.floor(RATE_LIMIT_WINDOW / 1000));
    return true;
  }

  const count = parseInt(current);
  if (count >= limit) {
    return false;
  }

  await safeIncr(key);
  return true;
}


async function checkLikeCooldown(fingerprint: string): Promise<boolean> {
  const key = `cooldown:${fingerprint}`;
  const exists = await safeGet(key);
  return !exists;
}

async function setLikeCooldown(fingerprint: string): Promise<void> {
  const key = `cooldown:${fingerprint}`;
  await safeSet(key, "1", Math.floor(LIKE_COOLDOWN / 1000));
}


function getClientInfo(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(',')[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const ua = request.headers.get("user-agent") || "unknown";
  const timestamp = new Date().toISOString();

  return { ip, ua, timestamp };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const fingerprint = url.searchParams.get('fingerprint');
  const { ip } = getClientInfo(request);
  if (!id) {
    return NextResponse.json({ error: 'Missing policy id' }, { status: 400 });
  }

  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (p:Policy { id: $pid }) RETURN p.like AS like`,
      { pid: neo4j.int(parseInt(id)) }
    );

    let likeCount = 0;
    if (result.records.length > 0) {
      const raw = result.records[0].get('like');
      likeCount = isInt(raw) ? raw.toNumber() : (raw as number) || 0;
    }

    let isLiked = false;
    if (fingerprint) {
      const cacheKey = `liked:${fingerprint}:${id}`;
      const cached = await redis.get(cacheKey);

      if (cached) {
        isLiked = true;
      } else {
        const check = await session.run(
          `MATCH (f:Fingerprint { id: $fp })-[:LIKED]->(p:Policy { id: $pid }) RETURN COUNT(*) > 0 AS liked`,
          { fp: fingerprint, pid: neo4j.int(parseInt(id)) }
        );

        if (check.records.length > 0) {
          isLiked = check.records[0].get("liked");
          if (isLiked) {
            await redis.set(cacheKey, "true", { EX: 86400 });
          }
        }
      }
    }

    return NextResponse.json({ like: likeCount, isLiked });
  } catch (error) {
    console.error('GET /api/policylike error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  } finally {
    await session.close();
  }
}

export async function POST(request: Request) {
  const session = driver.session();
  const transaction = session.beginTransaction();

  try {
    const body = await request.json();
    const { id, fingerprint } = body as { id?: number; fingerprint?: string };
    const { ip, ua, timestamp } = getClientInfo(request);


    if (typeof id !== 'number' || !fingerprint || typeof fingerprint !== 'string') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    if (!(await checkRateLimit(ip, 'POST'))) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    if (!(await checkLikeCooldown(fingerprint))) {
      return NextResponse.json({ error: 'Please wait before liking again' }, { status: 429 });
    }

    const ipCheck = await transaction.run(
      `
      MATCH (p:Policy { id: $pid })<-[:LIKED]-(f:Fingerprint)
      WHERE f.ip = $ip AND f.id <> $fp
      RETURN COUNT(*) > 0 AS likedByOtherFingerprint
    `,
      { pid: neo4j.int(id), ip, fp: fingerprint }
    );

    if (ipCheck.records[0].get("likedByOtherFingerprint")) {
      await transaction.rollback();
      return NextResponse.json({ error: "Policy already liked from this network" }, { status: 403 });
    }

    const cacheKey = `liked:${fingerprint}:${id}`;
    const cached = await redis.get(cacheKey);
    let hasLiked = false;
    if (cached) {
      hasLiked = true;
    } else {
      const check = await transaction.run(
        `MATCH (f:Fingerprint { id: $fp })-[r:LIKED]->(p:Policy { id: $pid }) RETURN COUNT(r) AS count`,
        { fp: fingerprint, pid: neo4j.int(id) }
      );
      hasLiked = check.records[0].get('count').toInt() > 0;
    }

    const suspiciousCheck = await transaction.run(
      `
      MATCH (f:Fingerprint { id: $fp })-[r:LIKED]->(:Policy)
      WHERE r.timestamp > datetime() - duration('PT1H')
      RETURN COUNT(r) AS recentLikes
    `,
      { fp: fingerprint }
    );

    const recentLikes = suspiciousCheck.records[0].get('recentLikes').toInt();
    if (recentLikes > 20) {
      await transaction.rollback();
      return NextResponse.json({ error: "Suspicious activity detected" }, { status: 403 });
    }

    if (hasLiked) {
      await transaction.run(
        `
        MATCH (f:Fingerprint { id: $fp })-[r:LIKED]->(p:Policy { id: $pid })
        DELETE r
        SET p.like = CASE WHEN coalesce(p.like, 0) - 1 < 0 THEN 0 ELSE p.like - 1 END
        RETURN p.like AS newCount
      `,
        { fp: fingerprint, pid: neo4j.int(id) }
      );
      await redis.del(cacheKey);
      await transaction.run(
        `
        CREATE (l:LikeLog {
          action: 'unlike',
          policyId: $pid,
          fingerprint: $fp,
          ip: $ip,
          userAgent: $ua,
          timestamp: datetime()
        })
      `,
        { pid: neo4j.int(id), fp: fingerprint, ip, ua }
      );
    } else {
      await transaction.run(
        `
  MATCH (f1:Fingerprint)-[r:LIKED]->(p:Policy {id: $pid})
  WHERE f1.ip = $ip AND f1.id <> $fp
  DELETE r
  `,
        { pid: neo4j.int(id), ip, fp: fingerprint }
      );

      await transaction.run(
        `
        MERGE (f:Fingerprint { id: $fp })
        ON CREATE SET f.createdAt = datetime(), f.likeCount = 0
        MERGE (p:Policy { id: $pid })
        ON CREATE SET p.like = 0
        SET f.ip = $ip, 
            f.ua = $ua, 
            f.lastActivity = datetime(),
            f.likeCount = coalesce(f.likeCount, 0) + 1,
            p.like = coalesce(p.like, 0) + 1
        MERGE (f)-[:LIKED { 
          ip: $ip, 
          timestamp: datetime(), 
          ua: $ua 
        }]->(p)
      `,
        { fp: fingerprint, pid: neo4j.int(id), ip, ua }
      );
      await redis.set(cacheKey, "true", { EX: 86400 });
      await setLikeCooldown(fingerprint);
      await transaction.run(
        `
        CREATE (l:LikeLog {
          action: 'like',
          policyId: $pid,
          fingerprint: $fp,
          ip: $ip,
          userAgent: $ua,
          timestamp: datetime()
        })
      `,
        { pid: neo4j.int(id), fp: fingerprint, ip, ua }
      );
    }

    await transaction.commit();

    const result = await session.run(
      `
  MATCH (p:Policy {id: $pid})
  OPTIONAL MATCH (:Fingerprint)-[r:LIKED]->(p)
  WITH p, count(r) AS realLike
  SET p.like = realLike
  RETURN p.like AS like
  `,
      { pid: neo4j.int(id) }
    );

    const raw = result.records[0].get('like');
    const newCount = isInt(raw) ? raw.toNumber() : (raw as number) || 0;


    return NextResponse.json({
      like: newCount,
      action: hasLiked ? 'unliked' : 'liked'
    });


  } catch (err) {
    console.error("/api/policylike error:", err);
    try {
      await transaction.rollback();
    } catch (rollbackErr) {
      console.error("Rollback failed:", rollbackErr);
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await session.close();
  }
}

