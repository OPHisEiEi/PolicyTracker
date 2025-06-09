"use client";

import { useRouter } from "next/navigation";

export default function AdminSidebar() {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.clear(); 
    router.push("/login"); 
  };

  return (
    <aside className="w-64 h-screen bg-white text-[#5D5A88] shadow-md fixed left-0 top-0 flex flex-col">
      <button
        onClick={() => router.push("/admin")}
        className="p-6 text-2xl font-bold border-b border-gray-200 text-left hover:bg-gray-100 transition"
      >
        Admin Panel
      </button>

      <nav className="flex-1 p-4 space-y-4">
        <button
          onClick={() => router.push("/admin/userlist")}
          className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 transition"
        >
          👤 จัดการบัญชีผู้ใช้
        </button>

        <button
          onClick={() => router.push("/admin/party")}
          className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 transition"
        >
          🏛️ จัดการพรรคการเมือง
        </button>

        <button
          onClick={handleLogout}
          className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 transition"
        >
          🚪 ออกจากระบบ
        </button>
      </nav>
    </aside>
  );
}
