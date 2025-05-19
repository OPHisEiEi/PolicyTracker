"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { firestore } from "@/app/lib/firebase";
import Step from "@/app/components/step";
import { useRouter } from "next/navigation";
import { storage, } from "@/app/lib/firebase";
import { getDownloadURL, ref } from "firebase/storage";
import { doc, getDoc, collection, onSnapshot } from "firebase/firestore";
import { Heart } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import { listAll, } from "firebase/storage";

interface TimelineItem {
  date: string;
  name: string;
  description: string;
}

interface AchievementItem {
  name: string;
  description: string;
}

interface Achievements {
  [key: string]: AchievementItem | null;
}

interface Party {
  name: string;
  description: string;
  link?: string | null;
}

const CampaignDetailPage = () => {
  const router = useRouter();
  const params = useParams();
  const name = decodeURIComponent(params.name as string);
  const [showModal, setShowModal] = useState<boolean>(false);

  const [policyName, setPolicyName] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState<string>("");

  // 2. State เก็บ like
  const [likeCount, setLikeCount] = useState<number>(0);
  const [isLiked, setIsLiked] = useState<boolean>(false);

  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [achievement, setAchievement] = useState<{
    project?: { name: string; description: string };
    process?: { name: string; description: string };
    policy?: { name: string; description: string };
  }>({});
  const [status, setStatus] = useState<number | null>(null); // เก็บสถานะจาก Neo4j
  const [showAllTimeline, setShowAllTimeline] = useState(false);
  const stepMap: Record<string, { label: string; color: string; step: number }> = {
    "เริ่มนโยบาย": { label: "เริ่มนโยบาย", color: "#DF4F4D", step: 1 },
    "วางแผน": { label: "วางแผน", color: "#F29345", step: 2 },
    "ตัดสินใจ": { label: "ตัดสินใจ", color: "#F97316", step: 3 },
    "ดำเนินการ": { label: "ดำเนินการ", color: "#64C2C7", step: 4 },
    "ประเมินผล": { label: "ประเมินผล", color: "#33828D", step: 5 },
  };
  const [relatedProjects, setRelatedProjects] = useState<{ name: string; description: string }[]>([]);
  const [party, setParty] = useState<
    { name: string; description?: string; link?: string } | null
  >(null);
  const [bannerUrl, setBannerUrl] = useState<string>("");
  const [policy, setPolicy] = useState<{ name: string; description: string; status: string } | null>(null);
  const [relatedEvents, setRelatedEvents] = useState<{ name: string; description: string }[]>([]);
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>("");

  useEffect(() => {
    const loadPdfUrl = async () => {
      if (!name) return;

      try {
        const pdfRef = ref(storage, `campaign/reference/${name}.pdf`);
        const url = await getDownloadURL(pdfRef);
        setPdfUrl(url);
      } catch (err) {
        console.warn("ไม่พบ PDF สำหรับโครงการนี้");
        setPdfUrl(""); // หรือ null
      }
    };

    loadPdfUrl();
  }, [name]);

  useEffect(() => {
    console.log("✅ Status จาก Neo4j:", status);
  }, [status]);

  useEffect(() => {
    if (bannerUrl) {
      console.log("✅ bannerUrl =", bannerUrl);
    }
  }, [bannerUrl]);


  useEffect(() => {

    type AchievementData = { name: string; description: string };

    const fetchNeo4j = async () => {
      try {
        const res = await fetch(`/api/campaigndetail/${encodeURIComponent(name)}`);
        const data = await res.json();
        setPolicyName(data.name || name);
        setDescription(data.description || "");
        setStatus(data.status || null);
        setRelatedProjects(data.relatedProjects || []); // ✅ set โครงการ
        setParty(data.party || null);
        setPolicy(data.policy || null);
        setRelatedEvents(Array.isArray(data.relatedEvents) ? data.relatedEvents : []);



        // ดึง banner URL จาก API เซิฟเวอร์
        // เรียก API /api/banner/[name] ให้ฝั่งเซิร์ฟเวอร์คืน URL ที่พร้อมใช้
        const res2 = await fetch(`/api/campaignbanner/${encodeURIComponent(data.name)}`);
        if (res2.ok) {
          // อ่านเป็น plain text แทน JSON
          const url = res2.url;
          setBannerUrl(url);
        } else {
          console.warn("ไม่พบ banner ใน API /api/banner");
        }

        if (Array.isArray(data.relatedProjects)) {
          setRelatedProjects(data.relatedProjects);
        }
      } catch (error) {
        console.error("Neo4j error:", error);
      }
    };


    const fetchTimeline = () => {
      const timelineRef = collection(firestore, "Campaign", name, "sequence");
      onSnapshot(timelineRef, (snapshot) => {
        const items: TimelineItem[] = snapshot.docs.map((doc) => doc.data() as TimelineItem);

        // ✅ เรียงลำดับวันที่ใหม่ (จากล่าสุด -> เก่าสุด)
        const sorted = items.sort((a, b) => {
          // แปลง date string → Date object แล้วเปรียบเทียบ
          const dateA = new Date(a.date.replace(/(\d+)\s([^\d]+)\s(\d+)/, (_, d, m, y) => {
            const thMonths = {
              "ม.ค.": "Jan", "ก.พ.": "Feb", "มี.ค.": "Mar", "เม.ย.": "Apr",
              "พ.ค.": "May", "มิ.ย.": "Jun", "ก.ค.": "Jul", "ส.ค.": "Aug",
              "ก.ย.": "Sep", "ต.ค.": "Oct", "พ.ย.": "Nov", "ธ.ค.": "Dec",
            };
            return `${d} ${thMonths[m as keyof typeof thMonths] || m} ${parseInt(y) - 543}`; // แปลง พ.ศ. → ค.ศ.
          }));

          const dateB = new Date(b.date.replace(/(\d+)\s([^\d]+)\s(\d+)/, (_, d, m, y) => {
            const thMonths = {
              "ม.ค.": "Jan", "ก.พ.": "Feb", "มี.ค.": "Mar", "เม.ย.": "Apr",
              "พ.ค.": "May", "มิ.ย.": "Jun", "ก.ค.": "Jul", "ส.ค.": "Aug",
              "ก.ย.": "Sep", "ต.ค.": "Oct", "พ.ย.": "Nov", "ธ.ค.": "Dec",
            };
            return `${d} ${thMonths[m as keyof typeof thMonths] || m} ${parseInt(y) - 543}`;
          }));

          return dateB.getTime() - dateA.getTime(); // ✅ เรียงจากใหม่ → เก่า
        });

        setTimeline(sorted);
      });
    };


    const fetchAchievements = async () => {
      const processRef = doc(firestore, "Campaign", name, "achievement", "เชิงกระบวนการ");
      const policyRef = doc(firestore, "Campaign", name, "achievement", "เชิงการเมือง");
      const projectRef = doc(firestore, "Campaign", name, "achievement", "เชิงโครงการ");

      const [processSnap, policySnap, projectSnap] = await Promise.all([
        getDoc(processRef),
        getDoc(policyRef),
        getDoc(projectRef),
      ]);

      setAchievement({
        process: processSnap.exists() ? (processSnap.data() as AchievementData) : undefined,
        policy: policySnap.exists() ? (policySnap.data() as AchievementData) : undefined,
        project: projectSnap.exists() ? (projectSnap.data() as AchievementData) : undefined,
      });

    };

    const fetchPolicy = async () => {
      const res = await fetch(`/api/policydetail/${encodeURIComponent(name)}`);
      const data = await res.json();
      setPolicyName(data.name || "name");
      setDescription(data.description || "");
      setStatus(data.status || null); // เก็บค่า status
    };

    fetchNeo4j();
    fetchTimeline();
    fetchAchievements();

    // 🔴 2. ดึงจำนวน like จาก API หลังจาก fetchNeo4j()
    fetch(`/api/campaignlike?name=${encodeURIComponent(name)}`)
      .then((res) => res.json())
      .then((data) => {
        const raw = data.like;
        const count = typeof raw === "number"
          ? raw
          : (typeof raw?.toNumber === "function" ? raw.toNumber() : Number(raw));
        setLikeCount(count || 0);
      });
    // 🔴 init isLiked จาก localStorage (จะได้เก็บสถานะคนกดแต่ละเครื่อง)
    setIsLiked(localStorage.getItem(`liked_${name}`) === "true"); // 🔴 2. ดึงจำนวน like จาก API หลังจาก fetchNeo4j()
    fetch(`/api/campaignlike?name=${encodeURIComponent(name)}`)
      .then((res) => res.json())
      .then((data) => {
        const raw = data.like;
        const count = typeof raw === "number"
          ? raw
          : (typeof raw?.toNumber === "function" ? raw.toNumber() : Number(raw));
        setLikeCount(count || 0);
      });
    // 🔴 init isLiked จาก localStorage (จะได้เก็บสถานะคนกดแต่ละเครื่อง)
    setIsLiked(localStorage.getItem(`liked_${name}`) === "true");
  }, [name]);

  const handleLike = async () => {
    const action = isLiked ? "decrement" : "increment";
    try {
      const res = await fetch("/api/campaignlike", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: policyName, action }),
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      const raw = data.like;
      const newCount =
        typeof raw === "number"
          ? raw
          : typeof raw?.toNumber === "function"
            ? raw.toNumber()
            : Number(raw) || 0;
      setLikeCount(newCount);

      const newVal = !isLiked;
      setIsLiked(newVal);
      localStorage.setItem(`liked_${policyName}`, newVal.toString());
    } catch (err) {
      console.error("❌ handleLike error:", err);
    }
  };



  useEffect(() => {
    async function fetchData() {
      const res = await fetch(`/api/campaigndetail/${encodeURIComponent(name)}`);
      const data = await res.json();
      // … ดึง banner เดิม …
      // ➡️ ดึงโลโก้พรรค
      if (data.party?.name) {
        const logoRes = await fetch(`/api/partylogo/${encodeURIComponent(data.party.name)}`);
        if (logoRes.ok) setLogoUrl(logoRes.url);
        else console.warn('ไม่พบโลโก้ใน API /api/partylogo');
      }
    }
    fetchData();
  }, [name]);

  useEffect(() => {
    // สมมติว่าใน Firebase Console คุณอัปโหลดโฟลเดอร์ชื่อตรง ๆ
    // เช่น "campaign/picture/My Campaign" (มีช่องว่าง, อักขระไทย ฯลฯ)
    const folderRef = ref(storage, `campaign/picture/${name}`);

    listAll(folderRef)
      .then(res => {
        // ดูว่ามันเจอไฟล์อะไรบ้าง
        console.log("found items:", res.items.map(i => i.fullPath));
        return Promise.all(res.items.map(item => getDownloadURL(item)));
      })
      .then(urls => {
        console.log("download URLs:", urls);
        setGalleryUrls(urls);
      })
      .catch(err => {
        console.error("โหลดแกลเลอรีผิดพลาด:", err);
      });
  }, [name]);


  return (
    <div className="font-prompt">
      <div className="bg-white">
        <Navbar />
        <div
          className="relative grid grid-rows-[auto_auto_1fr_1fr] grid-cols-4 h-[50svh] bg-cover bg-center"
          style={{
            backgroundImage: "url('/bg/หัวข้อ.png')"
          }}
        >
          <div className="flex items-start ml-10 mt-10">
            <button
              onClick={() => router.back()}
              className="
                flex items-center gap-2
                px-6 py-3
                bg-white text-[#2C3E50] font-medium
                rounded-full
                shadow-md hover:shadow-lg
               hover:!bg-[#316599] hover:!text-white
                transform hover:-translate-y-0.5
                transition-all duration-200 ease-in-out
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5D5A88]/50
              "
            >
              <ArrowLeft className="w-5 h-5" />
              ย้อนกลับ
            </button>
          </div>
          <div className="col-start-2 row-start-1 row-end-2 col-span-2 row-span-2 text-center">
            <div className="col-start-2 row-start-1 row-end-2 col-span-2 row-span-2 text-center">
              {/* ชื่อหัวเรื่อง */}
              <h1 className="text-white p-10 font-bold text-[2.5rem]">
                {policyName}
              </h1>

              {/* คำอธิบายจำกัด 4 บรรทัด + ปุ่มอ่านเพิ่มเติม */}
              <div className="mx-auto max-w-3xl text-center">
                <p
                  className="text-white text-[1.5rem] m-0 overflow-hidden"
                  style={
                    !showModal
                      ? {
                        display: "-webkit-box",
                        WebkitLineClamp: 4,
                        WebkitBoxOrient: "vertical",
                      }
                      : {}
                  }
                >
                  {description}
                </p>
                {!showModal && (
                  <button
                    onClick={() => setShowModal(true)}
                    className="text-[#ffffff] mt-2 underline"
                  >
                    อ่านเพิ่มเติม
                  </button>
                )}
              </div>

              {/* Modal แสดงข้อความเต็ม */}
              {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white p-6 rounded-md max-w-lg mx-auto">
                    <h2 className="text-xl font-semibold mb-4">
                      รายละเอียดนโยบายฉบับเต็ม
                    </h2>
                    <p className="text-black text-[1.5rem] whitespace-pre-wrap">
                      {description}
                    </p>
                    <button
                      onClick={() => setShowModal(false)}
                      className="mt-4 px-4 py-2 bg-[#5D5A88] text-white rounded-md"
                    >
                      ปิด
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Badge พรรค */}
            {party && logoUrl && (
              <Link
                href={`/party/${encodeURIComponent(party.name)}`}
                className="absolute top-6 right-6 z-20"
              >
                <div className="bg-white rounded-2xl shadow-lg p-4 flex items-center space-x-3 cursor-pointer">
                  {/* กล่องเก็บรูปขนาด 48x48px พร้อม overflow */}
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={logoUrl}
                      alt={`โลโก้พรรค ${party.name}`}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <span className="text-gray-800 font-semibold text-base">
                    พรรค{party.name}
                  </span>
                </div>
              </Link>
            )}

          </div>

          <div className="row-start-3 col-start-2 col-span-2 flex justify-center items-center p-10 space-x-4">
            {status && stepMap[status] && (
              <Step
                step={stepMap[status].step}
                label={stepMap[status].label}
                bgColor={stepMap[status].color}
              />
            )}
            <button onClick={handleLike} className="focus:outline-none">
              <Heart
                size={26}
                fill={isLiked ? "currentColor" : "none"}
                className={isLiked ? "text-[#e32222]" : "text-gray-200"}
              />
            </button>

            <span className="text-white text-lg">{likeCount}</span>
          </div>
        </div>


        <div className="bg-[#e2edfe] relative z-10 flex flex-col items-center h-full px-6 sm:px-10 lg:px-16 xl:px-24 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 w-full max-w-7xl">

            {/* 🔹 ซ้าย: โครงการ + นโยบาย + กิจกรรม */}
            <div className="space-y-10 col-span-1">

              {/* 📁 โครงการ */}
              <section>
                <h2 className="text-xl font-bold text-[#2C3E50] mb-4">📁 โครงการที่เกี่ยวข้อง</h2>
                {relatedProjects.filter(p => p.name?.trim()).length > 0 ? (
                  <div className="space-y-4">
                    {relatedProjects
                      .filter(p => p.name?.trim())
                      .map((project, idx) => (
                        <Link
                          href={`/campaigndetail/${encodeURIComponent(project.name)}`}
                          key={project.name || idx}
                          className="block bg-white rounded-xl shadow-md hover:shadow-lg transition p-4 border border-gray-200"
                        >
                          <h3 className="font-semibold text-[#5D5A88] text-lg mb-1">{project.name}</h3>
                          <p className="text-gray-700 break-words line-clamp-4 max-w-full overflow-hidden">
                            {project.description}
                          </p>

                        </Link>
                      ))}
                  </div>
                ) : (
                  <p className="text-gray-500">ไม่มีโครงการที่เกี่ยวข้อง</p> // ✅ แสดงข้อความแทน
                )}
              </section>




              {/* 📌 นโยบาย */}
              <section>
                <h2 className="text-xl font-bold text-[#2C3E50] mb-4">📌 นโยบายที่เกี่ยวข้อง</h2>
                {policy ? (
                  <Link
                    href={`/policydetail/${encodeURIComponent(policy.name)}`}
                    className="block bg-white rounded-xl shadow-md hover:shadow-xl transition p-4 border border-gray-200"
                  >
                    <h3 className="font-semibold text-[#5D5A88] text-lg mb-1">{policy.name}</h3>
                    <p className="text-gray-700 break-words line-clamp-4 max-w-full overflow-hidden">
                      {policy.description}
                    </p>

                  </Link>
                ) : (
                  <p className="text-gray-500">ไม่มีนโยบายที่เกี่ยวข้อง</p>
                )}
              </section>

              {/* 📅 กิจกรรม */}
              <section>
                <h2 className="text-xl font-bold text-[#2C3E50] mb-4">📅 กิจกรรมที่เกี่ยวข้อง</h2>
                {Array.isArray(relatedEvents) && relatedEvents.some(e => e.name && e.description) ? (
                  <div className="space-y-4">
                    {relatedEvents.map((event, idx) => (
                      <Link
                        href={`/eventdetail/${encodeURIComponent(event.name)}`}
                        key={event.name || idx}
                        className="block bg-white rounded-xl shadow-md hover:shadow-xl transition p-4 border border-gray-200"
                      >
                        <h3 className="font-semibold text-[#5D5A88] text-lg mb-1">{event.name}</h3>
                        <p className="text-gray-700 break-words line-clamp-4 max-w-full overflow-hidden">
                          {event.description}
                        </p>

                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">ไม่มีกิจกรรมที่เกี่ยวข้อง</p>
                )}
              </section>
            </div>

            {/* 💸 ขวา: การเงิน */}
            <div className="col-span-1">
              <section>
                <h2 className="text-xl font-bold text-[#2C3E50] mb-4">💸 การเงิน</h2>
                <div className="relative rounded-xl overflow-hidden shadow-md border border-gray-200 bg-white">
                  <div className="w-full h-0 pb-[56.25%]" />
                  <iframe
                    title="การเงิน"
                    src={
                      "https://app.powerbi.com/reportEmbed?" +
                      "reportId=f8ae1b9b-fa2e-467b-bb5a-a1a46b4f3dd9" +
                      "&autoAuth=true&ctid=0a43deb9-efb0-4f46-8594-71899230fda6" +
                      "&actionBarEnabled=false&filterPaneEnabled=false&navContentPaneEnabled=false&pageView=fitToWidth"
                    }
                    className="absolute inset-0 w-full h-full border-0"
                    allowFullScreen
                  />
                </div>
              </section>
              {pdfUrl && (
  <div className="mt-6 bg-white border border-gray-200 rounded-xl p-4 shadow hover:shadow-lg transition">
    <h3 className="text-lg font-bold text-[#2C3E50] mb-2">📄 เอกสารอ้างอิง</h3>
    <a
      href={pdfUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[#5D5A88] underline hover:text-[#3e3a6d]"
    >
      🔗 เปิดเอกสารอ้างอิง
    </a>
  </div>
)}

            </div>
          </div>
        </div>



<section className="bg-gradient-to-br from-[#e2edfe] to-[#ffffff] py-16 bg-center bg-cover" style={{ backgroundImage: "url('/bg/หัวข้อ.png')" }}>
        <h2 className="text-white text-center font-bold text-3xl mb-12 tracking-wide">แกลอรี่รูปภาพ</h2>

  <div className="max-w-7xl mx-auto px-6">
    {galleryUrls.length > 0 ? (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {galleryUrls.map((url, idx) => (
          <div
            key={idx}
            className="group relative overflow-hidden rounded-2xl shadow-xl cursor-pointer transform transition-all hover:scale-105 hover:shadow-2xl"
            onClick={() => setSelectedUrl(url)}
          >
            <img
              src={url}
              alt={`รูปที่ ${idx + 1}`}
              className="w-full h-60 object-cover transition duration-500 ease-in-out group-hover:brightness-75"
            />
            
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-10 backdrop-blur-sm"></div>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-center text-gray-500 text-lg">ไม่มีรูปภาพในแกลเลอรี</p>
    )}
  </div>

  {/* 🔍 Modal for expanded view */}
  {selectedUrl && (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 p-6"
      onClick={() => setSelectedUrl(null)}
    >
      <img
        src={selectedUrl}
        alt="ขยายภาพ"
        className="max-w-full max-h-full rounded-2xl shadow-2xl border-4 border-white"
      />
    </div>
  )}
</section>


        <Footer />
      </div>
    </div>
  );
};

export default CampaignDetailPage;