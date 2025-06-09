"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ref, uploadBytes } from "firebase/storage";
import { storage } from "@/app/lib/firebase";

export default function AdminEditPartyPage() {
  const router = useRouter();
  const params = useParams();
  const id = parseInt(params.id as string);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "admin") {
      alert("คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
      router.push("/login");
    }
  }, []);

  useEffect(() => {
    const fetchParty = async () => {
      const res = await fetch(`/api/admin/party/${id}`);
      if (!res.ok) {
        console.error("โหลดข้อมูลพรรคไม่สำเร็จ:", res.status);
        return;
      }
      const data = await res.json();
      setName(data.name ?? "");
      setDescription(data.description ?? "");
      setLink(data.link ?? "");
    };
    if (!isNaN(id)) {
      fetchParty();
    }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch(`/api/admin/party/${id}`, {
        method: "PUT",
        body: JSON.stringify({ name, description, link }),
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) throw new Error("แก้ไขข้อมูลไม่สำเร็จ");


      if (logoFile) {
        const storageRef = ref(storage, `party/logo/${id}.png`);

        await uploadBytes(storageRef, logoFile);
      }

      alert("แก้ไขพรรคสำเร็จ");
      router.push("/admin/party");
    } catch (err) {
      alert("เกิดข้อผิดพลาด");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen text-white p-10 bg-cover bg-center flex items-center justify-center" style={{ backgroundImage: "url('/bg/หัวข้อ.png')" }}>
      <div>
        <h1 className="text-3xl font-bold mb-6 text-center">📝 แก้ไขข้อมูลพรรค</h1>
        <form onSubmit={handleSubmit} className="bg-white text-black p-6 rounded-lg shadow-lg max-w-xl">
          <div className="mb-4">
            <label className="block font-semibold mb-1">ชื่อพรรค</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border px-3 py-2 rounded"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block font-semibold mb-1">รายละเอียด</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          <div className="mb-4">
            <label className="block font-semibold mb-1">เว็บไซต์</label>
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          <div className="mb-6">
            <label className="block font-semibold mb-1">อัปโหลดโลโก้ใหม่ (ถ้าต้องการเปลี่ยน)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
              className="w-full"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="bg-[#5D5A88] text-white px-6 py-2 rounded hover:bg-[#46426b] disabled:opacity-50"
          >
            {submitting ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
          </button>
        </form>
      </div>
    </div>
  );
}
