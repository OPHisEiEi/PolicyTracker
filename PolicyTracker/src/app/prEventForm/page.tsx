// ✅ page.tsx - Event Form Page (with province dropdown and map marker)
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import PRSidebar from "../components/PRSidebar";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";


const containerStyle = {
  width: "100%",
  height: "400px",
};

const PROVINCES = [
  "กรุงเทพมหานคร", "กระบี่", "กาญจนบุรี", "กาฬสินธุ์", "กำแพงเพชร",
  "ขอนแก่น", "จันทบุรี", "ฉะเชิงเทรา", "ชลบุรี", "ชัยนาท", "ชัยภูมิ",
  "ชุมพร", "เชียงราย", "เชียงใหม่", "ตรัง", "ตราด", "ตาก", "นครนายก",
  "นครปฐม", "นครพนม", "นครราชสีมา", "นครศรีธรรมราช", "นครสวรรค์",
  "นนทบุรี", "นราธิวาส", "น่าน", "บึงกาฬ", "บุรีรัมย์", "ปทุมธานี",
  "ประจวบคีรีขันธ์", "ปราจีนบุรี", "ปัตตานี", "พระนครศรีอยุธยา",
  "พะเยา", "พังงา", "พัทลุง", "พิจิตร", "พิษณุโลก", "เพชรบุรี",
  "เพชรบูรณ์", "แพร่", "ภูเก็ต", "มหาสารคาม", "มุกดาหาร", "แม่ฮ่องสอน",
  "ยโสธร", "ยะลา", "ร้อยเอ็ด", "ระนอง", "ระยอง", "ราชบุรี", "ลพบุรี",
  "ลำปาง", "ลำพูน", "เลย", "ศรีสะเกษ", "สกลนคร", "สงขลา", "สตูล",
  "สมุทรปราการ", "สมุทรสงคราม", "สมุทรสาคร", "สระแก้ว", "สระบุรี",
  "สิงห์บุรี", "สุโขทัย", "สุพรรณบุรี", "สุราษฎร์ธานี", "สุรินทร์",
  "หนองคาย", "หนองบัวลำภู", "อ่างทอง", "อำนาจเจริญ", "อุดรธานี",
  "อุตรดิตถ์", "อุทัยธานี", "อุบลราชธานี"
];

export default function PREventForm() {
  const [eventName, setEventName] = useState("");
  const [policyName, setPolicyName] = useState("");
  const [eventDes, setEventDes] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [province, setProvince] = useState("");
  const [markerPos, setMarkerPos] = useState<{ lat: number; lng: number } | null>(null);
  const [partyName, setPartyName] = useState("ไม่ทราบชื่อพรรค");
  const [policies, setPolicies] = useState<string[]>([]);
  const [campaigns, setCampaigns] = useState<string[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [eventStatus, setEventStatus] = useState("เริ่มต้น");
  const searchParams = useSearchParams();
  const eventId = searchParams.get("event_id");
  const isEditing = !!eventId;
  const libraries: ("places")[] = ["places"];


  const router = useRouter();

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries, // ✅ ใช้จาก const เดิม ไม่สร้างใหม่
  });
  

  useEffect(() => {
    const stored = localStorage.getItem("partyName");
    if (stored) {
      setPartyName(stored);
      fetch(`/api/prEventForm?party=${encodeURIComponent(stored)}`)
        .then((res) => res.json())
        .then((data) => setPolicies(data.policies || []));
    } else {
      alert("ไม่พบข้อมูลพรรค กรุณาเข้าสู่ระบบใหม่");
    }
  }, []);

  useEffect(() => {
    if (policyName) {
      fetch(`/api/prEventForm?policy=${encodeURIComponent(policyName)}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data.campaigns)) {
            setCampaigns(data.campaigns);
          } else {
            setCampaigns([]);
          }
        });
    } else {
      setCampaigns([]);
    }
  }, [policyName]);

  useEffect(() => {
    if (!eventId) return;

    const fetchEventData = async () => {
      const res = await fetch(`/api/pr-event/${eventId}`);
      const data = await res.json();

      setEventName(data.name || "");
      setEventDes(data.description || "");
      setEventDate(data.date || "");
      setEventTime(data.time || "");
      setEventLocation(data.location || "");
      setProvince(data.province || "");
      setMarkerPos(data.map ? {
        lat: parseFloat(data.map.split(",")[0]),
        lng: parseFloat(data.map.split(",")[1]),
      } : null);
      setPolicyName(data.policy || "");
      setSelectedCampaign(data.campaign || "");
      setEventStatus(data.status || "เริ่มต้น"); // ✅ โหลดสถานะ
       console.log("📦 Event province:", data.province);
    };

    fetchEventData();
  }, [eventId]);



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  
    if (!markerPos || !province) {
      alert("กรุณาเลือกตำแหน่งและจังหวัด");
      return;
    }
  
    const payload = {
      id: eventId, 
      name: eventName,
      description: eventDes,
      date: eventDate,
      time: eventTime,
      location: eventLocation,
      province,
      map: `${markerPos.lat},${markerPos.lng}`,
      policy: policyName,
      party: partyName,
      campaign: selectedCampaign,
      status: eventStatus,
    };
  
    console.log("🔧 Event ID ส่งไป:", eventId);
console.log("📦 payload:", payload);


    const res = await fetch("/api/prEventForm", {
      method: eventId ? "PUT" : "POST", // ✅ สร้างใหม่ vs แก้ไข
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  
    if (res.ok) {
      alert(eventId ? "✅ แก้ไขกิจกรรมสำเร็จ" : "✅ บันทึกกิจกรรมสำเร็จ");
      router.push("/prEvent");
    } else {
      const text = await res.text();
      alert("❌ บันทึกไม่สำเร็จ: " + text);
    }
  };
  

  return (
    <div className="min-h-screen bg-[#9795B5] flex">
      <PRSidebar />
      <div className="flex-1 md:ml-64 p-6">
        <h2 className="text-3xl text-white text-center">ฟอร์มกิจกรรม</h2>
        <div className="mt-6 bg-white p-6 rounded-lg shadow-lg max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block font-bold">ชื่อกิจกรรม:</label>
            <input required value={eventName} onChange={(e) => setEventName(e.target.value)} className="w-full p-2 border rounded" />

            <label className="block font-bold">รายละเอียดกิจกรรม:</label>
            <textarea required value={eventDes} onChange={(e) => setEventDes(e.target.value)} className="w-full p-2 border rounded" />

            {isEditing && (
              <>
                <label className="block font-bold">สถานะกิจกรรม:</label>
                <select
                  value={eventStatus}
                  onChange={(e) => setEventStatus(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="เริ่มต้น">เริ่มต้น</option>
                  <option value="กำลังดำเนินการ">กำลังดำเนินการ</option>
                  <option value="เสร็จสิ้น">เสร็จสิ้น</option>
                  <option value="ยกเลิก">ยกเลิก</option>
                </select>
              </>
            )}


            <label className="block font-bold">วันจัดกิจกรรม:</label>
            <input required type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="w-full p-2 border rounded" />

            <label className="block font-bold">เวลา:</label>
            <input required value={eventTime} onChange={(e) => setEventTime(e.target.value)} className="w-full p-2 border rounded" />

            <label className="block font-bold">สถานที่:</label>
            <input required value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} className="w-full p-2 border rounded" />

            <label className="block font-bold">จังหวัดที่จัดกิจกรรม:</label>
            <select required value={province} onChange={(e) => setProvince(e.target.value)} className="w-full p-2 border rounded">
              <option value="">-- เลือกจังหวัด --</option>
              {PROVINCES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            <label className="block font-bold">นโยบายที่เกี่ยวข้อง:</label>
            <select value={policyName} onChange={(e) => setPolicyName(e.target.value)} className="w-full p-2 border rounded">
              <option value="">-- ไม่เลือกนโยบาย --</option>
              {policies.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            <label className="block font-bold">โครงการที่เกี่ยวข้อง:</label>
            <select value={selectedCampaign} onChange={(e) => setSelectedCampaign(e.target.value)} className="w-full p-2 border rounded">
              <option value="">-- ไม่เลือกโครงการ --</option>
              {campaigns.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
             
            <label className="block font-bold">เลือกตำแหน่งบนแผนที่:</label>
            {isLoaded && (
              <GoogleMap
                mapContainerStyle={containerStyle}
                center={markerPos || { lat: 13.736717, lng: 100.523186 }}
                zoom={markerPos ? 14 : 12}
                onClick={(e) =>
                  setMarkerPos({ lat: e.latLng?.lat() || 0, lng: e.latLng?.lng() || 0 })
                }
              >
                {markerPos && <Marker position={markerPos} />}
              </GoogleMap>
            )}

            <button type="submit" className="w-full bg-[#5D5A88] text-white py-2 rounded">บันทึก</button>
            
          </form>
        </div>
      </div>
    </div>
  );
}
