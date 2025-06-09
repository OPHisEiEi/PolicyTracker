"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import DashboardCard from "@/app/components/DashboardCard";


interface Party { id: string; name: string; }
interface Policy { id: string; name: string; total_budget: number; }
interface Campaign { id: string; name: string; allocated_budget: number; }

export default function DashboardSection() {
  const [allParties, setAllParties] = useState<Party[]>([]);
  const [policyCount, setPolicyCount] = useState<number>(0);
  const [campaignCount, setCampaignCount] = useState<number>(0);
  const [selected, setSelected] = useState<string>("all");
  const [topPolicy, setTopPolicy] = useState<Policy | null>(null);
  const [sumAllocated, setSumAllocated] = useState<number>(0);
  const [netBudget, setNetBudget] = useState<number>(0);
  const [top3, setTop3] = useState<Campaign[]>([]);
  const ALL_LABEL = "ร่วมรัฐบาล";
  const partyLabel = selected === "all"
    ? ALL_LABEL
    : allParties.find(p => String(p.id) === selected)?.name || "";
  const [slideIndex, setSlideIndex] = useState(0);
  const [policyProgress, setPolicyProgress] = useState<number>(0);
  const [projectProgress, setProjectProgress] = useState<number>(0);
  const [specialProgress, setSpecialProgress] = useState<number>(0);
  const [page, setPage] = useState(0);
  const [top3Policy, setTop3Policy] = useState<Policy[]>([]);
  const [topSpecial, setTopSpecial] = useState<Campaign | null>(null);
  const [sumExpenses, setSumExpenses] = useState<number>(0);
  const bgColors = [
    "#EAF8FF",
    "#FEF9E7",
    "#F7FAF1"
  ];

  const cards = [
    <DashboardCard key="policy-progress" title="ความคืบหน้านโยบายทั้งหมด" main={`${policyProgress.toFixed(1)}%`} />,
    <DashboardCard key="project-progress" title="ความคืบหน้าโครงการทั้งหมด" main={`${projectProgress.toFixed(1)}%`} />,
    <DashboardCard key="special-progress" title="ความคืบหน้าโครงการพิเศษทั้งหมด" main={`${specialProgress.toFixed(1)}%`} />,
    <DashboardCard key="total-budget" title="งบประมาณรวมทั้งหมด" main={`${sumAllocated.toLocaleString("th-TH")} บาท`} />,
    <DashboardCard key="total-expense" title="รายจ่ายรวมทั้งหมด" main={`${sumExpenses.toLocaleString("th-TH")} บาท`} />,
    <DashboardCard key="net-budget" title="คงเหลือทั้งหมด" main={`${netBudget.toLocaleString("th-TH")} บาท`} />,
    <DashboardCard
      key="top3-policy"
      title="นโยบายที่ได้รับงบสูงสุด 3 อันดับ"
      className="text-[#475066]"
      style={{ backgroundColor: bgColors[0] }}
    >
      <ul className="space-y-3">
        {top3Policy.map((p, i) => (
          <li key={`${p.id}-${i}`} className="flex justify-between">
            <span className="font-medium truncate">{`${i + 1}. ${p.name}`}</span>
            <span className="font-bold ">{p.total_budget.toLocaleString("th-TH")} บาท</span>
          </li>
        ))}
      </ul>
    </DashboardCard>,

    <DashboardCard
      key="top3-projects"
      title="โครงการที่ได้รับงบสูงสุด 3 อันดับ"
      className="text-[#475066]"
      style={{ backgroundColor: bgColors[1] }}
    >
      <ul className="space-y-3">
        {top3.map((c, i) => (
          <li key={`${c.id}-${i}`} className="flex justify-between">
            <span className="font-medium truncate">{`${i + 1}. ${c.name}`}</span>
            <span className="font-bold ">{c.allocated_budget.toLocaleString("th-TH")} บาท</span>
          </li>
        ))}
      </ul>
    </DashboardCard>,
    <DashboardCard key="top-special" title="โครงการพิเศษที่ได้รับงบสูงสุด" main={topSpecial?.name || "-"} sub={`${topSpecial?.allocated_budget.toLocaleString("th-TH") || "-"} บาท`} />,
  ];

  const slides = chunk(cards, 3);

  function chunk<T>(array: T[], size: number): T[][] {
    return Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
      array.slice(i * size, i * size + size)
    );
  }

  useEffect(() => {
    const query = selected === "all" ? "" : `?partyId=${selected}`;
    fetch(`/api/dashboard${query}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`API failed: ${r.status} ${await r.text()}`);
        return r.json();
      })
      .then(data => {
        setPolicyCount(data.policyCount || 0);
        setCampaignCount(data.campaignCount || 0);
        setSumAllocated(Number(data.totalAllocated || 0));
        setNetBudget(Number(data.netBudget || 0));
        setSumExpenses(Number(data.totalExpense || 0));
        setPolicyProgress(Number(data.policyProgress || 0));
        setProjectProgress(Number(data.projectProgress || 0));
        setSpecialProgress(Number(data.specialProgress || 0));
        setTop3((data.top3Campaigns || [])
          .filter((c: any) => !c.isSpecial)
          .map((c: any) => ({
            ...c,
            allocated_budget: Number(c.allocated_budget),
          }))
        );

        setTop3Policy((data.top3Policies || []).map((p: any) => ({ ...p, total_budget: Number(p.total_budget) })));
        setTopSpecial(
          data.topSpecial
            ? {
              ...data.topSpecial,
              allocated_budget: Number(data.topSpecial.allocated_budget || 0),
            }
            : null
        );
      })
      .catch(err => {
        console.error("Error loading dashboard:", err);
      });
  }, [selected]);

  useEffect(() => {
    fetch("/api/dashboard/parties")
      .then(r => r.json())
      .then(data => {
        setAllParties(data.parties || []);
      })
      .catch(err => {
        console.error("failed to load parties:", err);
        setAllParties([]);
      });
  }, []);



  useEffect(() => {
    if (slides.length > 1) {
      const timer = setInterval(() => {
        setPage((prev) => (prev + 1) % slides.length);
      }, 30000);
      return () => clearInterval(timer);
    }
  }, [slides.length]);

  return (
    <section className="example-container p-6 mb-6">
      <div className="flex justify-end mb-1">
        <select
          value={selected}
          onChange={e => setSelected(e.target.value)}
          className="bg-white border border-[#5D5A88] text-[#5D5A88] px-4 py-2 rounded-full shadow-sm hover:shadow-md transition duration-200"
        >
          <option value="all">ร่วมรัฐบาล</option>
          {allParties.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

      </div>

      <h2 className="text-6xl font-bold text-center text-white">พรรค</h2>
      <h2 className="text-6xl font-bold text-center text-white">{partyLabel}</h2>

      <div className="mx-auto w-fit bg-blue-200 bg-opacity-20 rounded-2xl px-12 py-8 flex items-center mt-10 mb-10">
        <div className="text-center text-white">
          <p className="text-6xl font-bold">{policyCount}</p>
          <p className="text-3xl mt-1">นโยบาย</p>
        </div>

        <div className="mx-8 h-10 w-[1px] bg-white bg-opacity-30" />

        <div className="text-center text-white">
          <p className="text-6xl font-bold">{campaignCount}</p>
          <p className="text-3xl mt-1">โครงการ</p>
        </div>
      </div>

      <div className="text-center mb-6">
        <Link href="/policycategory">
          <button className="bg-[#359FCF] hover:bg-[#2c8bbf] text-white px-6 py-3 rounded">
            ดูนโยบายทั้งหมด
          </button>
        </Link>
      </div>


      {/* Slider Container */}
      <div className="mt-6 max-w-8xl mx-auto px-4">
        <div className="overflow-hidden">
          <div
            className="flex transition-transform duration-700 ease-in-out"
            style={{ transform: `translateX(-${page * 100}%)` }}
          >
            {slides.map((group, i) => (
              <div
                key={i}
                className="flex-shrink-0  min-w-full grid grid-cols-1 md:grid-cols-3 gap-8 px-2"
              >
                {group.map((card, idx) => (
                  <div
                    key={idx}
                    className="
                 w-full       
                p-6            
                rounded-2xl    
                shadow-lg      
                
                transition     
                duration-300
              "
                    style={{ backgroundColor: bgColors[idx] }}
                  >
                    {card}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {slides.length > 1 && (
          <div className="flex justify-center mt-6 space-x-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`
            w-3 h-3 rounded-full transition-colors duration-300
            ${page === i
                    ? "bg-[#5D5A88]"
                    : "bg-gray-300 hover:bg-gray-400"}
          `}
              />
            ))}
          </div>
        )}
      </div>

    </section>
  );
}