"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import ThaiMap from "../components/ThaiMapComponent";
import { provinceNameMap, provinceToRegion } from "@/app/lib/provinceRegions";
import { ArrowLeft } from "lucide-react";

interface EventData {
  id: string;
  name: string;
  description: string;
  date: string;
  location: string;
  party: string | null;
  partyId: number | null;
  region?: string;
}

const regions = [
  "ภาคทั้งหมด",
  "ภาคเหนือ",
  "ภาคตะวันออกเฉียงเหนือ",
  "ภาคกลาง",
  "ภาคตะวันออก",
  "ภาคตะวันตก",
  "ภาคใต้",
];

const svgIdToRegionMap: Record<string, string> = {
  "เหนือ": "ภาคเหนือ",
  "ตะวันออกเฉียงเหนือ": "ภาคตะวันออกเฉียงเหนือ",
  "กลาง": "ภาคกลาง",
  "ตะวันตก": "ภาคตะวันตก",
  "ตะวันออก": "ภาคตะวันออก",
  "ใต้": "ภาคใต้"
};

const regionToFilename = (region: string) => {
  if (region === "ทั้งหมด") return "ประเทศ";
  return region.replace("ภาค", "");
};


export default function EventPage() {
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState("ทั้งหมด");
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const router = useRouter();
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);

  const fetchEvents = async (region: string) => {
    setLoading(true);
    try {
      const url = region === "ทั้งหมด" ? "/api/event" : `/api/event/region/${encodeURIComponent(region)}`;
      const res = await fetch(url);
      const data = await res.json();
      setEvents(data);
    } catch (error) {
      console.error("Failed to fetch events:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProvinceClick = async (provinceCode: string) => {
    const provinceName = provinceNameMap[provinceCode];
    const regionName = selectedRegion !== "ทั้งหมด" ? selectedRegion : "";

    setSelectedProvince(provinceCode);
    setLoading(true);

    try {
      const url = regionName
        ? `/api/event/province/${encodeURIComponent(provinceName)}/region/${encodeURIComponent(regionName)}`
        : `/api/event/province/${encodeURIComponent(provinceName)}`;

      const res = await fetch(url);
      const data = await res.json();
      setEvents(data);
    } catch (err) {
      console.error("โหลดกิจกรรมล้มเหลว", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEventsByProvince = async (provinceCode: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/event/province/${encodeURIComponent(provinceCode)}`);
      const data = await res.json();
      setEvents(data);
    } catch (err) {
      console.error("โหลดกิจกรรมจังหวัดล้มเหลว", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents(selectedRegion);
  }, [selectedRegion]);

  useEffect(() => {
    if (selectedProvince === null) {
      fetchEvents(selectedRegion);
    }
  }, [selectedProvince, selectedRegion]);

  return (
    <div className="min-h-screen flex flex-col justify-between font-['Prompt'] bg-center bg-cover" style={{ backgroundImage: "url('/bg/แผนที่.png')" }}>
      <Navbar />

      {selectedProvince && (
        <div className="w-full flex justify-start px-6 pt-6">
          <button
            onClick={() => setSelectedProvince(null)}
            className="
              inline-flex items-center gap-2
              px-4 py-2
              bg-gray-200 text-gray-800
              font-medium rounded-lg shadow-sm
              hover:bg-gray-300
              focus:outline-none focus:ring-2 focus:ring-gray-400
              transition
            "
          >
            <ArrowLeft size={16} /> ย้อนกลับ
          </button>
        </div>
      )}

      {!selectedProvince && (
        <div className="text-center mt-10">
          <h1 className="text-white text-4xl font-bold mb-4">
            {selectedRegion !== "ทั้งหมด"
              ? `กิจกรรมใน${selectedRegion}`
              : "กิจกรรมทั้งหมด"}
          </h1>

          <div className="flex justify-center mb-4">
            <select
              className="px-4 py-2 rounded bg-white text-[#5D5A88] border border-gray-400"
              value={selectedRegion}
              onChange={(e) => {
                const selected = e.target.value;
                setSelectedRegion(selected);
                setSelectedProvince(null);

                if (selected === "ภาคทั้งหมด") {
                  window.location.reload();
                } else {
                  fetchEvents(selected);
                }
              }}

            >
              {regions.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </div>

          {/* Thailand Map */}
          <div className="flex justify-center h-[700px] relative">
            <ThaiMap
              selectedRegion={selectedRegion}
              selectedProvince={selectedProvince}
              handleRegionClick={(regionId) => {
                setSelectedRegion(regionId);
                setSelectedProvince("");
              }}
              handleProvinceClick={handleProvinceClick}
              handleHover={(id) => {
                setHoveredRegion(id);
              }}
              setHoveredRegion={setHoveredRegion}
            />
          </div>
        </div>
      )}

      <div className="w-[90%] mx-auto my-10">
        {loading ? (
          <div className="text-center text-white py-10">
            กำลังโหลดข้อมูลกิจกรรม...
          </div>
        ) : selectedProvince ? (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* ฝั่งซ้าย: map จังหวัด */}
            <div className="lg:w-[40%] bg-white p-6 rounded-xl shadow flex flex-col items-center justify-center">
              <h2 className="text-[#5D5A88] text-2xl font-bold mb-4 text-center">
                {provinceNameMap[selectedProvince]}
              </h2>
              <div className="w-full h-[400px] flex items-center justify-center">
                <ThaiMap
                  selectedProvince={selectedProvince}
                  selectedRegion={selectedRegion}
                  handleRegionClick={() => { }}
                  handleProvinceClick={() => { }}
                  handleHover={() => { }}
                  setHoveredRegion={() => { }}
                />
              </div>
            </div>

            {/* ฝั่งขวา: รายการกิจกรรม */}
            <div className="lg:w-[60%] bg-white p-6 rounded-xl shadow">
              <h3 className="text-[#5D5A88] font-bold text-lg mb-4">
                มีกิจกรรมทั้งหมด {events.length} กิจกรรม
              </h3>
              <div className="space-y-4">
                {events.map((event, index) => {
                  const partyImage = event.partyId
                    ? `https://firebasestorage.googleapis.com/v0/b/policy-tracker-kp.firebasestorage.app/o/party%2Flogo%2F${encodeURIComponent(event.partyId)}.png?alt=media`
                    : "/default-logo.png";

                  return (
                    <div
                      key={index}
                      className="border border-gray-300 rounded-xl p-4 flex flex-col gap-2"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-md font-bold">{event.name}</h4>
                          <p className="text-sm text-gray-500 line-clamp-2">{event.description}</p>
                          <p className="text-sm mt-1">📅 {event.date}</p>
                          <p className="text-sm">📍 {event.location}</p>
                        </div>
                        <img
                          src={partyImage}
                          className="w-10 h-10 object-contain"
                          alt={`โลโก้ ${event.party || "ไม่ทราบพรรค"}`}
                        />
                      </div>
                      <div className="text-right">
                        <button
                          onClick={() =>
                            router.push(`/eventdetail/${encodeURIComponent(event.id)}`)
                          }
                          className="text-[#5D5A88] text-sm font-medium hover:underline"
                        >
                          ดูเพิ่มเติม →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white p-5 text-[#3f3c62] rounded-xl shadow">
            {events.length === 0 ? (
              <p className="text-center text-gray-500">ไม่มีกิจกรรมในพื้นที่นี้</p>
            ) : (
              <div className="flex flex-wrap gap-6 justify-center">
                {events.map((event, index) => {
                  const partyImage = event.partyId
                    ? `https://firebasestorage.googleapis.com/v0/b/policy-tracker-kp.firebasestorage.app/o/party%2Flogo%2F${encodeURIComponent(event.partyId)}.png?alt=media`
                    : "/default-logo.png";

                  return (
                    <div
                      key={index}
                      className="w-[450px] h-[300px] bg-white shadow-md rounded-lg transition-transform duration-300 border-2 border-[#5D5A88] hover:scale-105 p-4 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start">
                          <h3 className="font-bold text-lg mb-1">
                            {event.name}
                          </h3>
                          <img
                            className="w-10 h-10 object-contain"
                            src={partyImage}
                            alt={`โลโก้ของ ${event.party || "ไม่ทราบพรรค"}`}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/default-logo.png";
                            }}
                          />
                        </div>
                        <p className="text-gray-600 text-sm line-clamp-3">
                          {event.description}
                        </p>
                        <p className="text-sm mt-2">📅 {event.date}</p>
                        <p className="text-sm">📍 {event.location}</p>
                      </div>
                      <div className="flex justify-end mt-4">
                        <button
                          onClick={() =>
                            router.push(`/eventdetail/${encodeURIComponent(event.id)}`)
                          }
                          className="text-[#5D5A88] font-semibold hover:underline"
                        >
                          ดูเพิ่มเติม
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}