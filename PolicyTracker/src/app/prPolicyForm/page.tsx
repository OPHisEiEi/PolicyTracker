"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { storage } from "@/app/lib/firebase";
import { ref, uploadBytes, getDownloadURL, listAll, deleteObject } from "firebase/storage";
import PRSidebar from "../components/PRSidebar";
import { useRouter } from "next/navigation";
import { setDoc, doc, getDoc, collection, getDocs, deleteDoc } from "firebase/firestore";
import { firestore } from "@/app/lib/firebase";

export default function PRPolicyForm() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [policyName, setPolicyName] = useState<string>("");
  const [policyCategory, setPolicyCategory] = useState("เศรษฐกิจ");
  const [policyDes, setPolicyDes] = useState("");
  const [policyBanner, setPolicyBanner] = useState<File | null>(null);
  const [policyPDF, setPolicyPDF] = useState<File | null>(null);
  const [partyName, setPartyName] = useState("ไม่ทราบชื่อพรรค");
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [achievementProcess, setAchievementProcess] = useState("");
  const [achievementPolicy, setAchievementPolicy] = useState("");
  const [achievementProject, setAchievementProject] = useState("");
  const [timelineItems, setTimelineItems] = useState<
    { id?: string; name: string; date: string; description: string; rawDate: string }[]
  >([]);

  const [pictures, setPictures] = useState<File[]>([]);

  const [pictureUrls, setPictureUrls] = useState<string[]>([]);
  const [picturesToDelete, setPicturesToDelete] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);


  const searchParams = useSearchParams();
  const policyId = searchParams.get("policy_id");

  const router = useRouter();

  const previewUrls = useMemo(() => {
    return pictures.map((file) => URL.createObjectURL(file));
  }, [pictures]);

  useEffect(() => {
    if (!policyId) return;

    const fetchPolicy = async () => {
      const res = await fetch(`/api/pr-policy/${policyId}`);
      const data = await res.json();

      setPolicyName(data.name || "");
      setPolicyCategory(data.category || "เศรษฐกิจ");
      setPolicyDes(data.description || "");
      // โหลด preview image/pdf ตาม id
    };

    fetchPolicy();
  }, [policyId]);



  useEffect(() => {
    const storedParty = localStorage.getItem("partyName");
    if (storedParty && storedParty !== "") {
      setPartyName(storedParty);
    } else {
      alert("❌ ไม่พบข้อมูลพรรค กรุณาเข้าสู่ระบบใหม่");
    }
  }, []);

  useEffect(() => {
    if (!policyId) return;

    const fetchPolicy = async () => {
      try {
        const res = await fetch(`/api/pr-policy/${policyId}`);
        const data = await res.json();

        const cleanName = data.name ? data.name.trim() : "";
        setPolicyName(data.name || "");
        setPolicyCategory(data.category || "เศรษฐกิจ");
        setPolicyDes(data.description || "");

        // ✅ Banner: .jpg หรือ .png
        try {
          const jpgRef = ref(storage, `policy/banner/${policyId}.jpg`);
          const jpgUrl = await getDownloadURL(jpgRef);
          setBannerPreviewUrl(jpgUrl);
        } catch {
          try {
            const pngRef = ref(storage, `policy/banner/${policyId}.png`);
            const pngUrl = await getDownloadURL(pngRef);
            setBannerPreviewUrl(pngUrl);
          } catch { }
        }

        // ✅ PDF
        try {
          const pdfRef = ref(storage, `policy/reference/${policyId}.pdf`);
          const pdfUrl = await getDownloadURL(pdfRef);
          setPdfPreviewUrl(pdfUrl);
        } catch { }
      } catch (err) {
        console.error("❌ โหลดนโยบายล้มเหลว", err);
      }
    };

    fetchPolicy();
  }, [policyId]);

  useEffect(() => {
    if (!policyId) return;

    // 🔹 โหลด achievement
    const fetchAchievements = async () => {
      const paths = [
        { key: "process", label: "เชิงกระบวนการ" },
        { key: "policy", label: "เชิงการเมือง" },
        { key: "project", label: "เชิงโครงการ" },
      ];

      for (const { key, label } of paths) {
        const docRef = doc(firestore, "Policy", policyId, "achievement", label);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (key === "process") setAchievementProcess(data.description || "");
          if (key === "policy") setAchievementPolicy(data.description || "");
          if (key === "project") setAchievementProject(data.description || "");
        }
      }
    };

    // 🔹 โหลด timeline
    const fetchTimeline = async () => {
      const timelineRef = collection(firestore, "Policy", policyId, "sequence");
      const snapshot = await getDocs(timelineRef);

      function thaiDateToISO(thaiDate: string): string {
        const thMonths: Record<string, string> = {
          "ม.ค.": "01", "ก.พ.": "02", "มี.ค.": "03", "เม.ย.": "04",
          "พ.ค.": "05", "มิ.ย.": "06", "ก.ค.": "07", "ส.ค.": "08",
          "ก.ย.": "09", "ต.ค.": "10", "พ.ย.": "11", "ธ.ค.": "12",
        };

        const [d, m, y] = thaiDate.split(" ");
        return `${+y - 543}-${thMonths[m]}-${d.padStart(2, "0")}`;
      }


      const items = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id, // ✅ สำหรับแก้/ลบ
          name: data.name,
          date: data.date,
          description: data.description,
          rawDate: thaiDateToISO(data.date), // ✅ หากต้องการแปลง date กลับ yyyy-MM-dd ค่อยเพิ่ม
        };
      });

      const sorted = items.sort((a, b) => {
        const parse = (str: string) => {
          const thMonths: Record<string, number> = {
            "ม.ค.": 0, "ก.พ.": 1, "มี.ค.": 2, "เม.ย.": 3,
            "พ.ค.": 4, "มิ.ย.": 5, "ก.ค.": 6, "ส.ค.": 7,
            "ก.ย.": 8, "ต.ค.": 9, "พ.ย.": 10, "ธ.ค.": 11
          };
          const [d, m, y] = str.split(" ");
          return new Date(parseInt(y) - 543, thMonths[m], parseInt(d));
        };

        return parse(b.date).getTime() - parse(a.date).getTime();
      });

      setTimelineItems(sorted);
    };

    fetchAchievements();
    fetchTimeline();
  }, [policyId]);

  useEffect(() => {
    if (policyBanner) {
      const objectUrl = URL.createObjectURL(policyBanner);
      setBannerPreviewUrl(objectUrl);

      return () => URL.revokeObjectURL(objectUrl); // cleanup
    }
  }, [policyBanner]);


  useEffect(() => {
    if (!policyId) return;

    const loadPictures = async () => {
      try {
        const folderRef = ref(storage, `policy/picture/${policyId}`);
        const result = await listAll(folderRef);
        const urls = await Promise.all(
          result.items.map((itemRef) => getDownloadURL(itemRef))
        );
        setPictureUrls(urls);
      } catch (err) {
        console.error("ไม่พบภาพเพิ่มเติม:", err);
      }
    };

    loadPictures();
  }, [policyId]);

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    setFile: (file: File | null) => void
  ) => {
    if (event.target.files) setFile(event.target.files[0]);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    const isEditing = Boolean(policyId); // true = PUT, false = POST
    const idToUse = policyId ?? ""; // สำหรับใช้กับ path firebase ถ้ามี


    let bannerUrl = "";
    try {
      

      const payload = {
        ...(policyId && { id: policyId }),
        name: policyName,
        description: policyDes,
        banner: bannerUrl,
        category: policyCategory,
        party: partyName,
      };

      const res = await fetch("/api/prPolicyForm", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        alert("❌ บันทึกไม่สำเร็จ: " + text);
        return;
      }

      const { id: newId } = await res.json();
      const idUsed = isEditing ? policyId! : newId;
      const idStr = idUsed.toString();

      if (policyBanner) {
  const bannerRef = ref(storage, `policy/banner/${idUsed}.jpg`);
  await uploadBytes(bannerRef, policyBanner);
  bannerUrl = await getDownloadURL(bannerRef);
}

if (policyPDF) {
  const pdfRef = ref(storage, `policy/reference/${idUsed}.pdf`);
  await uploadBytes(pdfRef, policyPDF);
}
      // ✅ ใช้ idUsed สำหรับ Firebase Storage และ Firestore
      await setDoc(doc(firestore, "Policy", idStr, "achievement", "เชิงกระบวนการ"), {
        name: "เชิงกระบวนการ",
        description: achievementProcess,
      });

      if (pictures.length > 0) {
        const uploadPromises = pictures.map((file) => {
          const uniqueName = `${Date.now()}_${file.name}`;
          const picRef = ref(storage, `policy/picture/${idUsed}/${uniqueName}`);
          return uploadBytes(picRef, file);
        });

        await Promise.all(uploadPromises);

        const folderRef = ref(storage, `policy/picture/${idUsed}`);
        const result = await listAll(folderRef);
        const urls = await Promise.all(result.items.map((itemRef) => getDownloadURL(itemRef)));
        setPictureUrls(urls);
      }

      // ✅ อัปเดต achievement ทั้ง 3
      await Promise.all([
        setDoc(doc(firestore, "Policy", idStr, "achievement", "เชิงกระบวนการ"), {
          name: "เชิงกระบวนการ",
          description: achievementProcess,
        }),
        setDoc(doc(firestore, "Policy", idStr, "achievement", "เชิงการเมือง"), {
          name: "เชิงการเมือง",
          description: achievementPolicy,
        }),
        setDoc(doc(firestore, "Policy", idStr, "achievement", "เชิงโครงการ"), {
          name: "เชิงโครงการ",
          description: achievementProject,
        }),
      ]);

      // ✅ อัปเดต timeline
      const timelineRef = collection(firestore, "Policy", idStr, "sequence");
      const existingSnapshot = await getDocs(timelineRef);
      const existingIds = existingSnapshot.docs.map((doc) => doc.id);
      const currentIds = timelineItems.map((item) => item.id).filter((id) => id != null);

      const deletedIds = existingIds.filter((id) => !currentIds.includes(id));
      for (const id of deletedIds) {
        await deleteDoc(doc(firestore, "Policy", idUsed, "sequence", id));
      }

      for (const item of timelineItems) {
        if (item.id && item.id !== item.date.trim()) {
          await deleteDoc(doc(firestore, "Policy", idUsed, "sequence", item.id));
        }

        await setDoc(doc(firestore, "Policy", idStr, "sequence", item.date.trim()), {
          name: item.name,
          date: item.date,
          description: item.description,
        });
      }

      // ✅ ลบภาพที่ต้องลบ
      for (const path of picturesToDelete) {
        try {
          const fileRef = ref(storage, path);
          await deleteObject(fileRef);
        } catch (err) {
          console.warn("⚠️ ลบรูปไม่สำเร็จ:", err);
        }
      }

      alert("✅ บันทึกนโยบายสำเร็จ");
      router.replace("/prPolicy");
    } catch (err) {
      console.error("Error saving policy:", err);
      alert("❌ เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setIsSubmitting(false); // ✅ จบบันทึก
    }
  };


  return (
    <div className="min-h-screen bg-[#9795B5] flex">
      <PRSidebar />
      <div className="flex-1 md:ml-64">
        <header className="bg-white p-4 shadow-md flex justify-between items-center sticky top-0 z-10">
          <h1 className="text-2xl font-bold text-[#5D5A88]">PR พรรค {partyName}</h1>
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-3xl text-[#5D5A88]">☰</button>
          <ul className="hidden md:flex space-x-4">
            <li>
              <Link href="/login" className="text-[#5D5A88] px-4 py-2 hover:bg-gray-200 rounded-md">
                ออกจากระบบ
              </Link>
            </li>
          </ul>
        </header>

        <main className="p-6">
          <h2 className="text-3xl text-white text-center">ฟอร์มสำหรับกรอกข้อมูลนโยบาย</h2>
          <div className="mt-6 bg-white p-6 rounded-lg shadow-lg max-w-2xl mx-auto">
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block font-bold">ชื่อนโยบาย:</label>
              <input type="text" value={policyName} onChange={(e) => setPolicyName(e.target.value)} required disabled={!!policyId} className="w-full p-2 border border-gray-300 rounded-md" />

              <label className="block font-bold">หมวดหมู่นโยบาย:</label>
              <select value={policyCategory} onChange={(e) => setPolicyCategory(e.target.value)} required className="w-full p-2 border border-gray-300 rounded-md">
                {["เศรษฐกิจ", "สังคม คุณภาพชีวิต", "การเกษตร", "สิ่งแวดล้อม", "รัฐธรรมนูญ กฏหมาย", "บริหารงานภาครัฐ", "การศึกษา", "ความสัมพันธ์ระหว่างประเทศ", "อื่นๆ"]
                  .map((category) => <option key={category} value={category}>{category}</option>)}
              </select>

              <label className="block font-bold">รายละเอียดนโยบาย:</label>
              <textarea value={policyDes} onChange={(e) => setPolicyDes(e.target.value)} rows={5} required className="w-full p-2 border border-gray-300 rounded-md" />

              <label className="block font-bold">ความสำเร็จเชิงกระบวนการ:</label>
              <textarea value={achievementProcess} onChange={(e) => setAchievementProcess(e.target.value)} rows={2} className="w-full p-2 border border-gray-300 rounded-md" />

              <label className="block font-bold">ความสำเร็จเชิงการเมือง:</label>
              <textarea value={achievementPolicy} onChange={(e) => setAchievementPolicy(e.target.value)} rows={2} className="w-full p-2 border border-gray-300 rounded-md" />

              <label className="block font-bold">ความสำเร็จเชิงโครงการ:</label>
              <textarea value={achievementProject} onChange={(e) => setAchievementProject(e.target.value)} rows={2} className="w-full p-2 border border-gray-300 rounded-md" />

              {/* ลำดับเหตุการณ์ */}
              <label className="block font-bold mt-6">ลำดับเหตุการณ์ (Timeline):</label>

              {/* ปุ่มเพิ่มเหตุการณ์ */}
              <button
                type="button"
                onClick={() => setTimelineItems([{ name: "", date: "", description: "", rawDate: "" }, ...timelineItems])}
                className="bg-[#e0e0e0] px-4 py-2 rounded-md hover:bg-[#ccc] text-[#333]"
              >
                ➕ เพิ่มเหตุการณ์
              </button>

              {timelineItems.map((item, idx) => {
                const actualIndex = timelineItems.length - idx - 1;

                return (


                  <div key={item.id ?? idx} className="flex flex-col mb-4 border p-4 rounded-md relative bg-[#f9f9f9]">
                    <span className="text-[#5D5A88] font-bold mb-2">เหตุการณ์ที่ {timelineItems.length - idx}</span>

                    {timelineItems.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => {
                          const newItems = timelineItems.filter((_, i) => i !== idx);
                          setTimelineItems(newItems);
                        }}
                        className="text-red-600 hover:text-red-800 self-end mb-4"
                      >
                        ❌ ลบ
                      </button>
                    ) : (
                      <div className="text-sm text-gray-400 self-end mb-4">
                        จำเป็นต้องมีอย่างน้อย 1 รายการ
                      </div>
                    )}

                    <input
                      type="text"
                      placeholder="ชื่อเหตุการณ์"
                      value={item.name}
                      onChange={(e) => {
                        const newItems = [...timelineItems];
                        newItems[idx].name = e.target.value;
                        setTimelineItems(newItems);
                      }}
                      className="w-full mb-2 p-2 border border-gray-300 rounded-md"
                    />

                    <input
                      type="date"
                      value={item.rawDate}
                      onChange={(e) => {
                        const raw = e.target.value; // "2025-06-30"
                        if (!raw) return;

                        // ✅ แยกวัน เดือน ปี แบบไม่ใช้ Date
                        const [year, month, day] = raw.split("-").map(Number);

                        const thaiMonths = [
                          "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.",
                          "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.",
                          "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
                        ];

                        const formatted = `${day} ${thaiMonths[month - 1]} ${year + 543}`;

                        const newItems = [...timelineItems];
                        newItems[idx].rawDate = raw; // yyyy-MM-dd
                        newItems[idx].date = formatted; // 30 มิ.ย. 2568
                        setTimelineItems(newItems);
                      }}
                      className="w-full mb-2 p-2 border border-gray-300 rounded-md"
                    />



                    <textarea
                      placeholder="คำอธิบายเหตุการณ์"
                      value={item.description}
                      onChange={(e) => {
                        const newItems = [...timelineItems];
                        newItems[idx].description = e.target.value;
                        setTimelineItems(newItems);
                      }}
                      rows={2}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />


                  </div>
                );
              })}




              <label className="block font-bold">อัปโหลดแบนเนอร์ (JPG, PNG):</label>
              <input type="file" accept="image/jpeg, image/png" onChange={(e) => handleFileChange(e, setPolicyBanner)} />
              {bannerPreviewUrl && (
                <img src={bannerPreviewUrl} alt="Banner" className="w-full rounded-md mb-2" />
              )}

              {/* 🔽 อัปโหลดและ preview ภาพใหม่ที่เลือก */}
              <label className="block font-bold mt-4">อัปโหลดรูปภาพเพิ่มเติม:</label>

              <input

                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = e.target.files;
                  if (files) {
                    setPictures((prev) => [...prev, ...Array.from(files)]);
                  }
                }}
                className="w-full"
              />

              {/* 🔽 preview รูปที่ยังไม่อัปโหลด */}
              {pictures.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-bold text-[#5D5A88] mb-2">รูปภาพที่เลือกไว้:</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {pictures.map((file, idx) => (

                      <div key={idx} className="relative">
                        <img
                          src={previewUrls[idx]}
                          alt={`preview-${idx}`}
                          className="rounded-md shadow-md w-full h-auto"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = pictures.filter((_, i) => i !== idx);
                            setPictures(updated);
                          }}
                          className="absolute top-2 right-2 text-white bg-red-500 rounded-full px-2 py-0.5 text-xs hover:bg-red-700"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}


              {/* 🔽 รูปจาก Storage ที่อัปโหลดแล้ว */}
              {pictureUrls.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-bold text-[#5D5A88] mb-2">ภาพที่อัปโหลดแล้ว:</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {pictureUrls.map((url, idx) => (
                      <div key={idx} className="relative">
                        <img
                          src={url}
                          alt={`uploaded-${idx}`}
                          className="rounded-md shadow-md w-full h-auto"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            const decodedUrl = decodeURIComponent(url);
                            const match = decodedUrl.match(/\/o\/(.+)\?/);
                            const path = match ? match[1] : null;

                            if (!path) {
                              alert("ไม่สามารถดึง path ของรูปได้");
                              return;
                            }

                            // ✅ เก็บ path ไว้ในรายการที่จะลบภายหลัง
                            setPicturesToDelete((prev) => [...prev, path]);

                            // ✅ ลบออกจาก preview บนหน้าเว็บเท่านั้น
                            const updated = pictureUrls.filter((_, i) => i !== idx);
                            setPictureUrls(updated);
                          }}
                          className="absolute top-2 right-2 bg-red-600 text-white rounded-full px-2 py-0.5 text-sm hover:bg-red-700"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}




              <label className="block font-bold">อัปโหลดเอกสารอ้างอิง (PDF):</label>
              <input type="file" accept="application/pdf" onChange={(e) => handleFileChange(e, setPolicyPDF)} />
              {pdfPreviewUrl && (
                <a href={pdfPreviewUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                  🔗 ดูเอกสารอ้างอิง (PDF)
                </a>
              )}

              <button
                type="submit"
                className={`w-full p-3 rounded-md mt-4 text-white ${isSubmitting ? "bg-gray-400 cursor-not-allowed" : "bg-[#5D5A88] hover:bg-[#46426b]"}`}
                disabled={isSubmitting}
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