"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { firestore, storage } from "@/app/lib/firebase";
import PRSidebar from "../components/PRSidebar";

export default function EditMemberForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const memberId = searchParams.get("editId");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [partyName, setPartyName] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [partyId, setPartyId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);


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


  useEffect(() => {
    const name = localStorage.getItem("partyName") || "";
    const id = localStorage.getItem("partyId");
    setPartyName(name.replace(/^พรรค\s*/, "").trim());
    setPartyId(id);
  }, []);


  useEffect(() => {
    const storedParty = localStorage.getItem("partyName") || "";
    setPartyName(storedParty.replace(/^พรรค\s*/, "").trim());
  }, []);

  useEffect(() => {
    if (!partyId || !memberId) return;

    const fetchMember = async () => {
      try {
        const docRef = doc(firestore, "Party", partyId, "Member", memberId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setFirstName(data.FirstName || "");
          setLastName(data.LastName || "");
          setRole(data.Role || "");

          try {
            const jpgUrl = await getDownloadURL(ref(storage, `party/member/${partyId}/${memberId}.jpg`));
            setPreviewUrl(jpgUrl);
          } catch {
            try {
              const pngUrl = await getDownloadURL(ref(storage, `party/member/${partyId}/${memberId}.png`));
              setPreviewUrl(pngUrl);
            } catch {
              console.warn("ไม่พบรูปสมาชิกทั้ง .jpg และ .png");
            }
          }
        } else {
          console.warn("ไม่พบสมาชิก:", memberId);
        }
      } catch (err) {
        console.error("Error fetching member:", err);
      }
    };

    fetchMember();
  }, [partyId, memberId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!partyId || !memberId) return;

    setIsSubmitting(true);


    try {
      const basePath = `party/member/${partyId}/${memberId}`;

      if (imageFile) {
        const resizedBlob = await resizeImage(imageFile);
        const imageRef = ref(storage, `${basePath}.jpg`);
        await uploadBytes(imageRef, resizedBlob);
      }


      const docRef = doc(firestore, "Party", partyId, "Member", memberId);
      await updateDoc(docRef, {
        FirstName: firstName,
        LastName: lastName,
        Role: role,
      });

      alert("อัปเดตข้อมูลสำเร็จ");
      router.push("/prPartyInfo");
    } catch (err) {
      console.error("Error updating member:", err);
      alert("เกิดข้อผิดพลาด");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };


  return (
    <div className="min-h-screen bg-cover bg-center flex" style={{ backgroundImage: "url('/bg/ผีเสื้อ.jpg')" }}>
      <PRSidebar />
      <div className="flex-1 md:ml-64 p-8">
        <h1 className="text-3xl text-white mb-6">แก้ไขข้อมูลสมาชิก</h1>
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-md shadow-lg max-w-md mx-auto">

          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="ชื่อ"
            className="w-full border p-2 rounded mb-4"
          />

          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="นามสกุล"
            className="w-full border p-2 rounded mb-4"
          />

          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="ตำแหน่ง"
            className="w-full border p-2 rounded mb-4"
          />

          <div className="mb-4">
            <label className="block font-bold mb-1">เลือกรูปใหม่ (ถ้ามี):</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="mb-2"
            />

            {previewUrl && !imageFile && (
              <div>
                <p className="text-sm text-gray-600 mb-1">รูปปัจจุบัน:</p>
                <img
                  src={previewUrl}
                  alt="รูปเดิม"
                  className="w-32 h-32 object-cover rounded shadow border"
                />
              </div>
            )}

            {imageFile && (
              <div>
                <p className="text-sm text-gray-600 mb-1">รูปที่เลือกใหม่:</p>
                <img
                  src={URL.createObjectURL(imageFile)}
                  alt="รูปใหม่"
                  className="w-32 h-32 object-cover rounded shadow border"
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full px-4 py-2 rounded ${isSubmitting
                ? "bg-gray-400 text-white cursor-not-allowed"
                : "bg-[#5D5A88] text-white hover:bg-[#46426b]"
              }`}
          >
            {isSubmitting ? "กำลังบันทึก..." : "บันทึก"}
          </button>

        </form>
      </div>
    </div>
  );

}