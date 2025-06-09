"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Sidebar from "@/app/components/PRSidebar";
import { useRouter } from "next/navigation";
import PRGuideBook from "@/app/components/PRGuideBook";

export default function PRPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [partyName, setPartyName] = useState<string | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);

  const router = useRouter();

  useEffect(() => {
  const role = localStorage.getItem("role");
  if (role !== "pr") {
    alert("คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
    router.push("/login");
  }
}, []);

  useEffect(() => {
    const storedParty = localStorage.getItem("partyName");
    setPartyName(storedParty ?? "ไม่ทราบชื่อพรรค");
  }, []);

  return (
    <div className="h-screen bg-white flex overflow-hidden">
      <Sidebar />

      <div className="flex-1 md:ml-64 flex flex-col overflow-hidden">
        <header className="bg-white p-4 shadow-md flex justify-between items-center flex-shrink-0">
          <h1 className="text-2xl font-bold text-[#5D5A88]">
            PR พรรค {partyName}
          </h1>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden text-3xl text-[#5D5A88] focus:outline-none"
          >
            ☰
          </button>
          <ul className="hidden md:flex space-x-4">
            <li>
              <Link
                href="/login"
                className="text-[#5D5A88] px-4 py-2 hover:bg-gray-200 rounded-md"
              >
                ออกจากระบบ
              </Link>
            </li>
          </ul>
        </header>

        {menuOpen && <Sidebar isMobile onClose={() => setMenuOpen(false)} />}

        <main className="flex-1 overflow-hidden">
          <PRGuideBook />
        </main>
      </div>
    </div>
  );
}