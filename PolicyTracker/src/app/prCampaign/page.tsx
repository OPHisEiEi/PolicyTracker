"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PRSidebar from "../components/PRSidebar";

interface Campaign {
  id: number;
  name: string;
  description: string;
  progress: number;
  status?: string;
  policy?: string;
  budget?: number;
  size?: string;
  area?: string;
  impact?: string;
  isSpecial?: boolean;
}

export default function PRCampaignPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [partyName, setPartyName] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "normal" | "special">("all");

  const router = useRouter();

  const filteredCampaigns = campaigns.filter((c) => {
    if (filter === "special") return c.isSpecial === true;
    if (filter === "normal") return !c.isSpecial;
    return true;
  });


  useEffect(() => {
    const storedParty = localStorage.getItem("partyName");
    const cleanedParty = storedParty?.replace(/^พรรค\s*/i, "").trim() || null;
    setPartyName(cleanedParty);
  }, []);

  useEffect(() => {
    if (!partyName) return;

    const fetchCampaigns = async () => {
      try {
        const res = await fetch("/api/pr-campaign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ partyName }),
        });

        const data = await res.json();
        console.log("ข้อมูลที่ได้รับจาก API:", data);
        setCampaigns(data);
      } catch (error) {
        console.error("Failed to fetch campaigns", error);
      }
    };

    fetchCampaigns();
  }, [partyName]);

  const goToCampaignForm = () => {
    router.push("/prCampaignForm");
  };

  const editCampaign = (id: number) => {
    router.push(`/prCampaignForm?campaign_id=${id}`);
  };

  const deleteCampaign = async (id: number) => {
    if (!confirm("คุณต้องการลบโครงการนี้หรือไม่?")) return;

    try {
      const res = await fetch(`/api/pr-campaign/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setCampaigns((prev) => prev.filter((c) => c.id !== id));
        alert("ลบโครงการสำเร็จ");
      } else {
        alert("ลบโครงการไม่สำเร็จ");
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("เกิดข้อผิดพลาดในการลบ");
    }
  };

  if (!partyName) {
    return <div className="text-white text-center py-20">กำลังโหลดข้อมูลพรรค...</div>;
  }

  return (
    <div className="min-h-screen bg-cover bg-center flex" style={{ backgroundImage: "url('/bg/ผีเสื้อ.jpg')" }}>
      <PRSidebar />

      <div className="flex-1 md:ml-64">
        <header className="bg-white p-4 shadow-md flex justify-between items-center sticky top-0 z-10">
          <h1 className="text-2xl font-bold text-[#5D5A88]">PR พรรค {partyName}</h1>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden text-3xl text-[#5D5A88] focus:outline-none"
          >
            ☰
          </button>
          <ul className="hidden md:flex space-x-4">
            <li>
              <Link href="/login" className="text-[#5D5A88] px-4 py-2 hover:bg-gray-200 rounded-md">
                ออกจากระบบ
              </Link>
            </li>
          </ul>
        </header>

        {menuOpen && (
          <div className="md:hidden bg-gray-100 p-4 absolute top-16 left-0 w-full shadow-md">
            {/* รองรับ Sidebar แบบ Mobile */}
          </div>
        )}

        <main className="p-6">
          <div className="flex justify-end mb-4">
            <button
              onClick={goToCampaignForm}
              className="bg-[#5D5A88] text-white px-4 py-2 rounded-md hover:bg-[#46426b]"
            >
              ➕ เพิ่มโครงการ
            </button>
          </div>

          <h2 className="text-3xl text-white text-center">โครงการที่บันทึกไว้</h2>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="p-2 rounded-md border border-gray-300 text-sm"
          >
            <option value="all">📋 ทั้งหมด</option>
            <option value="normal">🧩 โครงการทั่วไป</option>
            <option value="special">⭐ โครงการพิเศษ</option>
          </select>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-6">
            {campaigns.length > 0 ? (
              filteredCampaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="bg-white p-4 rounded-lg shadow-lg flex flex-col justify-between"
                >
                  <div className="h-full">
                    <p className="text-sm text-gray-500 mb-1">ID: {campaign.id}</p>
                    <h3 className="text-lg font-semibold">{campaign.name}</h3>
                    <p className="text-gray-600 mt-1 break-words overflow-hidden">
                      รายละเอียด:{" "}
                      {campaign.description.length > 100
                        ? campaign.description.slice(0, 100) + "..."
                        : campaign.description}
                    </p>
                    <p className="text-gray-600">นโยบาย: {campaign.policy || "-"}</p>
                    <p className="text-gray-600">สถานะ: {campaign.status || "-"}</p>
                    <p className="text-gray-600">พื้นที่: {campaign.area ?? "-"}</p>
                    <p className="text-gray-600">ผลกระทบ: {campaign.impact ?? "-"}</p>
                    <p className="text-gray-600">ขนาดโครงการ: {campaign.size ?? "-"}</p>
                    <p className="text-gray-600">งบที่ได้รับ: {campaign.budget?.toLocaleString() ?? "-"} บาท</p>
                    <p className="text-gray-400 mt-2">ความคืบหน้า: {campaign.progress} %</p>
                  </div>
                  <div className="mb-auto flex justify-between mt-4">
                    <button
                      onClick={() => editCampaign(campaign.id)}
                      className="bg-[#5D5A88] text-white px-3 py-1 rounded-md hover:bg-[#46426b]"
                    >
                      ✏ แก้ไข
                    </button>
                    <button
                      onClick={() => deleteCampaign(campaign.id)}
                      className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-700"
                    >
                      ❌ ลบ
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-white text-center">ยังไม่มีโครงการในระบบ</p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
