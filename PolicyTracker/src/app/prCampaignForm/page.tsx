"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ref, uploadBytes, getDownloadURL, listAll, deleteObject, } from "firebase/storage";
import { storage } from "@/app/lib/firebase";
import PRSidebar from "@/app/components/PRSidebar";

export default function PRCampaignForm() {

  interface PolicyOption {
    id: string;
    name: string;
  }

  const [menuOpen, setMenuOpen] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [campaignDes, setCampaignDes] = useState("");
  const [policyId, setPolicyId] = useState<string>("");
  const [policyName, setPolicyName] = useState("");
  const [campaignStatus, setCampaignStatus] = useState("เริ่มโครงการ");
  const [campaignBudget, setCampaignBudget] = useState("");
  const [expenses, setExpenses] = useState([{ description: "", amount: "" }]);
  const [campaignBanner, setCampaignBanner] = useState<File | null>(null);
  const [campaignRef, setCampaignRef] = useState<File | null>(null);
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(null);
  const [refPreviewUrl, setRefPreviewUrl] = useState<string | null>(null);
  const [partyName, setPartyName] = useState("ไม่ทราบชื่อพรรค");
  const [policies, setPolicies] = useState<PolicyOption[]>([]);
  const [area, setArea] = useState("เขตเดียว");
  const [impact, setImpact] = useState("ต่ำ");
  const [size, setSize] = useState("เล็ก");
  const [campaignPictures, setCampaignPictures] = useState<File[]>([]);
  const [uploadedPictureUrls, setUploadedPictureUrls] = useState<string[]>([]);
  const [picturesToDelete, setPicturesToDelete] = useState<string[]>([]);
  const [partyId, setPartyId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const searchParams = useSearchParams();
  const campaignId = searchParams.get("campaign_id");

  const router = useRouter();

  useEffect(() => {
    type Area = "เขตเดียว" | "หลายเขต" | "ทั่วประเทศ";
    type Impact = "ต่ำ" | "ปานกลาง" | "สูง";
    type Size = "เล็ก" | "กลาง" | "ใหญ่";

    const mapSize: Record<`${Area}-${Impact}`, Size> = {
      "เขตเดียว-ต่ำ": "เล็ก",
      "เขตเดียว-ปานกลาง": "เล็ก",
      "เขตเดียว-สูง": "กลาง",
      "หลายเขต-ต่ำ": "เล็ก",
      "หลายเขต-ปานกลาง": "กลาง",
      "หลายเขต-สูง": "ใหญ่",
      "ทั่วประเทศ-ต่ำ": "กลาง",
      "ทั่วประเทศ-ปานกลาง": "ใหญ่",
      "ทั่วประเทศ-สูง": "ใหญ่",
    };

    const key = `${area}-${impact}` as `${Area}-${Impact}`;
    setSize(mapSize[key] || "เล็ก");
  }, [area, impact]);

  useEffect(() => {
    const storedId = localStorage.getItem("partyId");
    const storedName = localStorage.getItem("partyName");

    if (storedId) {
      setPartyId(Number(storedId));
      fetch(`/api/prCampaignForm?party_id=${storedId}`)
        .then((res) => res.json())
        .then((data) => {
          let list = data ?? [];
          if (!list.some((p: { name: string }) => p.name === "โครงการพิเศษ")) {
            list = [{ id: "special", name: "โครงการพิเศษ" }, ...list];
          }
          setPolicies(list);
        });
    }
    if (storedName) {
      setPartyName(storedName);
    }

  }, []);


  useEffect(() => {
    if (!campaignId || isNaN(Number(campaignId))) return;

    const fetchCampaign = async () => {
      const res = await fetch(`/api/pr-campaign/${campaignId}`);
      const data = await res.json();

      setCampaignName(data.name || "");
      setCampaignDes(data.description || "");
      setPolicyName(data.policy_id ? `${data.policy_id}|${data.policy}` : "");
      setCampaignStatus(data.status || "เริ่มโครงการ");
      setCampaignBudget(data.budget?.toString() || "");
      setArea(data.area || "เขตเดียว");
      setImpact(data.impact || "ต่ำ");
      setSize(data.size || "เล็ก");
      setExpenses(data.expenses || [{ description: "", amount: "" }]);

      if (!data.isSpecial) {
        setPolicyId(data.policyId?.toString() || "");
      } else {
        setPolicyId("special");
      }

      try {
        setRefPreviewUrl(await getDownloadURL(ref(storage, `campaign/reference/${campaignId}.pdf`)));
      } catch { }

      try {
        const listResult = await listAll(ref(storage, `campaign/picture/${campaignId}`));
        const urls = await Promise.all(listResult.items.map((item) => getDownloadURL(item)));
        setUploadedPictureUrls(urls);
      } catch { }
    };

    fetchCampaign();
  }, [campaignId]);

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    setFile: (file: File | null) => void
  ) => {
    if (event.target.files) setFile(event.target.files[0]);
  };

  const handleExpenseChange = (index: number, field: "description" | "amount", value: string) => {
    const updated = [...expenses];
    updated[index] = { ...updated[index], [field]: value };
    setExpenses(updated);
  };

  const addExpenseRow = () => {
    setExpenses([...expenses, { description: "", amount: "" }]);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    const isSpecial = policyId === "special";
    let finalId: string | null = campaignId;

    try {
      const payload = {
        ...(campaignId && !isNaN(Number(campaignId)) && { id: Number(campaignId) }),
        name: campaignName,
        description: campaignDes,
        status: campaignStatus,
        policy: isSpecial ? "โครงการพิเศษ" : policyName,
        policyId: isSpecial ? null : Number(policyId),
        partyId: Number(partyId),
        budget: Number(campaignBudget),
        expenses: expenses.map((e) => ({ ...e, amount: Number(e.amount) })),
        partyName,
        area,
        impact,
        size,
      };

      const res = await fetch(campaignId ? `/api/pr-campaign/${campaignId}` : `/api/prCampaignForm`, {
        method: campaignId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      finalId = campaignId || result.id?.toString();
      if (!res.ok || !finalId) {
        alert("ไม่สามารถบันทึกข้อมูลได้");
        return;
      }

      if (campaignRef) {
        await uploadBytes(ref(storage, `campaign/reference/${finalId}.pdf`), campaignRef);
      }

      if (picturesToDelete.length > 0) {
        for (const path of picturesToDelete) {
          try {
            await deleteObject(ref(storage, path));
          } catch (err) {
            console.warn("ลบรูปไม่สำเร็จ:", err);
          }
        }
      }

      if (campaignPictures.length > 0) {
        for (const file of campaignPictures) {
          const timestamp = Date.now();
          const ext = file.name.split('.').pop();
          const random = Math.random().toString(36).substring(2, 8);
          const filename = `${timestamp}_${random}.${ext}`;
          await uploadBytes(ref(storage, `campaign/picture/${finalId}/${filename}`), file);
        }
      }


      alert(campaignId ? "แก้ไขโครงการสำเร็จ" : "สร้างโครงการสำเร็จ");
      router.push("/prCampaign");
    } catch (err) {
      console.error("Error saving campaign:", err);
      alert("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="min-h-screen bg-cover bg-center flex" style={{ backgroundImage: "url('/bg/ผีเสื้อ.jpg')" }}>
      <PRSidebar />
      <div className="flex-1 md:ml-64">
        <header className="bg-white p-4 shadow-md flex justify-between items-center sticky top-0 z-10">
          <h1 className="text-2xl font-bold text-[#5D5A88]">PR พรรค {partyName}</h1>
        </header>

        <main className="p-6">
          <h2 className="text-3xl text-white text-center">ฟอร์มสำหรับกรอกข้อมูลโครงการ</h2>
          <div className="mt-6 bg-white p-6 rounded-lg shadow-lg max-w-2xl mx-auto">
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block font-bold">ชื่อโครงการ:</label>
              <input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} required placeholder="สร้าง Floodway ขนาดใหญ่" className="w-full p-2 border border-gray-300 rounded-md" />

              <label className="block font-bold">รายละเอียดโครงการ:</label>
              <textarea value={campaignDes} onChange={(e) => setCampaignDes(e.target.value)} rows={5} required
                placeholder="นอกจากการขุดลอกคูคลอง แน่นอนว่าต้องมีนโยบายและโครงสร้างขนาดใหญ่อื่นๆ มารองรับ โดยเฉพาะกรุงเทพมหานครที่มีโอกาสถูกน้ำท่วมเมืองได้ หนึ่งในโครงสร้างใหญ่ คือการสร้าง Floodway เพื่อแก้ปัญหาน้ำท่วมเมืองอย่างจริงจัง"
                className="w-full p-2 border border-gray-300 rounded-md" />

              <label className="block font-bold">นโยบายที่เกี่ยวข้อง:</label>
              <select
                value={policyId}
                onChange={(e) => {
                  const selected = e.target.value;
                  setPolicyId(selected);
                  if (selected === "special") {
                    setPolicyName("โครงการพิเศษ");
                  } else {
                    const found = policies.find((p) => p.id.toString() === selected);
                    setPolicyName(found?.name || "");
                  }
                }}
                required
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="">-- เลือกนโยบาย --</option>
                {policies.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>


              <label className="block font-bold">สถานะโครงการ:</label>
              <select value={campaignStatus} onChange={(e) => setCampaignStatus(e.target.value)} required className="w-full p-2 border border-gray-300 rounded-md">
                {["เริ่มโครงการ", "วางแผน", "ตัดสินใจ", "ดำเนินการ", "ประเมินผล"].map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>

              <label className="block font-bold">พื้นที่ดำเนินการ:</label>
              <select value={area} onChange={(e) => setArea(e.target.value)} required className="w-full p-2 border border-gray-300 rounded-md">
                {["เขตเดียว", "หลายเขต", "ทั่วประเทศ"].map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>

              <label className="block font-bold">ระดับผลกระทบ:</label>
              <select value={impact} onChange={(e) => setImpact(e.target.value)} required className="w-full p-2 border border-gray-300 rounded-md">
                {["ต่ำ", "ปานกลาง", "สูง"].map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>

              <label className="block font-bold">ขนาดโครงการ (อัตโนมัติ):</label>
              <input value={size} readOnly className="w-full p-2 border border-gray-300 rounded-md bg-gray-100" />

              <label className="block font-bold">งบประมาณที่ได้รับ (บาท):</label>
              <input
                type="text"
                inputMode="numeric"
                value={Number(campaignBudget || 0).toLocaleString("th-TH")}
                onChange={(e) => {
                  const raw = e.target.value.replace(/,/g, "");
                  const numeric = parseInt(raw, 10) || 0;
                  setCampaignBudget(numeric.toString());
                }}
                required
                placeholder="4,500,000"
                className="w-full p-2 border border-gray-300 rounded-md"
              />


              <label className="block font-bold">รายการรายจ่าย:</label>
              {expenses.map((exp, idx) => (
                <div key={idx} className="flex space-x-2">
                  <input
                    type="text"
                    value={exp.description}
                    onChange={(e) => handleExpenseChange(idx, "description", e.target.value)}
                    placeholder="ค่าดำเนินการ"
                    className="w-2/3 p-2 border rounded"
                  />

                  <input
                    type="text"
                    inputMode="numeric"
                    value={Number(exp.amount || 0).toLocaleString("th-TH")}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/,/g, "");
                      const numeric = parseInt(raw, 10) || 0;
                      handleExpenseChange(idx, "amount", numeric.toString());
                    }}
                    placeholder="จำนวนเงิน"
                    className="w-1/3 p-2 border rounded"
                  />
                </div>
              ))}
              <button type="button" onClick={addExpenseRow} className="text-sm text-blue-500">+ เพิ่มรายการ</button>

              <p className="text-gray-500">
                รวมรายจ่ายทั้งหมด: {expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0).toLocaleString()} บาท
              </p>

              <label className="block font-bold">อัปโหลดรูปภาพเพิ่มเติม:</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  if (e.target.files) {
                    setCampaignPictures([...campaignPictures, ...Array.from(e.target.files)]);
                  }
                }}
                className="w-full"
              />

              {campaignPictures.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-bold text-[#5D5A88] mb-2">รูปภาพที่เลือกไว้:</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {campaignPictures.map((file, idx) => (
                      <div key={idx} className="relative">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`preview-${idx}`}
                          className="rounded-md shadow-md w-full h-auto"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setCampaignPictures(campaignPictures.filter((_, i) => i !== idx))
                          }
                          className="absolute top-2 right-2 text-white bg-red-500 rounded-full px-2 py-0.5 text-xs hover:bg-red-700"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {uploadedPictureUrls.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-bold text-[#5D5A88] mb-2">ภาพที่อัปโหลดแล้ว:</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {uploadedPictureUrls.map((url, idx) => (
                      <div key={idx} className="relative">
                        <img
                          src={url}
                          alt={`uploaded-${idx}`}
                          className="rounded-md shadow-md w-full"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const match = decodeURIComponent(url).match(/\/o\/(.+)\?/);
                            const path = match?.[1];
                            if (!path) return;

                            setPicturesToDelete((prev) => [...prev, path]);
                            setUploadedPictureUrls(uploadedPictureUrls.filter((_, i) => i !== idx));
                          }}
                          className="absolute top-2 right-2 text-white bg-red-600 rounded-full px-2 py-0.5 text-xs hover:bg-red-700"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <label className="block font-bold">เอกสารอ้างอิง (PDF):</label>
              <input type="file" accept="application/pdf" onChange={(e) => handleFileChange(e, setCampaignRef)} />
              {refPreviewUrl && (
                <a href={refPreviewUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline block mt-2">ดูเอกสาร (PDF)</a>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full p-3 rounded-md mt-4 transition
    ${isSubmitting ? "bg-gray-400 cursor-not-allowed" : "bg-[#5D5A88] hover:bg-[#46426b] text-white"}`}
              >
                {isSubmitting
                  ? "⏳ กำลังบันทึก..."
                  : campaignId
                    ? "บันทึกการแก้ไข"
                    : "บันทึกโครงการ"}
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
