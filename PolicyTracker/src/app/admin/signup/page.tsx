"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, firestore } from "@/app/lib/firebase";

export default function AdminSignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"pr" | "admin">("pr");
  const [partyName, setPartyName] = useState("");
  const [message, setMessage] = useState("");
  const [partyList, setPartyList] = useState<{ id: number; name: string }[]>([]);
  const [partyId, setPartyId] = useState<number | null>(null);


  useEffect(() => {
    if (role === "pr") {
      fetch("/api/admin/getAllParties")
        .then((res) => res.json())
        .then((data) => {
          setPartyList(data || []);
        })
        .catch((err) => {
          console.error("โหลดรายชื่อพรรคไม่สำเร็จ:", err);
          setPartyList([]);
        });
    }
  }, [role]);



  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      const payload: any = {
        email,
        displayName,
        role,
      };

      if (role === "pr") {
        if (!partyId) {
          setMessage("กรุณาเลือกพรรคให้ถูกต้อง");
          return;
        }
        payload.partyId = partyId;

        const selectedParty = partyList.find((p) => p.id === partyId);
        payload.partyName = selectedParty?.name ?? "";
      }

      await setDoc(doc(firestore, "users", uid), payload);

      setMessage("สร้างบัญชีผู้ใช้สำเร็จ!");
      setEmail("");
      setPassword("");
      setDisplayName("");
      setPartyId(null);
      router.push("/admin");
    } catch (error: any) {
      console.error("เกิดข้อผิดพลาด:", error.message);
      setMessage(error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cover bg-center" style={{ backgroundImage: "url('/bg/หัวข้อ.png')" }}>
      <form onSubmit={handleCreateUser} className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-[#5D5A88] text-center">สร้างบัญชีผู้ใช้</h1>

        <input
          type="email"
          placeholder="อีเมล"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 mb-4 border rounded"
          required
        />

        <input
          type="password"
          placeholder="รหัสผ่าน"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 mb-4 border rounded"
          required
        />

        <input
          type="text"
          placeholder="ชื่อแสดง (Display Name)"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full p-2 mb-4 border rounded"
          required
        />

        <label className="block mb-2">บทบาทผู้ใช้</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "pr" | "admin")}
          className="w-full p-2 mb-4 border rounded"
        >
          <option value="pr">PR</option>
          <option value="admin">Admin</option>
        </select>

        {role === "pr" && (
          <>
            <label className="block mb-2">เลือกพรรค</label>
            <select
              value={partyId ?? ""}
              onChange={(e) => setPartyId(Number(e.target.value))}
              className="w-full p-2 mb-4 border rounded"
              required
            >
              <option value="">-- เลือกพรรคการเมือง --</option>
              {partyList.map((party) => (
                <option key={party.id} value={party.id}>
                  {party.name}
                </option>
              ))}
            </select>
          </>
        )}


        {message && <p className="mb-4 text-center text-sm text-red-600">{message}</p>}

        <button
          type="submit"
          className="w-full bg-[#5D5A88] text-white p-2 rounded hover:bg-[#46426b]"
        >
          ➕ สร้างบัญชีผู้ใช้
        </button>

        <div className="pt-3 text-center">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-[#5D5A88] underline hover:text-[#46426b]"
          >
            ย้อนกลับ
          </button>
        </div>
      </form>
    </div>
  );
}
