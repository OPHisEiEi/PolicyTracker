"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/app/components/AdminSidebar";

interface User {
    uid: string;
    email: string;
    displayName: string;
    role: "admin" | "pr";
    partyName?: string;
}

export default function AdminUserListPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [authorized, setAuthorized] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (typeof window !== "undefined") {
            const role = localStorage.getItem("role");
            if (role !== "admin") {
                alert("คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
                router.push("/login");
            } else {
                setAuthorized(true);
            }
        }
    }, [router]);

    useEffect(() => {
        const fetchUsers = async () => {
            const res = await fetch("/api/admin/users");
            const data = await res.json();
            setUsers(data);
        };

        if (authorized) {
            fetchUsers();
        }
    }, [authorized]);

    const handleDelete = async (uid: string) => {
        if (!confirm("คุณแน่ใจว่าต้องการลบบัญชีนี้?")) return;

        const res = await fetch(`/api/admin/users/${uid}`, {
            method: "DELETE",
        });

        if (res.ok) {
            setUsers((prev) => prev.filter((user) => user.uid !== uid));
            alert("ลบผู้ใช้สำเร็จ");
        } else {
            alert("ลบไม่สำเร็จ");
        }
    };

    const prUsers = users.filter((u) => u.role === "pr");
    const adminUsers = users.filter((u) => u.role === "admin");

    if (!authorized) return null;

    return (
        <div className="flex min-h-screen">

            <AdminSidebar />
            <div className="flex-1 bg-[#9795B5] text-white p-10 ml-64 bg-cover bg-center" style={{ backgroundImage: "url('/bg/หัวข้อ.png')" }}>
                <h1 className="text-3xl font-bold mb-6 text-center">รายชื่อบัญชีผู้ใช้</h1>
                <div className="flex justify-end">
                <button
                    onClick={() => router.push("/admin/signup")}
                    className="bg-white text-[#5D5A88] font-semibold px-4 py-2 rounded hover:bg-gray-200"
                >
                    ➕ เพิ่มบัญชีผู้ใช้
                </button>
                </div>
                {/* Admin Users */}
                <div className="mb-10">
                    <h2 className="text-2xl font-semibold mb-2">👤 ผู้ดูแลระบบ (Admin)</h2>
                    <ul className="bg-white text-black rounded-lg shadow p-4">
                        {adminUsers.map((user) => (
                            <li key={user.uid} className="flex justify-between items-center border-b py-2">
                                <span>{user.displayName} ({user.email})</span>
                                <button
                                    onClick={() => handleDelete(user.uid)}
                                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-700"
                                >
                                    ลบ
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>

                <div>
                    <h2 className="text-2xl font-semibold mb-2">🧑‍💼 เจ้าหน้าที่พรรค (PR)</h2>
                    <ul className="bg-white text-black rounded-lg shadow p-4">
                        {prUsers.map((user) => (
                            <li key={user.uid} className="flex justify-between items-center border-b py-2">
                                <span>
                                    {user.displayName} ({user.email}) — พรรค {user.partyName || "-"}
                                </span>
                                <button
                                    onClick={() => handleDelete(user.uid)}
                                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-700"
                                >
                                    ลบ
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
