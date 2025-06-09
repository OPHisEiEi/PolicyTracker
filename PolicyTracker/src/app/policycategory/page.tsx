"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { Heart, AlertCircle } from "lucide-react";
import FingerprintJS from '@fingerprintjs/fingerprintjs';

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

interface Policy {
  policyId: number;
  policyName: string;
  description: string;
  status: string;
  progress: number;
  partyName: string;
  partyId: number;
  categoryName: string;
  budget: number;
  uniqueKey: string;
}

const PolicyPage = () => {
  const router = useRouter();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [partyList, setPartyList] = useState<string[]>([]);
  const [selectedParty, setSelectedParty] = useState<string>("ทั้งหมด");
  const [selectedStatus, setSelectedStatus] = useState<string>("ทั้งหมด");
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [likesMap, setLikesMap] = useState<Record<string, number>>({});
  const [likedState, setLikedState] = useState<Record<string, boolean>>({});
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [isLiking, setIsLiking] = useState<Record<number, boolean>>({});
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const loadFingerprint = async () => {
      try {
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        setFingerprint(result.visitorId);
      } catch (error) {
        console.error("Error loading fingerprint:", error);
        const fallbackFingerprint = btoa(
          navigator.userAgent +
          screen.width +
          screen.height +
          new Date().getTimezoneOffset()
        ).substring(0, 16);
        setFingerprint(fallbackFingerprint);
      }
    };
    loadFingerprint();
  }, []);

  const fetchPolicies = async () => {
    if (!showAll) return;

    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (selectedParty && selectedParty !== "ทั้งหมด") {
        queryParams.append("party", selectedParty);
      }
      if (selectedStatus && selectedStatus !== "ทั้งหมด") {
        queryParams.append("status", selectedStatus);
      }

      const res = await fetch(`/api/policycategory?${queryParams.toString()}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();

      const processedPolicies = data.map((p: any, idx: number) => {
        let policyId: number;
        if (typeof p.policyId === 'number') {
          policyId = p.policyId;
        } else if (typeof p.policyId === 'object' && p.policyId.low) {
          policyId = p.policyId.low;
        } else {
          policyId = idx + 1000;
        }

        return {
          policyId: policyId,
          policyName: String(p.policyName || "ไม่ระบุชื่อ"),
          description: String(p.description || "ไม่มีรายละเอียด"),
          status: String(p.status || "ไม่ระบุสถานะ"),
          progress: Number(p.progress) || 0,
          partyName: String(p.partyName || "ไม่ระบุพรรค"),
          partyId: Number(p.partyId) || 0,
          categoryName: String(p.categoryName || "ไม่ระบุหมวดหมู่"),
          budget: Number(p.budget) || 0,
        } as Policy;
      });

      setPolicies(processedPolicies);

    } catch (err) {
      console.error("Error fetching policies:", err);
      setPolicies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (policies.length === 0 || !fingerprint) return;

    const fetchLikeStates = async () => {
      const promises = policies.map(async (p) => {
        try {
          const res = await fetch(`/api/policylike?id=${p.policyId}&fingerprint=${fingerprint}`);
          if (!res.ok) {
            console.warn(`Failed to fetch like state for policy ${p.policyId}`);
            return { policyId: p.policyId, count: 0, liked: false };
          }

          const data = await res.json();
          const count = Number(data.like) || 0;
          const liked = Boolean(data.isLiked);

          return { policyId: p.policyId, count, liked };
        } catch (error) {
          console.error(`Error fetching like state for policy ${p.policyId}:`, error);
          return { policyId: p.policyId, count: 0, liked: false };
        }
      });

      const results = await Promise.all(promises);

      const newLikesMap: Record<number, number> = {};
      const newLikedState: Record<number, boolean> = {};


      results.forEach(({ policyId, count, liked }) => {
        newLikesMap[policyId] = count;
        newLikedState[policyId] = liked;
      });


      setLikesMap(newLikesMap);
      setLikedState(newLikedState);
    };

    fetchLikeStates();
  }, [policies, fingerprint]);

  const handleLike = async (policyId: number) => {
    const pid = Number(policyId);

    if (!fingerprint) {
      setErrorMessage("ระบบกำลังโหลด กรุณารอสักครู่");
      return;
    }

    if (isLiking[pid]) {
      console.warn("กำลังประมวลผลอยู่");
      return;
    }

    setIsLiking(prev => ({ ...prev, [pid]: true }));
    setErrorMessage("");

    try {
      const res = await fetch("/api/policylike", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: pid, fingerprint }),
      });

      const data = await res.json();

      if (!res.ok) {
        switch (res.status) {
          case 403:
            if (data.error.includes("network")) {
              setErrorMessage("มีการกดไลค์นโยบายนี้จากเครือข่ายนี้แล้ว");
            } else if (data.error.includes("Suspicious")) {
              setErrorMessage("ตรวจพบการใช้งานที่ผิดปกติ กรุณาลองใหม่ในภายหลัง");
            } else {
              setErrorMessage("ไม่สามารถกดไลก์ได้ในขณะนี้");
            }
            break;
          case 429:
            setErrorMessage("กดไลก์บ่อยเกินไป กรุณารอสักครู่");
            break;
          default:
            setErrorMessage("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
        }
        return;
      }

      const newCount = Number(data.like) || 0;
      const action = data.action;

      setLikesMap(prev => ({ ...prev, [pid.toString()]: newCount }));
      setLikedState(prev => ({ ...prev, [pid.toString()]: action === "liked" }));


    } catch (error) {
      console.error("handleLike error:", error);
      setErrorMessage("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsLiking(prev => ({ ...prev, [pid]: false }));

      setTimeout(() => {
        setErrorMessage("");
      }, 5000);
    }
  };

  useEffect(() => {
    async function fetchParties() {
      try {
        const res = await fetch("/api/parties");
        if (!res.ok) throw new Error(`Status ${res.status}`);

        const data = await res.json();

        const parties = Array.isArray(data)
          ? data.filter(p => typeof p === 'string')
          : [];

        setPartyList(parties);
      } catch (err) {
        console.error("Error fetching parties:", err);
        setPartyList([]);
      }
    }
    fetchParties();
  }, []);

  useEffect(() => {
    if (showAll) {
      fetchPolicies();
    }
  }, [selectedParty, selectedStatus, showAll]);

  useEffect(() => {
    if (showAll) {
      fetchPolicies();
    } else {
      setPolicies([]);
    }
  }, [showAll]);

  const filteredPolicies = policies.filter(p =>
    (selectedParty === "ทั้งหมด" || p.partyName === selectedParty) &&
    (selectedStatus === "ทั้งหมด" || p.status === selectedStatus)
  );

  const LikeButton = ({
    policyId,
    isLiked,
    isProcessing,
    count,
    onLike,
  }: {
    policyId: number;
    isLiked: boolean;
    isProcessing: boolean;
    count: number;
    onLike: (id: number) => void;
  }) => (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onLike(policyId);
      }}
      disabled={isProcessing}
      className={`
      flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200
      ${isLiked ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
      ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    `}
    >
      <Heart size={20} className={isLiked ? 'fill-current' : ''} />
      <span className="font-medium">
        {isProcessing ? '...' : count}
      </span>
      {isProcessing && (
        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
      )}
    </button>
  );

  return (
    <div className="font-prompt">
      <div className="relative bg-cover bg-center" style={{ backgroundImage: "url('/bg/หัวข้อ.png')" }}>
        <Navbar />

        <div className="mt-10 mx-20">
          <h2 className="text-white text-[50px] font-bold">นโยบาย</h2>
        </div>

        {/* กล่องหมวดหมู่ */}
        <div className="flex justify-center">
          <div className="grid grid-cols-8 grid-rows-2 gap-6 m-10 w-[85%] items-center">
            {categories.map((category, index) => (
              <div
                key={`category-${index}-${category.name}`}
                onClick={() => router.push(`/policycategory/${encodeURIComponent(category.name)}`)}
                className="bg-white col-span-2 rounded-3xl overflow-hidden shadow-lg cursor-pointer hover:shadow-xl transition-all"
              >
                <img className="rounded-xl" src={category.image} alt={category.name} />
                <h3 className="text-center text-2xl my-2">{category.name}</h3>
              </div>
            ))}
          </div>
        </div>

        {/* ปุ่ม toggle */}
        <div className="flex justify-center mb-10">
          <button
            onClick={() => {
              const toggle = !showAll;
              setShowAll(toggle);
              if (!toggle) {
                setPolicies([]);
              }
            }}
            disabled={loading}
            className="mb-4 py-3 px-8 bg-[#316599] text-white text-lg rounded-lg shadow-md hover:bg-[#254e77] hover:scale-105 active:scale-95 transition-transform duration-200 ease-in-out focus:outline-none focus:ring-4 focus:ring-[#316599] focus:ring-opacity-50 disabled:opacity-50"
          >
            {loading ? "กำลังโหลด..." : showAll ? "ซ่อนนโยบายทั้งหมด" : "ดูนโยบายทั้งหมด"}
          </button>
        </div>

        {/* แสดงผลนโยบาย */}
        {showAll && (
          <>
            {/* Filters */}
            <div className="mx-20 flex justify-end gap-6 mb-4">
              <div className="w-64">
                <select
                  value={selectedParty}
                  onChange={(e) => setSelectedParty(e.target.value)}
                  className="h-12 w-full px-4 rounded-full bg-white text-gray-800"
                  disabled={loading}
                >
                  <option value="ทั้งหมด">ทั้งหมด</option>
                  {partyList.map((party, idx) => (
                    <option key={`party-${idx}-${party}`} value={party}>
                      {party}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-64">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="h-12 w-full px-4 rounded-full bg-white text-gray-800"
                  disabled={loading}
                >
                  <option value="ทั้งหมด">ทั้งหมด</option>
                  <option value="เริ่มนโยบาย">เริ่มนโยบาย</option>
                  <option value="วางแผน">วางแผน</option>
                  <option value="ตัดสินใจ">ตัดสินใจ</option>
                  <option value="ดำเนินการ">ดำเนินการ</option>
                  <option value="ประเมินผล">ประเมินผล</option>
                </select>
              </div>
            </div>

            {/* Loading state */}
            {loading && (
              <div className="text-center text-white text-xl mb-10">
                กำลังโหลดข้อมูล...
              </div>
            )}

            {/* No results message */}
            {!loading && filteredPolicies.length === 0 && policies.length > 0 && (
              <div className="text-center text-white text-xl mb-10">
                ไม่พบนโยบายตามตัวกรองที่เลือก
              </div>
            )}

            {/* Policy cards */}
            {!loading && filteredPolicies.length > 0 && (
              <div className="mx-20 pb-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {filteredPolicies.map((policy) => {
                  const encodedPartyName = encodeURIComponent(policy.partyName);
                  const logoUrl = `https://firebasestorage.googleapis.com/v0/b/policy-tracker-kp.firebasestorage.app/o/party%2Flogo%2F${policy.partyId}.png?alt=media`;
                  const likeCount = likesMap[policy.policyId] ?? 0;

                  return (
                    <div
                      key={policy.policyId}
                      className="bg-white rounded-2xl p-5 shadow-lg relative hover:shadow-xl transition duration-300 flex flex-col justify-between cursor-pointer"
                      onClick={() => router.push(`/policydetail/${policy.policyId}`)}
                    >
                      <img
                        src={logoUrl}
                        alt={`โลโก้พรรค ${policy.partyName}`}
                        className="absolute top-4 right-4 w-10 h-10 object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/default-logo.jpg";
                        }}
                      />

                      <div>
                        <p className="text-lg font-bold text-[#5D5A88] mb-2">
                          {policy.policyName}
                        </p>
                        <p className="text-gray-700 text-sm mb-4 line-clamp-3">
                          {policy.description}
                        </p>
                        <div className="text-sm text-gray-600 grid grid-cols-2 gap-y-1">
                          <p><strong>พรรค:</strong> {policy.partyName}</p>
                          <p><strong>งบประมาณ:</strong> {policy.budget.toLocaleString()} บาท</p>
                          <p><strong>หมวดหมู่:</strong> {policy.categoryName}</p>
                          <p><strong>ความคืบหน้า:</strong> {policy.progress}%</p>
                          <p><strong>สถานะ:</strong> {policy.status}</p>
                        </div>
                      </div>

                      <div className="mt-6 flex items-center justify-between">
                        <LikeButton
                          policyId={policy.policyId}
                          isLiked={likedState[policy.policyId] || false}
                          isProcessing={isLiking[policy.policyId] || false}
                          count={likesMap[policy.policyId] || 0}
                          onLike={handleLike}
                        />

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/policydetail/${policy.policyId}`);
                          }}
                          className="text-sm text-[#5D5A88] hover:underline"
                        >
                          ดูเพิ่มเติม →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default PolicyPage;