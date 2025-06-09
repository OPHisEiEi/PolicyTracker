"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { getDocs, collection } from "firebase/firestore";
import { getDownloadURL, ref } from "firebase/storage";
import { firestore, storage } from "@/app/lib/firebase";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";

interface Member {
  id: string;
  FirstName: string;
  LastName: string;
  Role?: string;
  Picture?: string;
}

const PAGE_SIZE = 8;

export default function PartyPage() {
  const { id: encodedId } = useParams();
  const id = decodeURIComponent(encodedId as string);

  const [partyName, setPartyName] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");
  const [logo, setLogo] = useState("");
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [displayedMembers, setDisplayedMembers] = useState<Member[]>([]);
  const [leader, setLeader] = useState<Member | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchParty = async () => {
      try {
        const res = await fetch(`/api/party/${encodeURIComponent(id)}`);
        const data = await res.json();
        setPartyName(data.name);
        setDescription(data.description || "");
        setLink(data.link || "");
        setLogo(
          `https://firebasestorage.googleapis.com/v0/b/policy-tracker-kp.firebasestorage.app/o/party%2Flogo%2F${id}.png?alt=media`
        );
      } catch (err) {
        console.error("Error fetching party:", err);
      }
    };
    fetchParty();
  }, [id]);

  useEffect(() => {
    const downloadImage = async (path: string): Promise<string> => {
      try {
        return await getDownloadURL(ref(storage, path));
      } catch {
        return "/default-profile.png";
      }
    };

    const fetchMembers = async () => {
      try {
        const snapshot = await getDocs(collection(firestore, "Party", id, "Member"));
        const data: Member[] = await Promise.all(
          snapshot.docs.map(async (doc) => {
            const d = doc.data();
            const memberId = doc.id;
            const jpgPath = `party/member/${id}/${memberId}.jpg`;
            const pngPath = `party/member/${id}/${memberId}.png`;

            let imageUrl = await downloadImage(jpgPath);
            if (imageUrl === "/default-profile.png") {
              imageUrl = await downloadImage(pngPath);
            }

            return {
              id: memberId,
              FirstName: d.FirstName || "ไม่ระบุชื่อ",
              LastName: d.LastName || "ไม่ระบุนามสกุล",
              Role: d.Role || "ไม่ระบุตำแหน่ง",
              Picture: imageUrl,
            };
          })
        );

        const head = data.find((m) => m.Role === "หัวหน้าพรรค") || null;
        setLeader(head);
        const filtered = data.filter((m) => m.Role !== "หัวหน้าพรรค");
        setAllMembers(filtered);
        setDisplayedMembers(filtered.slice(0, PAGE_SIZE));
      } catch (err) {
        console.error("Error fetching members:", err);
      }
    };
    fetchMembers();
  }, [id]);

  useEffect(() => {
    const onScroll = () => {
      if (
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 200 &&
        displayedMembers.length < allMembers.length
      ) {
        const nextPage = page + 1;
        setPage(nextPage);
        const nextItems = allMembers.slice(0, nextPage * PAGE_SIZE);
        setDisplayedMembers(nextItems);
      }
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [page, allMembers, displayedMembers]);

  return (
    <div className="font-prompt">
      <Navbar />
      <div
        className="bg-cover bg-center"
        style={{ backgroundImage: "url('/bg/พรรค.png')" }}
      >
        <div className="flex flex-row mb-10">
          <div className="grid grid-rows-3 p-12 w-2/3">
            <div className="flex gap-20 items-center mb-10">
              <h1 className="text-white text-[4rem] m-0 font-bold">พรรค{partyName}</h1>
              <img
                className="h-[70px]"
                src={logo || "/default-logo.png"}
                alt="โลโก้พรรค"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/default-logo.png";
                }}
              />
            </div>

            <p className="text-white max-w-[80%] text-[1.5rem]">{description}</p>
            <div className="mt-20">
              {link && (
                <a href={link} target="_blank" rel="noopener noreferrer">
                  <button className="w-[200px] px-4 py-3 bg-white text-[#5D5A88] text-[20px] rounded-lg  hover:text-white hover:bg-fuchsia-950 transition duration-300">
                    เว็บไซต์พรรค
                  </button>

                </a>
              )}
            </div>
          </div>
          <div className="flex flex-col items-center justify-center w-1/3 p-8 rounded-lg shadow-md gap-10">
            {leader ? (
              <>
                <h2 className="text-white text-center text-[2rem] font-bold">{leader.Role}</h2>
                <img
                  src={leader.Picture || "/default-profile.png"}
                  alt={leader.Role}
                  loading="lazy"
                  className="w-[400px] h-[400px] rounded-full mt-4 shadow-lg object-cover"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    img.src = "/default-profile.png";
                  }}
                />
                <p className="text-white text-[32px] font-semibold">
                  {`${leader.FirstName} ${leader.LastName}`}
                </p>
              </>
            ) : (
              <p className="text-white text-center">ไม่พบข้อมูลหัวหน้าพรรค</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col justify-center w-[95%] mx-auto">
        <h3 className="font-bold text-[#5D5A88] text-[2rem] mb-10">กรรมการบริหารพรรค</h3>

        <div className="grid grid-cols-4 gap-4 mb-10">
          {displayedMembers.length > 0 ? (
            displayedMembers.map((m) => (
              <div
                key={m.id}
                className="flex flex-row justify-center border-2 border-gray-200 rounded-xl py-4 px-6"
              >
                <div className="w-1/2">
                  <h4 className="text-[#5D5A88] text-[1.5rem]">{m.Role}</h4>
                  <p className="text-[#5D5A88]">{`${m.FirstName} ${m.LastName}`}</p>
                </div>
                <div className="w-1/2">
                  <img
                    className="w-[200px] h-[200px] rounded-full object-cover"
                    src={m.Picture || "/default-profile.png"}
                    alt={m.FirstName}
                    loading="lazy"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      img.src = "/default-profile.png";
                    }}
                  />
                </div>
              </div>
            ))
          ) : (
            <p className="text-[#5D5A88]">ไม่มีข้อมูลสมาชิก</p>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
