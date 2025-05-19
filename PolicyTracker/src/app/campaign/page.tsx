"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { getDownloadURL, ref } from "firebase/storage";
import { storage } from "@/app/lib/firebase";

interface Campaign {
  id: number;
  name: string;
  description: string;
  policy: string;
  party: string;
  status: string;
  size: string;
  budget: number;
}

export default function CampaignListPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [parties, setParties] = useState<string[]>([]);
  const [selectedParty, setSelectedParty] = useState<string>("");
  const [partyLogos, setPartyLogos] = useState<Record<string, string>>({});

  const loadLogo = async (partyName: string) => {
  const encoded = encodeURIComponent(partyName);
  const exts = [".png", ".jpg"];
  for (const ext of exts) {
    try {
      const fileRef = ref(storage, `party/logo/${partyName}${ext}`);
      const url = await getDownloadURL(fileRef);
      return url;
    } catch {}
  }
  return null;
};


  useEffect(() => {
  const fetchCampaigns = async () => {
    const res = await fetch(`/api/campaign?party=${encodeURIComponent(selectedParty)}`);
    const data = await res.json();
    const combined = [...(data.normal || []), ...(data.special || [])];
    setCampaigns(combined); // อัปเดต state

    // ✅ โหลดโลโก้ทั้งหมด หลังจาก combined พร้อม
    const logoMap: Record<string, string> = {};
    for (const c of combined) {
      if (!logoMap[c.party]) {
        const logoUrl = await loadLogo(c.party);
        if (logoUrl) logoMap[c.party] = logoUrl;
      }
    }
    setPartyLogos(logoMap);
  };

  const fetchParties = async () => {
    const res = await fetch("/api/admin/getAllPartyNames");
    const data = await res.json();
    setParties(data.names || []);
  };

  fetchCampaigns();
  fetchParties();
}, [selectedParty]);

  

  const filtered = campaigns.filter((c) =>
    selectedParty ? c.party === selectedParty : true
  );

  const normalCampaigns = filtered.filter(
    (c) => !c.policy.includes("โครงการพิเศษ")
  );
  const specialCampaigns = filtered.filter((c) =>
    c.policy.includes("โครงการพิเศษ")
  );

  return (
    <div className="font-prompt">
      <Navbar />
      <div className="min-h-screen px-10 py-8 bg-center bg-cover" style={{ backgroundImage: "url('/bg/หัวข้อ.png')" }}>
        <h1 className="text-3xl text-white font-bold text-center mb-6">รายการโครงการทั้งหมด</h1>

        <div className="max-w-md mx-auto mb-6">
          <label className="block text-white font-medium mb-2">เลือกพรรค:</label>
          <select
            className="w-full p-2 border rounded"
            value={selectedParty}
            onChange={(e) => setSelectedParty(e.target.value)}
          >
            <option value="">ทั้งหมด</option>
            {parties.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <section className="mb-12">
          <h2 className="text-2xl text-white font-bold text-[#2C3E50] mb-4">โครงการธรรมดา</h2>
          {normalCampaigns.length === 0 ? (
            <p className="text-gray-600">ไม่พบโครงการ</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {normalCampaigns.map((c) => (
                <Link
  href={`/campaigndetail/${encodeURIComponent(c.name)}`}
  key={`${c.name}-${c.party}`}
  className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition cursor-pointer relative no-underline"
>
  <img
    src={partyLogos[c.party]}
    alt={`โลโก้ ${c.party}`}
    className="absolute top-2 right-2 w-16 h-16 object-contain"
  />
  <h3 className="text-xl font-semibold text-[#5D5A88]">{c.name}</h3>
  <p className="text-gray-600 mb-1">รายละเอียด: {c.description || "-"}</p>
  <p className="text-gray-600 mb-1">นโยบาย: {c.policy}</p>
  <p className="text-gray-600 mb-1">สถานะ: {c.status}</p>
  <p className="text-gray-600 mb-1">ขนาด: {c.size}</p>
  <p className="text-gray-600">งบประมาณ: {c.budget?.toLocaleString() || "-"} บาท</p>
</Link>


              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-2xl text-white font-bold text-[#2C3E50] mb-4">โครงการพิเศษ</h2>
          {specialCampaigns.length === 0 ? (
            <p className="text-gray-600">ไม่พบโครงการ</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {specialCampaigns.map((c) => (
                <Link
  href={`/campaigndetail/${encodeURIComponent(c.name)}`}
  key={`${c.id}-${c.name}`}
  className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition cursor-pointer relative no-underline"
>
  <img
    src={partyLogos[c.party]}
    alt={`โลโก้ ${c.party}`}
    className="absolute top-2 right-2 w-16 h-16 object-contain "
  />
  <h3 className="text-xl font-semibold text-[#5D5A88]">{c.name}</h3>
  <p className="text-gray-600 mb-1">รายละเอียด: {c.description || "-"}</p>
  <p className="text-gray-600 mb-1">นโยบาย: {c.policy}</p>
  <p className="text-gray-600 mb-1">สถานะ: {c.status}</p>
  <p className="text-gray-600 mb-1">ขนาด: {c.size}</p>
  <p className="text-gray-600">งบประมาณ: {c.budget?.toLocaleString() || "-"} บาท</p>
</Link>


              ))}
            </div>
          )}
        </section>
      </div>
      <Footer />
    </div>
  );
}
