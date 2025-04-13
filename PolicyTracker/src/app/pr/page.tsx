"use client";

import { useState } from "react";
import Link from "next/link";

export default function PRPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const partyName = "ตัวอย่างพรรค"; // สามารถเปลี่ยนค่าเป็น dynamic จาก database ได้

  return (
    <div className="min-h-screen bg-[#9795B5] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-200 p-6 fixed h-full hidden md:block">
        <ul className="space-y-4">
          <li>
            <Link
              href="/pr_policy"
              className="block text-[#5D5A88] bg-[#E3E1F1] p-3 rounded-md hover:bg-[#D0CEF0]"
            >
              นโยบาย
            </Link>
          </li>
          <li>
            <Link
              href="/pr_campaign"
              className="block text-[#5D5A88] bg-[#E3E1F1] p-3 rounded-md hover:bg-[#D0CEF0]"
            >
              โครงการ
            </Link>
          </li>
          <li>
            <Link
              href="/pr_event"
              className="block text-[#5D5A88] bg-[#E3E1F1] p-3 rounded-md hover:bg-[#D0CEF0]"
            >
              กิจกรรม
            </Link>
          </li>
          <li>
            <Link
              href="/pr_party_info"
              className="block text-[#5D5A88] bg-[#E3E1F1] p-3 rounded-md hover:bg-[#D0CEF0]"
            >
              ข้อมูลพรรค
            </Link>
          </li>
        </ul>
      </aside>

      <div className="flex-1 md:ml-64">
        {/* Navbar */}
        <header className="bg-white p-4 shadow-md flex justify-between items-center sticky top-0 z-10">
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

        {/* Mobile Sidebar */}
        {menuOpen && (
          <div className="md:hidden bg-gray-100 p-4 absolute top-16 left-0 w-full shadow-md">
            <ul className="space-y-2">
              <li>
                <Link
                  href="/pr_policy"
                  className="block text-[#5D5A88] px-4 py-2 hover:bg-gray-200"
                >
                  นโยบาย
                </Link>
              </li>
              <li>
                <Link
                  href="/pr_campaign"
                  className="block text-[#5D5A88] px-4 py-2 hover:bg-gray-200"
                >
                  โครงการ
                </Link>
              </li>
              <li>
                <Link
                  href="/pr_event"
                  className="block text-[#5D5A88] px-4 py-2 hover:bg-gray-200"
                >
                  กิจกรรม
                </Link>
              </li>
              <li>
                <Link
                  href="/pr_party_info"
                  className="block text-[#5D5A88] px-4 py-2 hover:bg-gray-200"
                >
                  ข้อมูลพรรค
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="block text-[#5D5A88] px-4 py-2 hover:bg-gray-200"
                >
                  ออกจากระบบ
                </Link>
              </li>
            </ul>
          </div>
        )}

        {/* Main Content */}
        <main className="p-6">
          <h2 className="text-3xl text-white text-center">คู่มือการใช้งาน</h2>
        </main>
      </div>
    </div>
  );
}
