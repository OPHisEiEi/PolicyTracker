"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { GoogleMap } from "@react-google-maps/api";
import { useGoogleMapsLoader } from "@/app/lib/googleMapsLoader";
import { ref, getDownloadURL } from "firebase/storage";
import { storage } from "@/app/lib/firebase";

const mapContainerStyle = {
  width: "70%",
  height: "400px",
};

const EventDetailPage = () => {
  const { id } = useParams();
  const eventId = decodeURIComponent(id as string);
  const router = useRouter();
  const { isLoaded } = useGoogleMapsLoader();

  const [eventData, setEventData] = useState<any>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch(`/api/eventdetail/${encodeURIComponent(eventId)}`);
      const data = await res.json();
      setEventData(data);
      fetchBanner(data.id);
    };

    const fetchBanner = async (eventId: string | number) => {
      try {
        const bannerRefJpg = ref(storage, `event/banner/${eventId}.jpg`);
        const bannerRefPng = ref(storage, `event/banner/${eventId}.png`);

        try {
          const url = await getDownloadURL(bannerRefJpg);
          setBannerUrl(url);
        } catch {
          const url = await getDownloadURL(bannerRefPng);
          setBannerUrl(url);
        }
      } catch (error) {
        console.warn("ไม่พบรูป banner:", error);
      }
    };


    fetchData();

  }, [eventId]);

  if (!eventData) return <div className="text-center py-20">กำลังโหลดข้อมูล...</div>;

  const [lat, lng] = eventData.map?.split(",").map(Number) || [];
  const center = {
    lat: !isNaN(lat) ? lat : 13.75,
    lng: !isNaN(lng) ? lng : 100.5,
  };

  const handleMapLoad = (map: google.maps.Map) => {
    if (!isNaN(center.lat) && !isNaN(center.lng)) {
      new google.maps.Marker({
        map,
        position: center,
        title: eventData.name,
      });
    } else {
      console.warn("center lat/lng ไม่ถูกต้อง");
    }
  };



  return (
    <div className="bg-white text-[#5D5A88] font-prompt">
      <Navbar />

      <div
        className="relative h-[400px] bg-cover bg-center flex items-end"
        style={{
          backgroundImage: `url(${bannerUrl || "/สมาชิกสัมพันธ์.jpg"})`,
        }}
      >
        <div className="absolute top-4 left-4">
          <button
            onClick={() => router.back()}
            className="bg-white text-[#5D5A88] hover:bg-[#5D5A88] hover:text-white px-4 py-2 rounded-full shadow transition"
          >
            ย้อนกลับ
          </button>
        </div>
        <div className="bg-black/50 w-full text-white p-6 rounded-t-xl">
          <h1 className="text-3xl font-bold">{eventData.name}</h1>
        </div>
      </div>

      <div className="bg-[url('/bg/หัวข้อ.png')] bg-cover bg-center">
        <div className="max-w-5xl mx-auto p-6">
          {/* Metadata */}
          <div className="grid md:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-xl shadow mb-6">
            <div className="space-y-2 font-semibold">
              <p>📅 วัน: {eventData.date || "ไม่ระบุ"}</p>
              <p>⏰ เวลา: {eventData.time}</p>
              <p>📍 สถานที่: {eventData.location}</p>
              <p>🧭 สถานะ: {eventData.status}</p>
            </div>
            <div className="flex items-start justify-end gap-4">
              {eventData.relatedPolicy && (
                <button
                  onClick={() =>
                    router.push(`/policydetail/${encodeURIComponent(eventData.relatedPolicy.id)}`)
                  }
                  className="bg-[#5D5A88] text-white px-4 py-2 rounded-full shadow hover:bg-[#403b7a] transition"
                >
                  นโยบายที่เกี่ยวข้อง
                </button>
              )}
              <img
                src={`https://firebasestorage.googleapis.com/v0/b/policy-tracker-kp.firebasestorage.app/o/party%2Flogo%2F${encodeURIComponent(eventData.party)}.png?alt=media`}
                alt="โลโก้พรรค"
                className="h-[40px]"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  if (!img.src.includes("default-logo.png")) {
                    img.src = "/default-logo.png";
                  }
                }}

              />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow mb-6">
            <h2 className="text-xl font-bold mb-2 text-[#5D5A88]">รายละเอียดกิจกรรม</h2>
            <p className="text-gray-700 leading-relaxed">{eventData.description}</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow mb-6">
            <h2 className="text-xl font-bold mb-4 text-[#5D5A88]">แผนที่</h2>
            <div className="flex justify-center mb-4">
              {isLoaded ? (
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={center}
                  zoom={15}
                  options={{ mapId: "91a816168c37298d" }}
                  onLoad={handleMapLoad}
                />
              ) : (
                <p>กำลังโหลดแผนที่...</p>
              )}
            </div>
            <div className="text-center">
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${center.lat},${center.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#5D5A88] text-white px-5 py-2 rounded-full shadow hover:bg-[#403b7a] transition inline-block"
              >
                แสดงเส้นทาง
              </a>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default EventDetailPage;
