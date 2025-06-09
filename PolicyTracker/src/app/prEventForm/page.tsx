"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import PRSidebar from "../components/PRSidebar";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { ref, uploadBytes, getDownloadURL, listAll, deleteObject, } from "firebase/storage";
import { storage } from "@/app/lib/firebase";
import { useGoogleMapsLoader } from "@/app/lib/googleMapsLoader";
import { Autocomplete } from "@react-google-maps/api";

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
  const searchParams = useSearchParams();
  const eventId = searchParams.get("event_id");
  const isEditing = !!eventId;
  const router = useRouter();

  const [eventName, setEventName] = useState("");
  const [policyName, setPolicyName] = useState("");
  const [eventDes, setEventDes] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [province, setProvince] = useState("");
  const [markerPos, setMarkerPos] = useState<{ lat: number; lng: number } | null>(null);
  const [partyId, setPartyId] = useState("");
  const [policies, setPolicies] = useState<string[]>([]);
  const [campaigns, setCampaigns] = useState<string[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [eventStatus, setEventStatus] = useState("เริ่มต้น");

  const [eventPictures, setEventPictures] = useState<File[]>([]);
  const [uploadedPictureUrls, setUploadedPictureUrls] = useState<string[]>([]);
  const [picturesToDelete, setPicturesToDelete] = useState<string[]>([]);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const { isLoaded } = useGoogleMapsLoader();
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  const fullTimeRange = `${startTime} - ${endTime}`;

  useEffect(() => {
    const stored = localStorage.getItem("partyId");
    if (stored) {
      setPartyId(stored);
      fetch(`/api/prEventForm?party=${encodeURIComponent(stored)}`)
        .then((res) => res.json())
        .then((data) => setPolicies(data.policies || []));
    } else {
      alert("ไม่พบข้อมูลพรรค กรุณาเข้าสู่ระบบใหม่");
    }
  }, []);

  useEffect(() => {
    setSelectedCampaign("");
    setCampaigns([]);
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

      if (data.date?.includes(" - ")) {
        const [start, end] = data.date.split(" - ");
        setStartDate(start.trim());
        setEndDate(end.trim());
      } else {
        setStartDate(data.date || "");
        setEndDate("");
      }
      setEventName(data.name || "");
      setEventDes(data.description || "");
      setEventDate(data.date || "");
      setEventTime(data.time || "");
      setEventLocation(data.location || "");
      setProvince(data.province || "");
      setPolicyName(data.policy || "");
      setSelectedCampaign(data.campaign || "");
      setEventStatus(data.status || "เริ่มต้น");

      setMarkerPos(data.map ? {
        lat: parseFloat(data.map.split(",")[0]),
        lng: parseFloat(data.map.split(",")[1]),
      } : null);

      try {
        const folderRef = ref(storage, `event/picture/${eventId}`);
        const listResult = await listAll(folderRef);
        const urls = await Promise.all(listResult.items.map((item) => getDownloadURL(item)));
        setUploadedPictureUrls(urls);
      } catch (err) {
        console.warn("ไม่พบภาพกิจกรรม:", err);
      }

      try {
        const bannerJpg = `event/banner/${eventId}.jpg`;
        const bannerPng = `event/banner/${eventId}.png`;
        try {
          const jpgUrl = await getDownloadURL(ref(storage, bannerJpg));
          setBannerPreview(jpgUrl);
        } catch {
          const pngUrl = await getDownloadURL(ref(storage, bannerPng));
          setBannerPreview(pngUrl);
        }
      } catch {
        setBannerPreview(null);
      }
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
      date: `${startDate} - ${endDate}`,
      time: `${startTime} - ${endTime}`,
      location: eventLocation,
      province,
      map: `${markerPos.lat},${markerPos.lng}`,
      policy: policyName,
      partyId,
      campaign: selectedCampaign,
      status: eventStatus,
    };

    const res = await fetch("/api/prEventForm", {
      method: eventId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await res.json();
    const id = eventId || result.id;
    if (!id) {
      alert("ไม่พบ event ID ไม่สามารถอัปโหลดไฟล์ได้");
      return;
    }

    if (bannerFile) {
      const fileExt = bannerFile.name.split(".").pop()?.toLowerCase() === "png" ? "png" : "jpg";
      const bannerRef = ref(storage, `event/banner/${id}.${fileExt}`);
      await uploadBytes(bannerRef, bannerFile);
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

    if (eventPictures.length > 0) {
  for (const file of eventPictures) {
    const timestamp = Date.now();
    const ext = file.name.split('.').pop();
    const random = Math.random().toString(36).substring(2, 8);
    const filename = `${timestamp}_${random}.${ext}`;
    const imageRef = ref(storage, `event/picture/${id}/${filename}`);
    await uploadBytes(imageRef, file);
  }
}

    if (res.ok) {
      alert(eventId ? "แก้ไขกิจกรรมสำเร็จ" : "บันทึกกิจกรรมสำเร็จ");
      router.push("/prEvent");
    } else {
      const text = await res.text();
      alert("บันทึกไม่สำเร็จ: " + text);
    }
  };

  useEffect(() => {
    if (eventTime.includes("-")) {
      const [start, end] = eventTime.split(" - ");
      setStartTime(start.trim());
      setEndTime(end.trim());
    } else {
      setStartTime(eventTime);
      setEndTime(""); 
    }
  }, [eventTime]);

  useEffect(() => {
    const found = PROVINCES.find((prov) => eventLocation.includes(prov));
    if (found) setProvince(found);
  }, [eventLocation]);

  return (
    <div className="min-h-screen bg-cover bg-center flex" style={{ backgroundImage: "url('/bg/ผีเสื้อ.jpg')" }}>
      <PRSidebar />
      <div className="flex-1 md:ml-64 p-6">
        <h2 className="text-3xl text-white text-center">ฟอร์มกิจกรรม</h2>
        <div className="mt-6 bg-white p-6 rounded-lg shadow-lg max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block font-bold">ชื่อกิจกรรม:</label>
            <input required value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="สมาชิกสัมพันธ์ ประชาสัมพันธ์การเลือกตั้งตัวแทนพรรคประจำอำเภอหาดใหญ่" className="w-full p-2 border rounded" />

            <label className="block font-bold">รายละเอียดกิจกรรม:</label>
            <textarea required value={eventDes} onChange={(e) => setEventDes(e.target.value)}
              placeholder="สมาชิกพรรคถือเป็นหัวใจหลักของการทำพรรคการเมืองแบบพรรคมวลชนอย่างพรรคประชาชน ดังนั้นพรรคประชาชน จึงอยากขอเชิญชวนสมาชิกพรรคในจังหวัดสงขลา มาร่วมในการประชุมเพื่อการเตรียมความพร้อมในการเลือกตั้งตัวแทนพรรคประจำอำเภอหาดใหญ่ ซึ่งเป็นอำเภอที่มีสมาชิกมากกว่า 100 คน และมีศักยภาพในก่ารเลือกตั้งตามระบบของพรรค เพื่อเลือกตัวแทนเข้าไปเป็นปากเป็นเสียงให้กับสมาชิก ผ่านระบบประชาธิปไตยแบบเลือกตัวแทน และหวังว่าสมาชิกในพื้นที่จะได้รู้จัก และเลือกบุคคลอันมีคุณภาพ เพื่อเข้าไปทำงานในพื้นที่ได้อย่างต่อเนื่อง"
              className="w-full p-2 border rounded" />

            {isEditing && (
              <>
                <label className="block font-bold">สถานะกิจกรรม:</label>
                <select value={eventStatus} onChange={(e) => setEventStatus(e.target.value)} className="w-full p-2 border rounded">
                  <option value="เริ่มต้น">เริ่มต้น</option>
                  <option value="กำลังดำเนินการ">กำลังดำเนินการ</option>
                  <option value="เสร็จสิ้น">เสร็จสิ้น</option>
                  <option value="ยกเลิก">ยกเลิก</option>
                </select>
              </>
            )}

            <label className="block font-bold">ช่วงวันที่:</label>
            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="p-2 border rounded"
              />
              <span>–</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="p-2 border rounded"
              />
            </div>

            <label className="block font-bold">ช่วงเวลา:</label>
            <div className="flex items-center space-x-2">
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-1/2 p-2 border rounded"
              />
              <span>–</span>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-1/2 p-2 border rounded"
              />
            </div>

            <label className="block font-bold">สถานที่ (ค้นหาจาก Google Maps):</label>
            {isLoaded && (
              <Autocomplete
                onLoad={(auto) => setAutocomplete(auto)}
                onPlaceChanged={() => {
                  if (autocomplete !== null) {
                    const place = autocomplete.getPlace();
                    const address = place.formatted_address;
                    const lat = place.geometry?.location?.lat();
                    const lng = place.geometry?.location?.lng();
                    if (address) setEventLocation(address);
                    if (lat && lng) setMarkerPos({ lat, lng });
                  }
                }}
              >
                <input
                  type="text"
                  placeholder="ค้นหาสถานที่..."
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </Autocomplete>
            )}
            <p className="text-sm text-gray-600 mt-2">
              จังหวัดที่ตรวจพบจากสถานที่: <span className="font-semibold">{province || "ไม่พบ"}</span>
            </p>

            <label className="block font-bold">นโยบายที่เกี่ยวข้อง:</label>
            <select value={policyName} onChange={(e) => setPolicyName(e.target.value)} className="w-full p-2 border rounded">
              <option value="">-- ไม่เลือกนโยบาย --</option>
              {policies.map((p, idx) => (
                <option key={`policy-${idx}`} value={p}>{p}</option>
              ))}
            </select>

            <label className="block font-bold">โครงการที่เกี่ยวข้อง:</label>
            <select value={selectedCampaign} onChange={(e) => setSelectedCampaign(e.target.value)} className="w-full p-2 border rounded">
              <option value="">-- ไม่เลือกโครงการ --</option>
              {campaigns.map((c, idx) => (
                <option key={`campaign-${idx}`} value={c}>{c}</option>
              ))}
            </select>

            <label className="block font-bold">เลือกตำแหน่งบนแผนที่:</label>
            {isLoaded && (
              <GoogleMap
                mapContainerStyle={{ width: "100%", height: "400px" }}
                center={markerPos || { lat: 13.736717, lng: 100.523186 }}
                zoom={markerPos ? 14 : 12}
                onClick={(e) => {
                  const lat = e.latLng?.lat() || 0;
                  const lng = e.latLng?.lng() || 0;
                  setMarkerPos({ lat, lng });

                  const geocoder = new window.google.maps.Geocoder();
                  geocoder.geocode({ location: { lat, lng } }, (results, status) => {
                    if (status === "OK" && results && results[0]) {
                      setEventLocation(results[0].formatted_address);
                    }
                  });
                }}
              >
                {markerPos && <Marker position={markerPos} />}
              </GoogleMap>
            )}
            <p className="text-sm text-gray-600 mt-2">
              จังหวัดที่ตรวจพบจากสถานที่: <span className="font-semibold">{province || "ไม่พบ"}</span>
            </p>

            <label className="block font-bold">อัปโหลดรูปภาพเพิ่มเติม:</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                if (e.target.files) {
                  setEventPictures([...eventPictures, ...Array.from(e.target.files)]);
                }
              }}
              className="w-full"
            />

            {eventPictures.length > 0 && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                {eventPictures.map((file, idx) => (
                  <div key={idx} className="relative">
                    <img src={URL.createObjectURL(file)} className="rounded shadow w-full" />
                    <button
                      type="button"
                      onClick={() => setEventPictures(eventPictures.filter((_, i) => i !== idx))}
                      className="absolute top-2 right-2 bg-red-600 text-white rounded-full text-xs px-2"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {uploadedPictureUrls.length > 0 && (
              <div className="mt-6">
                <h3 className="font-bold text-[#5D5A88] mb-2">ภาพที่อัปโหลดแล้ว:</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {uploadedPictureUrls.map((url, idx) => (
                    <div key={idx} className="relative">
                      <img src={url} className="rounded shadow w-full" />
                      <button
                        type="button"
                        onClick={() => {
                          const match = decodeURIComponent(url).match(/\/o\/(.+)\?/);
                          const path = match?.[1];
                          if (!path) return;
                          setPicturesToDelete((prev) => [...prev, path]);
                          setUploadedPictureUrls(uploadedPictureUrls.filter((_, i) => i !== idx));
                        }}
                        className="absolute top-2 right-2 bg-red-600 text-white rounded-full text-xs px-2"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-4">
              <label className="block font-bold">อัปโหลด Banner กิจกรรม:</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setBannerFile(file);
                  if (file) setBannerPreview(URL.createObjectURL(file));
                }}
                className="mb-4"
              />
            </div>

            {bannerPreview && (
              <div className="mt-2">
                <p className="text-sm text-[#5D5A88]">Preview:</p>
                <img src={bannerPreview} alt="Banner Preview" className="h-100 rounded shadow-md" />
              </div>
            )}

            <button type="submit" className="w-full bg-[#5D5A88] text-white py-2 rounded">บันทึก</button>
          </form>
        </div>
      </div>
    </div>
  );
}