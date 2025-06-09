"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";

interface Party {
  id: string;
  name: string;
  description?: string;
}

const PartiesPage = () => {
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchParties = async () => {
      try {
        const res = await fetch("/api/party");
        const data: Party[] = await res.json();
        setParties(data || []);
      } catch (err) {
        console.error("Error loading parties:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchParties();
  }, []);

  return (
    <div className="font-prompt min-h-screen bg-cover bg-center flex flex-col text-white" style={{ backgroundImage: "url('/bg/พรรค.png')" }}>
      <Navbar />
      <div className="px-10 pt-10 flex-grow">
        <h1 className="text-4xl font-bold mb-8 text-center">พรรคการเมืองทั้งหมด</h1>

        {loading ? (
          <p className="text-center text-gray-300">กำลังโหลดข้อมูล...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {parties.map((party) => {
              const logoUrl = `https://firebasestorage.googleapis.com/v0/b/policy-tracker-kp.firebasestorage.app/o/party%2Flogo%2F${party.id}.png?alt=media`;

              return (
                <div
                  key={party.id}
                  onClick={() => router.push(`/party/${party.id}`)} 
                  className="bg-white rounded-xl text-[#5D5A88] shadow-md p-4 cursor-pointer hover:shadow-xl transition-all relative"
                >
                  <img
                    src={logoUrl}
                    alt={`โลโก้ของ ${party.name}`}
                    className="absolute top-4 right-4 w-12 h-12 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/default-logo.jpg";
                    }}
                  />
                  <h2 className="text-xl font-bold mb-2">{party.name}</h2>
                  <p className="text-sm text-gray-700">{party.description || "ไม่มีคำอธิบาย"}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default PartiesPage;
