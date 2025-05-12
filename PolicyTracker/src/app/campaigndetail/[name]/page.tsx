"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { firestore } from "@/app/lib/firebase";
import Step from "@/app/components/step";
import { useRouter } from "next/navigation";
import { storage, ref, getDownloadURL } from "@/app/lib/firebase";
import { doc, getDoc, collection, onSnapshot } from "firebase/firestore";
import { Heart } from "lucide-react";


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
        setParty(data.policy?.party || null);
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
      const res = await fetch("/api/policylike", {
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

  return (
    <div className="font-prompt">
      <div className="bg-white">
        <Navbar />
        <div className="grid grid-rows-[auto_auto_1fr_1fr] grid-cols-4 grid-rows-4 bg-gradient-to-r from-[#0f0c29] via-[#302b63] to-[#24243e] h-[50svh]">
          <div className="flex items-start ml-10 mt-10">
            <button
              onClick={() => router.back()}
              className="text-[#5D5A88] bg-[#FFFFFF] hover:bg-[#5D5A88] hover:text-[#FFFFFF] rounded-full px-4 py-2"
            >
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


        {/* ── Banner Section ── */}
        <div className="relative w-full h-[25svh] overflow-hidden">
          {/* 1. ภาพพื้นหลัง จางด้วย brightness */}
          <img
            src={bannerUrl}
            alt="Banner"
            className="absolute inset-0 w-full h-full object-cover filter brightness-50 opacity-80"
          />
          {/* 2. Overlay เบา ๆ (ถ้าไม่ต้องการให้มืดลงมาก) */}
          {/* <div className="absolute inset-0 bg-black bg-opacity-10"></div> */}

          {/* 3. ข้อความชิดซ้าย */}
          <div className="relative z-10 flex flex-col justify-center items-start h-full px-10">
            {party ? (
              <>
                <h1 className="text-white font-bold text-[2rem] mb-2 text-left">
                  นโยบายจากพรรค{party.name}
                </h1>
                <p className="text-white text-[1rem] mb-4 text-left max-w-2xl">
                  {party.description}
                </p>
                {party && (
                  <Link
                    href={`/party/${encodeURIComponent(party.name)}`}
                    className="self-start rounded-md bg-[#5D5A88] px-6 py-2 text-white hover:bg-[#46426b]"
                  >
                    อ่านเพิ่มเติมเกี่ยวกับพรรค
                  </Link>
                )}
              </>
            ) : (
              <>
                <h1 className="text-white font-bold text-[2.5rem] mb-2 text-left">
                  {policyName}
                </h1>
                <p className="text-white text-[1.5rem] text-left max-w-2xl">
                  {description}
                </p>
              </>
            )}
          </div>
        </div>




        <div className="w-5/6 mx-auto">
          <h2 className="text-[#5D5A88] my-10">ลำดับเหตุการณ์</h2>
          {/* ✅ สร้าง State เพื่อดูว่าจะแสดงทั้งหมดไหม */}
          {timeline.length > 0 && (
            <>
              <ol className="items-center sm:flex bg-white mb-0 flex-wrap">
                {(showAllTimeline ? timeline : timeline.slice(0, 4)).map((item, idx) => (
                  <li key={idx} className="relative mb-6 sm:mb-0 w-full sm:w-auto">
                    <div className="flex items-center">
                      <div className="z-10 flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full"></div>
                      <div className="hidden sm:flex w-full bg-gray-200 h-0.5"></div>
                    </div>
                    <div className="mt-3 sm:pe-8">
                      <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                      <time className="block mb-2 text-sm text-gray-400">{item.date}</time>
                      <p className="text-base text-gray-500">{item.description}</p>
                    </div>
                  </li>
                ))}
              </ol>

              {/* ✅ ปุ่มดูเพิ่มเติม */}
              {timeline.length > 4 && (
                <div className="text-center mt-4">
                  <button
                    className="px-4 py-2 bg-[#5D5A88] text-white rounded-md"
                    onClick={() => setShowAllTimeline(!showAllTimeline)}
                  >
                    {showAllTimeline ? "แสดงน้อยลง" : "ดูเพิ่มเติม"}
                  </button>
                </div>
              )}
            </>
          )}

          <h2 className="text-[#5D5A88] my-10">ความสำเร็จ</h2>
          <div className="flex justify-center bg-white h-[300px]">
            <div className="grid grid-cols-3 gap-6 w-1/2 mt-10 mb-10 max-w-[900px] w-full">
              <div className="border border-gray-300 rounded-xl p-4 text-center max-w-[300px]">
                <h3 className="text-[#5D5A88] mb-3">เชิงโครงการ</h3>
                <p className="text-[#5D5A88]">{achievement.project?.description || "-"}</p>
              </div>
              <div className="border border-gray-300 rounded-xl p-4 text-center max-w-[300px]">
                <h3 className="text-[#5D5A88] mb-3">เชิงกระบวนการ</h3>
                <p className="text-[#5D5A88]">{achievement.process?.description || "-"}</p>
              </div>
              <div className="border border-gray-300 rounded-xl p-4 text-center max-w-[300px]">
                <h3 className="text-[#5D5A88] mb-3">เชิงนโยบาย</h3>
                <p className="text-[#5D5A88]">{achievement.policy?.description || "-"}</p>
              </div>
            </div>
          </div>

          <h2 className="text-[#5D5A88] my-10">โครงการที่เกี่ยวข้อง</h2>
          {relatedProjects.length > 0 ? (
            <div className="grid grid-cols-2 gap-6 mt-4 mb-20">
              {relatedProjects.map((project, idx) => (
                <Link
                  href={`/campaigndetail/${encodeURIComponent(project.name)}`}
                  key={project.name || idx} // ใช้ name ถ้ามี หรือ fallback เป็น index
                  className="no-underline"
                >
                  <div className="border border-gray-300 rounded-xl p-4 hover:shadow-md transition cursor-pointer h-full">
                    <h3 className="text-[#5D5A88] mb-2">{project.name}</h3>
                    <p className="text-[#5D5A88]">{project.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-[#5D5A88] mb-10">ไม่มีโครงการที่เกี่ยวข้อง</p>
          )}

          {/* ── นโยบายที่เกี่ยวข้อง ── */}
          <h2 className="text-[#5D5A88] my-10">นโยบายที่เกี่ยวข้อง</h2>
          {policy ? (
            <div className="grid grid-cols-2 gap-6 mt-4 mb-20">
              <Link
                href={`/policydetail/${encodeURIComponent(policy.name)}`}
                key={policy.name}
                className="no-underline"
              >
                <div className="border border-gray-300 rounded-xl p-4 hover:shadow-md transition cursor-pointer h-full">
                  <h3 className="text-[#5D5A88] mb-2">{policy.name}</h3>
                  <p className="text-[#5D5A88]">{policy.description}</p>
                </div>
              </Link>
            </div>
          ) : (
            <p className="text-[#5D5A88] mb-10">ไม่มีนโยบายที่เกี่ยวข้อง</p>
          )}

          {/* ── กิจกรรมที่เกี่ยวข้อง ── */}
          <h2 className="text-[#5D5A88] my-10">กิจกรรมที่เกี่ยวข้อง</h2>
          {Array.isArray(relatedEvents) && relatedEvents.some(e => e.name && e.description) ? (

            <div className="grid grid-cols-2 gap-6 mt-4 mb-20">
              {relatedEvents.map((event, idx) => (
                <Link
                  href={`/eventdetail/${encodeURIComponent(event.name)}`}
                  key={event.name || idx}
                  className="no-underline"
                >
                  <div className="border border-gray-300 rounded-xl p-4 hover:shadow-md transition cursor-pointer h-full">
                    <h3 className="text-[#5D5A88] mb-2">{event.name}</h3>
                    <p className="text-[#5D5A88]">{event.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-[#5D5A88] mb-10">ไม่มีกิจกรรมที่เกี่ยวข้อง</p>
          )}









        </div>
        <Footer />
      </div>
    </div>
  );
};

export default CampaignDetailPage;