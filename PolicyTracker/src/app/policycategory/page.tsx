"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { Heart } from "lucide-react";

const categories = [
  { name: "เศรษฐกิจ", image: "/เศรษฐกิจ.jpg" },
  { name: "สังคม คุณภาพชีวิต", image: "/สังคม.jpg" },
  { name: "การเกษตร", image: "/การเกษตร.jpg" },
  { name: "สิ่งแวดล้อม", image: "/สิ่งแวดล้อม.jpg" },
  { name: "รัฐธรรมนูญ กฏหมาย", image: "/รัฐธรรมนูญ.jpg" },
  { name: "บริหารงานภาครัฐ", image: "/บริหารงานภาครัฐ.jpg" },
  { name: "การศึกษา", image: "/การศึกษา.jpg" },
  { name: "ความสัมพันธ์ระหว่างประเทศ", image: "/ความสัมพันธ์ระหว่างประเทศ.jpg" },
];

const PolicyPage = () => {
  const router = useRouter();
  const [policies, setPolicies] = useState<any[]>([]);
  const [partyList, setPartyList] = useState<string[]>([]);
  const [selectedParty, setSelectedParty] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [likesMap, setLikesMap] = useState<Record<string, number>>({});
  const [likedState, setLikedState] = useState<Record<string, boolean>>({});

  const handleCategoryClick = (category: string) => {
    router.push(`/policycategory/${encodeURIComponent(category)}`);
  };

  const fetchPolicies = async () => {
     try {
      const queryParams = new URLSearchParams();
      if (selectedParty) queryParams.append("party", selectedParty);
      if (selectedStatus) queryParams.append("status", selectedStatus);

      const res = await fetch(`/api/policycategory?${queryParams.toString()}`);
      const data = await res.json();
      setPolicies(data);
    } catch (err) {
      console.error("Error fetching policies:", err);
    }
  };

  useEffect(() => {
  fetchPolicies(); // โหลดทั้งหมดในตอนแรก
}, []);



  // Init likedState และ fetch like count
  useEffect(() => {
    const init: Record<string, boolean> = {};
    policies.forEach((p) => {
      // toggle state จาก localStorage
      init[p.policyName] = localStorage.getItem(`liked_${p.policyName}`) === "true";

      // fetch count
      fetch(`/api/policylike?name=${encodeURIComponent(p.policyName)}`)
        .then((res) => res.json())
        .then((data) => {
          const raw = data.like;
          const count = typeof raw === "number" ? raw : typeof raw?.toNumber === "function" ? raw.toNumber() : Number(raw) || 0;
          console.log("[fetch like GET]", p.policyName, "=", count);
          setLikesMap((m) => ({ ...m, [p.policyName]: count }));
        })
        .catch((err) => console.error("❌ fetch like GET error:", err));
    });
    setLikedState(init);
  }, [policies]);

  // Toggle like: ถ้ายังไม่กด → increment, กดแล้ว → decrement
  const handleLike = async (policyName: string) => {
    const isLiked = likedState[policyName];
    const action = isLiked ? "decrement" : "increment";

    try {
      const res = await fetch("/api/policylike", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: policyName, action }),
      });
      console.log(
        "[fetch like POST]",
        policyName,
        action,
        "status",
        res.status
      );
      if (!res.ok) throw new Error(`Status ${res.status}`);

      const data = await res.json();
      const raw = data.like;
      const newCount = typeof raw === "number" ? raw : typeof raw?.toNumber === "function" ? raw.toNumber() : Number(raw) || 0;
      console.log("[POST result]", policyName, "=", newCount);
      setLikesMap((m) => ({ ...m, [policyName]: newCount }));

      const newVal = !isLiked;
      localStorage.setItem(`liked_${policyName}`, newVal.toString());
      setLikedState((s) => ({ ...s, [policyName]: newVal }));
    } catch (err) {
      console.error("❌ handleLike error:", err);
    }
  };

 // ดึงรายชื่อพรรคตอนหน้าโหลด
 useEffect(() => {
  async function fetchParties() {
    try {
      const res = await fetch("/api/parties");
      const data: string[] = await res.json();
      setPartyList(data);
    } catch (err) {
      console.error("Error fetching parties:", err);
    }
  }
  fetchParties();
}, []);

useEffect(() => {
  fetchPolicies();
}, [selectedParty, selectedStatus])


  return (
    <div className="font-prompt">
      <div className="relative bg-cover bg-center" style={{ backgroundImage: "url('/bg/หัวข้อ.png')" }}>
        <Navbar />
        <div className="flex justify-between mt-10 mx-20">
          <h2 className="text-white text-[50px] font-bold">นโยบาย</h2>
          <div className="flex gap-10 items-center">
            <div className="relative inline-block w-64">
              {!selectedParty && <span className="absolute inset-y-0 left-4 flex items-center text-gray-400 pointer-events-none">ค้นหาจากพรรค</span>}
              <select
                value={selectedParty}
                onChange={(e) => setSelectedParty(e.target.value)}
                className="h-12 w-full pl-4 pr-4 rounded-full bg-white text-gray-800 leading-none"
              >
                <option value="" disabled hidden />
                {partyList.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="relative inline-block w-64">
              {!selectedStatus && <span className="absolute inset-y-0 left-4 flex items-center text-gray-400 pointer-events-none">ความคืบหน้า</span>}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="h-12 w-full pl-4 pr-4 rounded-full bg-white text-gray-800 leading-none"
              >
                <option value="" disabled hidden />
                <option value="เริ่มนโยบาย">เริ่มนโยบาย</option>
                <option value="วางแผน">วางแผน</option>
                <option value="ตัดสินใจ">ตัดสินใจ</option>
                <option value="ดำเนินการ">ดำเนินการ</option>
                <option value="ประเมินผล">ประเมินผล</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <div className="grid grid-cols-8 grid-rows-2 gap-6 m-10 w-[85%] items-center">
            {categories.map((category, index) => (
              <div
                key={index}
                onClick={() => router.push(`/policycategory/${encodeURIComponent(category.name)}`)}
                className="bg-white col-span-2 rounded-3xl overflow-hidden shadow-lg cursor-pointer hover:shadow-xl transition-all"
              >
                <img className="rounded-xl" src={category.image} alt={category.name} />
                <h3 className="text-center">{category.name}</h3>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-center mb-10">
          <button
            onClick={fetchPolicies}
            className="py-3 px-8 bg-[#316599] text-white text-lg rounded-lg shadow-md hover:bg-[#254e77] hover:scale-105 active:scale-95 transition-transform duration-200 ease-in-out focus:outline-none focus:ring-4 focus:ring-[#316599] focus:ring-opacity-50"
          >
            ดูนโยบายทั้งหมด
          </button>
        </div>

        <div className="mx-20 pb-10 grid grid-cols-3 gap-6">
          {policies.map((policy, idx) => {
            const encodedPartyName = encodeURIComponent(policy.partyName);
            const logoUrl = `https://firebasestorage.googleapis.com/v0/b/policy-tracker-kp.firebasestorage.app/o/party%2Flogo%2F${encodedPartyName}.png?alt=media`;

            return (
              <div key={idx} className="bg-white rounded-xl p-4 shadow-lg relative flex flex-col justify-between min-h-[380px] h-full">
                <div>
                  <img
                    src={logoUrl}
                    alt={`โลโก้ของ ${policy.partyName}`}
                    className="absolute top-4 right-4 w-12 h-12 object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).src = "/default-logo.jpg"; }}
                  />
                  <h3 className="font-bold text-xl mb-2">{policy.policyName}</h3>
                  <p className="mb-2 break-words whitespace-normal max-h-[6rem] overflow-hidden text-ellipsis">{policy.description}</p>
                  <div className="grid grid-cols-2 gap-2 mt-6 text-sm">
                    <p><strong>พรรค:</strong> {policy.partyName}</p>
                    <p><strong>งบประมาณ:</strong> {policy.budget}</p>
                    <p><strong>หมวดหมู่:</strong> {policy.categoryName}</p>
                    <p><strong>ความคืบหน้า:</strong> {policy.progress}</p>
                  </div>
                </div>
                <div className="text-right mt-6">
                  <button onClick={() => router.push(`/policydetail/${encodeURIComponent(policy.policyName)}`)} className="text-[#5D5A88] hover:underline">ดูเพิ่มเติม →</button>
                </div>
                <div className="absolute bottom-4 left-4 z-10 flex items-center space-x-1">
                  <button onClick={() => handleLike(policy.policyName)} className="hover:opacity-75 focus:outline-none">
                    <Heart
                      size={20}
                      fill={likedState[policy.policyName] ? "currentColor" : "none"}
                      className={likedState[policy.policyName] ? "text-[#EF4444]" : "text-gray-400"}
                    />
                  </button>
                  <span className="font-medium">{likesMap[policy.policyName] ?? 0}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PolicyPage;