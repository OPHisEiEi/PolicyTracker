"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/app/lib/firebase";


export default function AdminHomePage() {
  const router = useRouter();


  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "admin") {
      alert("คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
      router.push("/login");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#9795B5] text-white flex flex-col items-center justify-center p-10 bg-cover bg-center" style={{ backgroundImage: "url('/bg/หัวข้อ.png')" }}>

      <h1 className="text-3xl font-bold mb-10">หน้าหลักผู้ดูแลระบบ (Admin)</h1>

      <div className="flex flex-col gap-6 w-full max-w-md">
        <button
          onClick={() => router.push("/admin/userlist")}
          className="bg-white text-[#5D5A88] font-semibold px-6 py-4 rounded-lg shadow hover:bg-gray-100 transition"
        >
          👤 จัดการบัญชีผู้ใช้งาน
        </button>

        <button
          onClick={() => router.push("/admin/party")}
          className="bg-white text-[#5D5A88] font-semibold px-6 py-4 rounded-lg shadow hover:bg-gray-100 transition"
        >
          🏛️ จัดการพรรคการเมือง
        </button>

        <button
          onClick={async () => {
            await signOut(auth);
            localStorage.clear();
            router.push("/login");
          }}
          className="bg-white text-[#5D5A88] font-semibold px-6 py-4 rounded-lg shadow hover:bg-gray-100 transition"
        >
          ออกจากระบบ
        </button>
      </div>
    </div>
  );
}
