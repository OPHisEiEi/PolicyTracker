import { NextRequest, NextResponse } from "next/server";
import { doc, deleteDoc } from "firebase/firestore";
import { firestore } from "@/app/lib/firebase";
import { getAuth } from "firebase-admin/auth";
import { app } from "@/app/lib/firebase-admin";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { uid: string } }
) {
  const uid = params.uid;

  if (!uid) {
    return NextResponse.json({ error: "Missing uid" }, { status: 400 });
  }

  try {
    await deleteDoc(doc(firestore, "users", uid));

    try {
      await getAuth(app).deleteUser(uid);
    } catch (authErr: any) {
      if (authErr.code !== "auth/user-not-found") {
        throw authErr;
      }
    }

    return NextResponse.json({ message: "ลบสำเร็จ" });
  } catch (err) {
    console.error("Delete error:", err);
    return NextResponse.json({ error: "ลบไม่สำเร็จ" }, { status: 500 });
  }
}
