import { NextResponse } from "next/server";
import { getDocs, collection, query, orderBy } from "firebase/firestore";
import { firestore } from "@/app/lib/firebase";

export async function GET() {
  try {
    const q = query(collection(firestore, "users"), orderBy("displayName"));
    const snapshot = await getDocs(q);

    const users = snapshot.docs.map((doc) => ({
      uid: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(users);
  } catch (err) {
    console.error("Error fetching users:", err);
    return NextResponse.json({ error: "โหลดข้อมูลผู้ใช้ไม่สำเร็จ" }, { status: 500 });
  }
}
