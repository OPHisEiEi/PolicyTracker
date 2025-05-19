// app/about/page.tsx
"use client";

import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";

export default function AboutPage() {
  const bgUrl = "/images/abstract-bg-2.png"; // พื้นหลังใหม่ที่บันทึกไว้
  const team = [
    { name: "นายสรรพวิชช์ ช่องดารากุล", role: "6409610786", img: "/ก้อง.jpg" },
    { name: "นางสาวปรียนันท์ ชานุ", role: "6409680045", img: "/ปูน.jpg" },
  ];

  return (
    <div
      className="min-h-screen flex flex-col font-prompt text-gray-100"
      style={{
        backgroundImage: `url(${bgUrl})`,
        backgroundColor: "#1f2937",
        backgroundBlendMode: "multiply",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <Navbar />

    <main className="flex-grow w-full mx-auto max-w-screen-2xl py-16 px-8 grid grid-cols-6 gap-8">
        {/* About Us */}
        <section className="col-span-3 bg-white/10 backdrop-blur-sm p-8 rounded-2xl shadow-lg">
          <h2 className="text-3xl font-bold mb-4 text-white">เกี่ยวกับเรา</h2>
          <p className="leading-relaxed text-gray-200">
            PolicyTracker คือแพลตฟอร์มที่ช่วยให้คุณติดตามนโยบาย โครงการ และกิจกรรมทางการเมืองได้อย่างโปร่งใสและเรียลไทม์
          </p>
        </section>

        {/* สมาชิก */}
        <section className="col-start-4 col-span-3 row-span-2 bg-white/10 backdrop-blur-sm p-8 rounded-2xl shadow-lg">
          <h3 className="text-2xl font-semibold text-center mb-6 text-white">สมาชิก</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {team.map((m) => (
              <div
                key={m.name}
                className="bg-white/20 p-8 rounded-xl shadow-md hover:shadow-lg transition"
              >
                <img
                  src={m.img}
                  alt={m.name}
                  className="mx-auto rounded-full w-40 h-40 object-cover mb-4 ring-2 ring-white/30"
                />
                <p className="font-medium text-white">{m.name}</p>
                <p className="text-sm text-gray-300">{m.role}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Vision & Mission */}
        <section className="col-span-3 grid grid-cols-2 gap-6">
          <div className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl shadow-md">
            <h3 className="text-2xl font-semibold mb-2 text-white">วิสัยทัศน์</h3>
            <p className="text-gray-200">
              เรามุ่งสร้างความโปร่งใสในการติดตามนโยบายสาธารณะ ให้ประชาชนเข้าถึงข้อมูลได้ง่าย
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl shadow-md">
            <h3 className="text-2xl font-semibold mb-2 text-white">พันธกิจ</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-200">
              <li>รวบรวมและจัดการข้อมูลนโยบาย</li>
              <li>แสดงสถานะความคืบหน้าแบบเรียลไทม์</li>
              <li>เชื่อมโยงโครงการและกิจกรรมที่เกี่ยวข้อง</li>
            </ul>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}