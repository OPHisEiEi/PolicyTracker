"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ref, uploadBytes, getDownloadURL, } from "firebase/storage";
import { doc, setDoc, getDocs, collection } from "firebase/firestore";
import { storage, firestore } from "@/app/lib/firebase";
import PRSidebar from "../components/PRSidebar";

export default function PRMemberForm() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [memberSurname, setMemberSurname] = useState("");
  const [memberRole, setMemberRole] = useState("");
  const [memberPic, setMemberPic] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [partyName, setPartyName] = useState("ไม่ทราบชื่อพรรค");
  const [partyId, setPartyId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const name = localStorage.getItem("partyName");
    const id = localStorage.getItem("partyId");
    if (name && id) {
      setPartyName(name);
      setPartyId(id);
    } else {
      alert("กรุณาเข้าสู่ระบบใหม่");
      router.push("/login");
    }
  }, []);

  useEffect(() => {
    const party = localStorage.getItem("partyName");
    if (party) {
      setPartyName(party);
    } else {
      alert("กรุณาเข้าสู่ระบบใหม่");
      router.push("/login");
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setMemberPic(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberName || !memberSurname || !memberRole || !memberPic) {
      alert("กรุณากรอกข้อมูลให้ครบ");
      return;
    }

    setIsSubmitting(true);

    try {
      const fileExt = memberPic.name.split(".").pop()?.toLowerCase() === "png" ? "png" : "jpg";
      const fullName = `${memberName}_${memberSurname}`.replace(/\s+/g, "_");
      const firestorePath = `Party/${partyId}/Member`;

      const memberCollection = collection(firestore, firestorePath);
      const snapshot = await getDocs(memberCollection);

      const validIds = snapshot.docs
        .map(doc => doc.data().id)
        .filter(id => typeof id === "number" && !isNaN(id));

      const maxId = Math.max(...snapshot.docs.map(doc => doc.data().id || 0), 0);
      const newId = maxId + 1;

      const resizedBlob = await resizeImage(memberPic);

      const imageRef = ref(storage, `party/member/${partyId}/${newId}.${fileExt}`);
      await uploadBytes(imageRef, resizedBlob);
      const imageUrl = await getDownloadURL(imageRef);

      const docRef = doc(firestore, firestorePath, String(newId));
      await setDoc(docRef, {
        FirstName: memberName,
        LastName: memberSurname,
        Role: memberRole,
        Picture: `/member/${newId}.${fileExt}`,
        id: newId,
      });

      alert("บันทึกข้อมูลสมาชิกสำเร็จ");
      router.push("/prPartyInfo");
    } catch (err) {
      console.error("Error saving member:", err);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resizeImage = (file: File, maxWidth = 500, maxHeight = 500): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };

      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height *= maxWidth / width;
            width = maxWidth;
          } else {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) return reject("Failed to get canvas context");
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject("Failed to resize image");
        }, "image/jpeg", 0.8);
      };

      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };


  return (
    <div className="min-h-screen bg-center bg-cover flex" style={{ backgroundImage: "url('/bg/ผีเสื้อ.jpg')" }}>
      <PRSidebar />
      <div className="flex-1 md:ml-64">
        <header className="bg-white p-4 shadow-md flex justify-between items-center sticky top-0 z-10">
          <h1 className="text-2xl font-bold text-[#5D5A88]">PR พรรค {partyName}</h1>
        </header>

        <main className="p-6">
          <h2 className="text-3xl text-white text-center mb-6">เพิ่มข้อมูลสมาชิก</h2>

          <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl mx-auto">
            <form onSubmit={handleSubmit} className="space-y-4">

              <div>
                <label className="block font-bold">ชื่อ:</label>
                <input
                  type="text"
                  placeholder="สรรพวิชช์"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  required
                />
              </div>

              <div>
                <label className="block font-bold">นามสกุล:</label>
                <input
                  type="text"
                  placeholder="ช่องดารากุล"
                  value={memberSurname}
                  onChange={(e) => setMemberSurname(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  required
                />
              </div>

              <div>
                <label className="block font-bold">ตำแหน่ง:</label>
                <input
                  type="text"
                  placeholder="หัวหน้าพรรค"
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  required
                />
              </div>

              <div>
                <label className="block font-bold">อัปโหลดรูปสมาชิก:</label>
                <input type="file" accept="image/*" onChange={handleFileChange} required />
              </div>

              {previewUrl && (
                <div>
                  <label className="block font-bold mt-2">Preview:</label>
                  <img src={previewUrl} alt="Preview" className="w-40 rounded-md shadow-md" />
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full p-3 rounded-md mt-4 ${isSubmitting
                  ? "bg-gray-400 text-white cursor-not-allowed"
                  : "bg-[#5D5A88] text-white hover:bg-[#46426b]"
                  }`}
              >
                {isSubmitting ? "กำลังบันทึก..." : "บันทึก"}
              </button>

            </form>

          </div>
        </main>
      </div>
    </div>
  );
}