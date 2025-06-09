"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { firestore } from "@/app/lib/firebase";
import { doc, getDoc, collection, onSnapshot } from "firebase/firestore";
import Step from "@/app/components/step";
import { useRouter } from "next/navigation";
import DashboardSection from "@/app/components/DashboardSection";
import { useMemo } from "react";

interface Policy {
  id: string | number;
  name: string;
  description?: string;
  partyName: string;
  partyId: string;
  status: string;
  progress: number;
}

interface Category {
  categoryName: string;
  averageProgress: number;
  policies: Policy[];
}

interface PopularPolicy { id: string; policyName: string; likeCount: number; }

interface RecentPolicy { id: string; policyName: string; updatedAt: string; }

export default function HomePage() {

  const [slideIndex, setSlideIndex] = useState(0);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [popularPolicies, setPopularPolicies] = useState<PopularPolicy[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const router = useRouter();
  const [latestPolicies, setLatestPolicies] = useState<PopularPolicy[]>([]);

  const prevCard = () => {
    setCurrentIndex(prev => Math.max(prev - 1, 0));
  };
  const [selectedParty, setSelectedParty] = useState<string>("");
  const partyOptions = Array.from(
    new Map(
      categories.flatMap(cat =>
        cat.policies.map(p => [p.partyId, p.partyName])
      )
    ).entries()
  );

  const fetchPolicies = async () => {
    try {
      const res = await fetch("/api/policy");
      const data = await res.json();
      setPolicies(data);
    } catch (err) {
      console.error("Error fetching policies:", err);
    }
  };

  useEffect(() => {
    async function fetchLatest() {
      const res = await fetch("/api/policy");
      const all: any[] = await res.json();
      setLatestPolicies(all.slice(-5).reverse());
    }
    fetchLatest();
  }, []);

  useEffect(() => {
    fetchPolicies();
  }, []);

  const nextCard = () => {
    setCurrentIndex(prev =>
      Math.min(prev + 1, categories.length - 2)
    );
  };
  const stepMap: Record<string, { label: string; color: string; step: number }> = {
    "เริ่มนโยบาย": { label: "เริ่มนโยบาย", color: "#DF4F4D", step: 1 },
    "วางแผน": { label: "วางแผน", color: "#F29345", step: 2 },
    "ตัดสินใจ": { label: "ตัดสินใจ", color: "#F97316", step: 3 },
    "ดำเนินการ": { label: "ดำเนินการ", color: "#64C2C7", step: 4 },
    "ประเมินผล": { label: "ประเมินผล", color: "#33828D", step: 5 },
  };

  const visibleCards = categories.slice(currentIndex, currentIndex + 2);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/home/progress");
        const data = await res.json();
        setCategories(data);
      } catch (err) {
        console.error("Failed to fetch categories:", err);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    async function fetchPopular() {
      try {
        const res = await fetch("/api/policy");
        const all: any[] = await res.json();
        const top = all
          .map(p => ({
            id: p.id,
            policyName: p.policyName,
            likeCount: p.like ?? 0

          }))
          .sort((a, b) => b.likeCount - a.likeCount)
          .slice(0, 5);

        setPopularPolicies(top);

      } catch (e) {
        console.error("fetch popular error:", e);
      }
    }
    fetchPopular();
  }, []);

  const [recentPolicies, setRecentPolicies] = useState<RecentPolicy[]>([]);

  useEffect(() => {
    async function fetchRecent() {
      try {
        const res = await fetch("/api/policy");
        const all: any[] = await res.json();
        const sorted = all
          .filter(p => p.updatedAt)
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, 5)
          .map(p => ({ id: p.id, policyName: p.policyName, updatedAt: p.updatedAt }));
        setRecentPolicies(sorted);
      } catch (err) {
        console.error("fetch recent error:", err);
      }
    }
    fetchRecent();
  }, []);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch(`/api/home/summary?party=${encodeURIComponent(selectedParty)}`);
        const data = await res.json();
        setDashboardData(data);
      } catch (err) {
        console.error("Error loading dashboard:", err);
      }
    }

    fetchDashboard();
  }, [selectedParty]);

  return (
    <div
      className="font-prompt relative min-h-screen bg-cover bg-center"
      style={{ backgroundImage: "url('/bg/dashbg.png')" }}
    >
      <Navbar />
      <main className="w-full m-0 p-0">
        <section className="w-full m-0 p-10 ">
          <DashboardSection />
        </section>

        <section className="example-container bg-white shadow-md p-6 mb-6 h-[720px]">
          <h2 className="text-3xl font-semibold mt-3 text-[#5D5A88] mb-3 text-center">
            สัญลักษณ์แทนขั้นความคืบหน้า
          </h2>

          <div className="example-content-1 flex items-center justify-center mb-4">
            <div className="flex flex-wrap justify-center gap-4 mt-3 mb-3 ">
              {Object.values(stepMap).map((stepObj, idx) => (
                <Step
                  key={idx}
                  step={stepObj.step}
                  label={stepObj.label}
                  bgColor={stepObj.color}
                />
              ))}
            </div>
          </div>

          <h2 className="text-3xl font-semibold text-[#5D5A88]  mt-3 mb-1 text-center">
            ตัวอย่างนโยบายต่างๆแบ่งตามหมวดหมู่
          </h2>

          <div className="flex justify-center mt-3 mb-1 ">
            <select
              value={selectedParty}
              onChange={e => setSelectedParty(e.target.value)}
              className="bg-white border border-[#5D5A88] text-[#5D5A88] px-4 py-2 rounded-full shadow-sm hover:shadow-md transition duration-200"
            >
              <option value="">ร่วมรัฐบาล</option>
              {partyOptions.map(([id, name]) => (
                <option key={String(id)} value={String(id)}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="example-content-2 flex items-center justify-center space-x-20">
            <button
              onClick={prevCard}
              className="text-[48px] font-light text-[#5D5A88] hover:text-[#3f3c62] transition-transform hover:scale-110"
            >
              {"<"}
            </button>

            <div className="flex space-x-10 mt-4">
              {visibleCards.map((category, idx) => {
                const displayPolicies = selectedParty
                  ? category.policies.filter(p => String(p.partyId) === selectedParty)
                  : category.policies;

                return (
                  <div
                    key={idx}
                    className=" relative
                      w-[600px] h-[330px] bg-white shadow-md rounded-xl border-2 border-[#5D5A88]
                      p-4 flex flex-col justify-between
                      cursor-pointer transform transition-transform duration-200
                      hover:scale-105
                    "
                  >
                    <div className="absolute top-4 right-4 bg-[#5D5A88] text-white text-md font-semibold px-3 py-1 rounded-full shadow-lg z-10">
                      ค่าเฉลี่ย {category.averageProgress?.toFixed(1) ?? 0}%
                    </div>

                    <div>
                      <h3 className="text-2xl font-bold mb-4 text-[#5D5A88]">
                        {category.categoryName}
                        <span className="text-xl text-gray-400 ml-2 font-normal">
                          (มีทั้งหมด {displayPolicies.length} นโยบาย)
                        </span>
                      </h3>

                      <ul className="list-none pl-0 text-xl text-left text-[#3f3c62] space-y-2">
                        {displayPolicies.slice(0, 5).map((p, i) => {
                          const logoUrl = `https://firebasestorage.googleapis.com/v0/b/policy-tracker-kp.firebasestorage.app/o/party%2Flogo%2F${encodeURIComponent(p.partyId)}.png?alt=media`;
                          console.log("LOGO URL:", logoUrl);
                          return (

                            <li
                              key={i}
                              className="flex items-center border-b pb-1 cursor-pointer hover:bg-gray-100"
                              onClick={() => router.push(`/policydetail/${p.id}`)}
                            >
                              <div className="flex items-center flex-1 min-w-0 space-x-2">
                                {stepMap[p.status] && (
                                  <div
                                    className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-white text-sm font-semibold"
                                    style={{ backgroundColor: stepMap[p.status].color }}
                                  >
                                    {stepMap[p.status].step}
                                  </div>
                                )}

                                <span className="flex-1 min-w-0 truncate text-left">
                                  {p.name}
                                </span>

                                <span className="flex-shrink-0 text-sm text-gray-500 ml-2">
                                  ({p.progress?.toFixed(1) ?? 0}%)
                                </span>
                              </div>

                              <img
                                src={logoUrl}
                                alt={`โลโก้ของ ${p.partyName}`}
                                className="w-6 h-6 object-contain ml-3 flex-shrink-0"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "/default-logo.png";
                                }}
                              />
                            </li>
                          );
                        })}
                      </ul>
                    </div>

                    <div className="text-right mt-2">
                      <Link href={`/policycategory/${encodeURIComponent(category.categoryName)}`} className="text-sm text-[#5D5A88] underline hover:text-[#3f3c62]">
                        ดูเพิ่มเติม &rarr;
                      </Link>
                    </div>
                  </div>
                );
              })}  </div>

            <button
              onClick={nextCard}
              className="text-[48px] font-light text-[#5D5A88] hover:text-[#3f3c62] transition-transform hover:scale-110"
            >
              {">"}
            </button>
          </div>
        </section>

        <section className="popular-container p-6 mb-8">
          <h2 className="text-3xl font-semibold text-[#ffffff] mb-4 text-center">
            นโยบายที่ได้รับความสนใจสูงสุด
          </h2>
          <div className="flex space-x-10 mt-10 justify-center">

            <div className="card2 w-[610px] h-[340px] bg-white shadow-md rounded-xl border-2 border-[#5D5A88] p-6 flex flex-col justify-between transition-transform hover:scale-105">
              <div>
                <h3 className="text-2xl font-bold mb-4 text-[#5D5A88]">
                  นโยบายยอดนิยม
                </h3>
                <ul className="list-none pl-0 text-xl text-left text-[#3f3c62] space-y-2">
                  {popularPolicies.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center border-b pb-1 cursor-pointer hover:bg-gray-100"
                      onClick={() => router.push(`/policydetail/${p.id}`)}
                    >
                      <span className="flex-1 min-w-0 truncate">
                        {p.policyName}
                      </span>
                      <span className="flex-shrink-0 ml-2">
                        👍 {p.likeCount}
                      </span>

                    </li>
                  ))}
                </ul>
              </div>
              <div className="text-right mt-2">
                <Link
                  href={`/policycategory`}
                  className="text-sm text-[#5D5A88] underline hover:text-[#3f3c62]">
                  ดูเพิ่มเติม &rarr;
                </Link>
              </div>
            </div>

            <div className="card2 w-[610px] h-[340px] bg-white shadow-md rounded-xl border-2 border-[#5D5A88] p-6 flex flex-col justify-between transition-transform hover:scale-105">
              <div>
                <h3 className="text-2xl font-bold mb-4 text-[#5D5A88]">
                  นโยบายใหม่ล่าสุด
                </h3>
                <ul className="list-none pl-0 text-xl text-left text-[#3f3c62] space-y-2">
                  {latestPolicies.slice(0, 5).map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center border-b pb-1 cursor-pointer hover:bg-gray-100"
                      onClick={() => router.push(`/policydetail/${p.id}`)}
                    >
                      <span className="flex-1 min-w-0 truncate">
                        {p.policyName}
                      </span>

                    </li>
                  ))}
                </ul>
              </div>
              <div className="text-right mt-2">
                <Link
                  href={`/policycategory`}
                  className="text-sm text-[#5D5A88] underline hover:text-[#3f3c62]">
                  ดูเพิ่มเติม &rarr;
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}