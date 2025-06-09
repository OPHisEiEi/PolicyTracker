"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PRSidebar from "../components/PRSidebar";

interface Policy {
  id: number;
  name: string;
  description: string;
  category: string;
  total_budget?: number;
  created_at?: string;
}

export default function PRPolicyPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [partyName, setPartyName] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("partyName");
    setPartyName(stored ?? null);
  }, []);

  useEffect(() => {
    if (!partyName) return;

    const fetchPolicies = async () => {
      try {
        const res = await fetch("/api/pr-policy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ partyName }),
        });

        const data = await res.json();
        setPolicies(data);
      } catch (err) {
        console.error("Failed to fetch policies:", err);
      }
    };

    fetchPolicies();
  }, [partyName]);

  const editPolicy = (id: number) => {
    if (!id) return;
    router.push(`/prPolicyForm?policy_id=${id}`);
  };

  const deletePolicy = async (id: number) => {
    if (!id || !confirm("คุณแน่ใจว่าต้องการลบนโยบายนี้?")) return;

    try {
      const res = await fetch(`/api/pr-policy/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        alert("ลบนโยบายสำเร็จ");
        setPolicies((prev) => prev.filter((p) => p.id !== id));
      } else {
        const text = await res.text();
        alert("ลบไม่สำเร็จ: " + text);
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("เกิดข้อผิดพลาดในการลบ");
    }
  };

  return (
    <div className="min-h-screen bg-cover bg-center flex" style={{ backgroundImage: "url('/bg/ผีเสื้อ.jpg')" }}>
      <PRSidebar />
      <div className="flex-1 md:ml-64">
        <header className="bg-white p-4 shadow-md flex justify-between items-center sticky top-0 z-10">
          <h1 className="text-2xl font-bold text-[#5D5A88]">PR พรรค {partyName}</h1>
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-3xl text-[#5D5A88]">☰</button>
          <ul className="hidden md:flex space-x-4">
            <li><Link href="/login" className="text-[#5D5A88] hover:underline">ออกจากระบบ</Link></li>
          </ul>
        </header>

        {menuOpen && (
          <div className="md:hidden bg-gray-100 p-4 absolute top-16 left-0 w-full shadow-md">
            <ul className="space-y-2">
              <li><Link href="/pr_policy" className="block text-[#5D5A88]">นโยบาย</Link></li>
              <li><Link href="/pr_campaign" className="block text-[#5D5A88]">โครงการ</Link></li>
              <li><Link href="/pr_event" className="block text-[#5D5A88]">กิจกรรม</Link></li>
              <li><Link href="/pr_party_info" className="block text-[#5D5A88]">ข้อมูลพรรค</Link></li>
              <li><Link href="/login" className="block text-[#5D5A88]">ออกจากระบบ</Link></li>
            </ul>
          </div>
        )}

        <main className="p-6">
          <div className="flex justify-end mb-4">
            <button onClick={() => router.push("/prPolicyForm")} className="bg-[#5D5A88] text-white px-4 py-2 rounded hover:bg-[#46426b]">
              ➕ เพิ่มนโยบาย
            </button>
          </div>

          <h2 className="text-3xl text-white text-center mb-4">รายการนโยบาย</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {policies.length > 0 ? (
              policies
                .filter((policy) => typeof policy.id === "number")
                .map((policy) => (
                  <div key={policy.id} className="bg-white p-4 rounded-lg shadow-md">
                    <p className="text-sm text-gray-500 mb-1">ID: {policy.id}</p>
                    <h3 className="text-lg font-semibold">{policy.name}</h3>
                    <p className="text-gray-600 mt-2 break-words overflow-hidden">
                      {policy.description ? policy.description.slice(0, 100) + "..." : "-"}
                    </p>
                    <p className="text-gray-600">หมวดหมู่: {policy.category}</p>
                    <p className="text-gray-600">งบรวม: {policy.total_budget?.toLocaleString() ?? "-"} บาท</p>
                    <p className="text-gray-600">สร้างเมื่อ: {policy.created_at ? new Date(policy.created_at).toLocaleDateString() : "-"}</p>
                    
                    <div className="mt-4 flex justify-between">
                      <button
                        onClick={() => editPolicy(policy.id)}
                        className="bg-[#5D5A88] text-white px-3 py-1 rounded hover:bg-[#46426b]"
                      >
                        ✏ แก้ไข
                      </button>
                      <button
                        onClick={() => deletePolicy(policy.id)}
                        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-700"
                      >
                        ❌ ลบ
                      </button>
                    </div>
                  </div>
                ))
            ) : (
              <p className="text-white text-center col-span-full">ยังไม่มีนโยบายในระบบ</p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
