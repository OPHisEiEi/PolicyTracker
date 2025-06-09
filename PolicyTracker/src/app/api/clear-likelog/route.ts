import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function GET() {
  try {
    const keys = await redis.keys("liked:*");

    if (keys.length === 0) {
      return NextResponse.json({ message: "ไม่มี key ที่จะลบ" });
    }

    const results = await Promise.all(keys.map(key => redis.del(key)));

    return NextResponse.json({
      message: `ลบ key สำเร็จ`,
      deletedCount: results.filter(Boolean).length,
    });
  } catch (err) {
    console.error("ลบ like log ล้มเหลว:", err);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
