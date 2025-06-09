"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PRSidebar from "../components/PRSidebar";

interface Event {
  id: number;
  event_name: string;
  event_des: string;
  event_status: string;
  event_date: string;
  event_time: string;
  event_location: string;
}

export default function PRActivitiesPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [partyId, setPartyId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("partyId") ?? "";
    setPartyId(stored.trim());
  }, []);

  useEffect(() => {
    if (!partyId) return;

    const fetchEvents = async () => {
      try {
        const res = await fetch("/api/pr-event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ partyId }),
        });
        const data = await res.json();
        setEvents(data);
      } catch (error) {
        console.error("Failed to fetch events", error);
      }
    };

    fetchEvents();
  }, [partyId]);

  const goToEventForm = () => {
    router.push("/prEventForm");
  };

  const editEvent = (id: number) => {
    router.push(`/prEventForm?event_id=${id}`);
  };

  const deleteEvent = async (id: number) => {
    const confirmDelete = confirm("คุณแน่ใจว่าต้องการลบกิจกรรมนี้?");
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/pr-event/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        alert("ลบกิจกรรมสำเร็จ");
        setEvents((prev) => prev.filter((event) => event.id !== id));
      } else {
        const text = await res.text();
        alert("ลบไม่สำเร็จ: " + text);
      }
    } catch (err) {
      console.error("Delete failed:", err);
      alert("เกิดข้อผิดพลาดระหว่างลบ");
    }
  };

  if (!partyId) {
    return <div className="text-center text-white py-10">กำลังโหลดข้อมูลพรรค...</div>;
  }

  return (
    <div className="min-h-screen bg-cover bg-center flex" style={{ backgroundImage: "url('/bg/ผีเสื้อ.jpg')" }}>
      <PRSidebar />

      <div className="flex-1 md:ml-64">
        <header className="bg-white p-4 shadow-md flex justify-between items-center sticky top-0 z-10">
          <h1 className="text-2xl font-bold text-[#5D5A88]">กิจกรรมของพรรค</h1>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden text-3xl text-[#5D5A88] focus:outline-none"
          >
            ☰
          </button>
          <ul className="hidden md:flex space-x-4">
            <li>
              <Link href="/login" className="text-[#5D5A88] px-4 py-2 hover:bg-gray-200 rounded-md">
                ออกจากระบบ
              </Link>
            </li>
          </ul>
        </header>

        {menuOpen && (
          <div className="md:hidden bg-gray-100 p-4 absolute top-16 left-0 w-full shadow-md">
          </div>
        )}

        <main className="p-6">
          <div className="flex justify-end mb-4">
            <button
              onClick={goToEventForm}
              className="bg-[#5D5A88] text-white px-4 py-2 rounded-md hover:bg-[#46426b]"
            >
              ➕ เพิ่มกิจกรรม
            </button>
          </div>

          <h2 className="text-3xl text-white text-center">กิจกรรมที่บันทึกไว้</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-6">
            {events.length > 0 ? (
              events.map((event) => (
                <div key={event.id} className="bg-white p-4 rounded-lg shadow-lg flex flex-col h-full">
                  <div>
                    <h3 className="text-lg font-semibold">{event.event_name}</h3>
                    <p className="text-gray-600"><strong>สถานะ:</strong> {event.event_status}</p>
                    <p className="text-gray-600"><strong>วันที่:</strong> {event.event_date} <strong>เวลา:</strong> {event.event_time}</p>
                    <p className="text-gray-600"><strong>สถานที่:</strong> {event.event_location}</p>
                    <p className="text-gray-500 mt-2">{event.event_des ? event.event_des.slice(0, 100) + "..." : "-"}</p>
                  </div>
                  <div className="flex justify-between mt-auto pt-4">
                    <button
                      onClick={() => editEvent(event.id)}
                      className="bg-[#5D5A88] text-white px-3 py-1 rounded-md hover:bg-[#46426b]"
                    >
                      ✏ แก้ไข
                    </button>
                    <button
                      onClick={() => deleteEvent(event.id)}
                      className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-700"
                    >
                      ❌ ลบ
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-white text-center">ยังไม่มีกิจกรรมในระบบ</p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
