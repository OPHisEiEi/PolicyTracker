"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PRSidebar from "../components/PRSidebar";
import { collection, getDocs, getDoc, deleteDoc, doc, setDoc } from "firebase/firestore";
import { firestore } from "@/app/lib/firebase";
import { storage } from "@/app/lib/firebase";
import { deleteObject, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import LazyImage from "../components/LazyImage";

interface PartyInfo {
  party_des: string;
  party_link: string;
  party_logo: string;
}

interface Member {
  id: string;
  name: string;
  surname: string;
  role: string;
  image: string;
}

export default function PRPartyInfo() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [partyInfo, setPartyInfo] = useState<PartyInfo | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [partyId, setPartyId] = useState<string | null>(null);
  const [partyName, setPartyName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const pageSize = 9;
  const [currentPage, setCurrentPage] = useState(1);
  const observerRef = useRef<HTMLDivElement | null>(null);
  const [bulkImages, setBulkImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();

  const visibleMembers = useMemo(() =>
    members.slice(0, currentPage * pageSize),
    [members, currentPage, pageSize]
  );

  const hasMore = useMemo(() =>
    visibleMembers.length < members.length,
    [visibleMembers.length, members.length]
  );

  const resizeImage = useCallback((file: File, maxSize = 600): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        if (!e.target?.result) return reject("ไม่พบรูป");

        img.src = e.target.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxSize) {
              height *= maxSize / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width *= maxSize / height;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject("Resize failed");
          }, "image/jpeg", 0.8);
        };
      };

      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);

  useEffect(() => {
    if (!observerRef.current || members.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setCurrentPage((prev) => prev + 1);
        }
      },
      {
        rootMargin: "100px",
        threshold: 0.1,
      }
    );

    observer.observe(observerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [members]);

  useEffect(() => {
    const id = localStorage.getItem("partyId");
    const name = localStorage.getItem("partyName")?.replace(/^พรรค\s*/g, "").trim() || null;
    if (id) setPartyId(id);
    if (name) setPartyName(name);
  }, []);

  useEffect(() => {
    if (!partyId || !partyName) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [partyDataResponse, memberSnapshot] = await Promise.all([
          fetch(`/api/pr-partyinfo/${partyId}`),
          getDocs(collection(firestore, "Party", partyId!, "Member"))
        ]);

        const partyData = await partyDataResponse.json();

        let logoUrl = "/default-party-logo.png";
        const logoExtensions = ['png', 'jpg'];

        for (const ext of logoExtensions) {
          try {
            const testUrl = `https://firebasestorage.googleapis.com/v0/b/policy-tracker-kp.firebasestorage.app/o/party%2Flogo%2F${encodeURIComponent(partyId)}.${ext}?alt=media`;
            const response = await fetch(testUrl, { method: 'HEAD' }); 
            if (response.ok) {
              logoUrl = testUrl;
              break;
            }
          } catch (err) {
            continue;
          }
        }

        setPartyInfo({
          party_des: partyData.description ?? "-",
          party_link: partyData.link ?? "-",
          party_logo: logoUrl,
        });

        const memberPromises = memberSnapshot.docs.map(async (docSnap) => {
          const member = docSnap.data();
          const firstName: string = member.FirstName || "ไม่ระบุชื่อ";
          const lastName: string = member.LastName || "ไม่ระบุนามสกุล";
          const id = member.id || docSnap.id;
          const role = member.Role || "-";

          return {
            id,
            name: firstName,
            surname: lastName,
            role,
            image: "/default-profile.png", 
            needsImageLoad: true
          };
        });

        const memberData = await Promise.all(memberPromises);
        setMembers(memberData);

        setTimeout(() => {
          loadMemberImages(memberData);
        }, 100);

      } catch (error) {
        console.error("Error fetching party info:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [partyId, partyName]);

  const loadMemberImages = useCallback(async (memberData: any[]) => {
    const batchSize = 5; 

    for (let i = 0; i < memberData.length; i += batchSize) {
      const batch = memberData.slice(i, i + batchSize);

      const imagePromises = batch.map(async (member) => {
        if (!member.needsImageLoad) return member;

        const imagePaths = [
          `party/member/${partyId}/${member.id}.jpg`,
          `party/member/${partyId}/${member.id}.png`
        ];

        let pictureUrl = "/default-profile.png";

        for (const path of imagePaths) {
          try {
            const url = await getDownloadURL(ref(storage, path));
            pictureUrl = url;
            break;
          } catch (err) {
            continue;
          }
        }

        return {
          ...member,
          image: pictureUrl,
          needsImageLoad: false
        };
      });

      const updatedBatch = await Promise.all(imagePromises);

      setMembers(prev =>
        prev.map(m => {
          const updated = updatedBatch.find(u => u.id === m.id);
          return updated || m;
        })
      );

      if (i + batchSize < memberData.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
  }, [partyId]);

  const goToPartyInfoForm = useCallback(() => router.push("/prPartyInfoForm"), [router]);
  const goToMemberForm = useCallback(() => router.push("/prMemberForm"), [router]);

  const deleteMember = useCallback(async (id: string) => {
    if (!partyId || !confirm("คุณต้องการลบสมาชิกคนนี้หรือไม่?")) return;
    try {
      const docRef = doc(firestore, "Party", partyId!, "Member", String(id));
      const docSnap = await getDoc(docRef);
      const data = docSnap.data();

      const deletePromises = [
        deleteDoc(docRef),
        deleteObject(ref(storage, `party/member/${partyId}/${id}.jpg`)).catch(() => { }),
        deleteObject(ref(storage, `party/member/${partyId}/${id}.png`)).catch(() => { })
      ];

      await Promise.all(deletePromises);
      setMembers((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error("Error deleting member:", err);
    }
  }, [partyId]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    setBulkImages(fileArray);
    setPreviewUrls(fileArray.map((file) => URL.createObjectURL(file)));
  }, []);

  const handleRemoveImage = useCallback((index: number) => {
    setBulkImages(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleClearAll = useCallback(() => {
    setBulkImages([]);
    setPreviewUrls([]);
  }, []);

  const editMember = useCallback((id: string | number) => {
    router.push(`/prMemberFormEdit?editId=${id}`);
  }, [router]);

  if (loading || !partyName) {
    return (
      <div className="min-h-screen bg-cover bg-center flex items-center justify-center"
        style={{ backgroundImage: "url('/bg/ผีเสื้อ.jpg')" }}>
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>กำลังโหลดข้อมูลพรรค...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cover bg-center flex" style={{ backgroundImage: "url('/bg/ผีเสื้อ.jpg')" }}>
      <PRSidebar />
      <div className="flex-1 md:ml-64">
        <header className="bg-white p-4 shadow-md flex justify-between items-center sticky top-0 z-10">
          <h1 className="text-2xl font-bold text-[#5D5A88]">PR พรรค {partyName}</h1>
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-3xl text-[#5D5A88]">☰</button>
        </header>

        <main className="p-6">
          <div className="flex justify-end mb-4">
            <button onClick={goToPartyInfoForm} className="bg-[#5D5A88] text-white px-4 py-2 rounded-md hover:bg-[#46426b]">
              ✏ แก้ไขข้อมูลพรรค
            </button>
          </div>

          <h2 className="text-3xl text-white text-center">ข้อมูลพรรค</h2>
          {partyInfo && (
            <div className="bg-white p-6 rounded-lg shadow-lg mt-4 relative">
              <p><strong>รายละเอียด:</strong> {partyInfo.party_des}</p>
              <p>
                <strong>เว็บไซต์:</strong>{" "}
                <a
                  href={partyInfo.party_link}
                  target="_blank"
                  className="text-blue-600 underline"
                >
                  {partyInfo.party_link}
                </a>
              </p>
              <img
                src={partyInfo.party_logo}
                alt="โลโก้พรรค"
                className="mt-4 h-32 rounded shadow-md"
                loading="lazy"
              />
            </div>
          )}

          <div className="flex justify-between mt-6">
            <button
              onClick={async () => {
                if (!partyId) return;
                const confirmDelete = confirm("ต้องการลบสมาชิกทั้งหมดหรือไม่?");
                if (!confirmDelete) return;

                const snapshot = await getDocs(collection(firestore, "Party", partyId, "Member"));
                const deletePromises = [];

                for (const docSnap of snapshot.docs) {
                  const id = docSnap.data().id;
                  if (id == null) continue;

                  deletePromises.push(
                    deleteDoc(doc(firestore, "Party", partyId, "Member", String(id))),
                    deleteObject(ref(storage, `party/member/${partyId}/${id}.jpg`)).catch(() => { }),
                    deleteObject(ref(storage, `party/member/${partyId}/${id}.png`)).catch(() => { })
                  );
                }

                await Promise.all(deletePromises);
                alert("ลบสมาชิกและรูปทั้งหมดสำเร็จ");
                location.reload();
              }}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
            >
              🧹 ลบสมาชิกทั้งหมด
            </button>

            <button
              onClick={async () => {
                if (!partyName || !partyId) return alert("ไม่พบข้อมูลพรรค");
                const party = partyName.replace(/^พรรค\s*/, "").trim();

                try {
                  const res = await fetch(`/api/scrape-member?party=${encodeURIComponent(party)}`);
                  const data = await res.json();
                  console.log("จำนวนสมาชิกที่ดึงได้:", data.members?.length);

                  if (!data.members?.length) {
                    alert("ไม่พบข้อมูลสมาชิก");
                    return;
                  }

                  const confirmUpload = confirm(`ดึงข้อมูล ${data.members.length} คน ต้องการบันทึกทั้งหมดหรือไม่?`);
                  if (!confirmUpload) return;

                  const memberCollection = collection(firestore, `Party/${partyId}/Member`);
                  const snapshot = await getDocs(memberCollection);
                  let maxId = Math.max(...snapshot.docs.map(doc => doc.data().id || 0), 0);

                  const newMembers: Member[] = [];
                  const savePromises = [];

                  for (const m of data.members) {
                    const nameParts = m.name.trim().split(" ");
                    const firstName = nameParts.slice(0, -1).join(" ") || "-";
                    const lastName = nameParts.slice(-1)[0] || "-";
                    const role = m.role ?? "-";
                    const newId = ++maxId;

                    const docRef = doc(firestore, `Party/${partyId}/Member`, String(newId));
                    savePromises.push(
                      setDoc(docRef, {
                        FirstName: firstName,
                        LastName: lastName,
                        Role: role,
                        id: newId,
                      })
                    );

                    newMembers.push({
                      id: String(newId),
                      name: firstName,
                      surname: lastName,
                      role,
                      image: "/default-profile.png",
                    });
                  }

                  await Promise.all(savePromises);

                  if (newMembers.length > 0) {
                    setMembers(prev => [...prev, ...newMembers]);
                    alert("บันทึกสมาชิกทั้งหมดสำเร็จ");
                  } else {
                    alert("ไม่สามารถเพิ่มสมาชิกได้");
                  }

                } catch (err) {
                  console.error("ดึงข้อมูลล้มเหลว", err);
                  alert("เกิดข้อผิดพลาด");
                }
              }}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
            >
              📥 ดึงข้อมูลสมาชิกจาก กกต.
            </button>

            <button onClick={goToMemberForm} className="bg-[#5D5A88] text-white px-4 py-2 rounded-md hover:bg-[#46426b]">
              ➕ เพิ่มข้อมูลสมาชิก
            </button>
          </div>

          <div className="flex justify-center mt-6 flex-col items-center">
            <label className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
              📁 เลือกรูปสมาชิก
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                ref={inputRef}
              />
            </label>

            {bulkImages.length > 0 && (
              <p className="mt-2 text-white">{bulkImages.length} ไฟล์ที่เลือกแล้ว</p>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
              {previewUrls.map((url, idx) => (
                <div key={idx} className="relative">
                  <img
                    src={url}
                    alt={`preview-${idx}`}
                    className="w-32 h-32 object-cover rounded shadow-md mx-auto"
                    loading="lazy"
                  />
                  <button
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-0 right-0 bg-red-500 text-white rounded-full px-2 py-1 text-sm hover:bg-red-700"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {bulkImages.length > 0 && (
              <>
                <button
                  onClick={handleClearAll}
                  className="mt-4 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                >
                  🗑 ลบรูปทั้งหมด
                </button>

                <button
                  onClick={async () => {
                    if (!partyId || !bulkImages?.length) return;

                    const removePrefix = (name: string) => {
                      return name.replace(/^(นาย|นางสาว|นาง|ดร\.?|ศ\.?ดร\.?|พล\.ท\.?)\s*/g, "").trim();
                    };

                    const snapshot = await getDocs(collection(firestore, "Party", partyId, "Member"));
                    const membersData = snapshot.docs.map(doc => ({
                      id: String(doc.data().id),
                      firstName: removePrefix(doc.data().FirstName ?? "").replace(/\s+/g, "_"),
                      lastName: (doc.data().LastName ?? "").replace(/\s+/g, "_"),
                      raw: doc.data(),
                    }));

                    const updated: Member[] = [];
                    const uploadPromises = [];

                    for (const file of bulkImages) {
                      const rawName = file.name.replace(/\.[^.]+$/, "");
                      const matched = membersData.find(
                        m => `${m.firstName}_${m.lastName}` === rawName
                      );

                      if (!matched) {
                        console.warn(`ไม่พบสมาชิกที่ตรงกับชื่อไฟล์: ${rawName}`);
                        continue;
                      }

                      const fileExt = file.name.split(".").pop()?.toLowerCase() === "png" ? "png" : "jpg";
                      const storagePath = `party/member/${partyId}/${matched.id}.${fileExt}`;
                      const imageRef = ref(storage, storagePath);

                      uploadPromises.push(
                        (async () => {
                          try {
                            const resizedBlob = await resizeImage(file);
                            await uploadBytes(imageRef, resizedBlob);

                            const imageUrl = `https://firebasestorage.googleapis.com/v0/b/policy-tracker-kp.firebasestorage.app/o/${encodeURIComponent(storagePath)}?alt=media`;

                            updated.push({
                              id: matched.id,
                              name: matched.raw.FirstName,
                              surname: matched.raw.LastName,
                              role: matched.raw.Role,
                              image: imageUrl,
                            });

                          } catch (err) {
                            console.error(`อัปโหลด ${rawName} ล้มเหลว`, err);
                          }
                        })()
                      );
                    }

                    await Promise.all(uploadPromises);

                    setMembers(prev =>
                      prev.map(m =>
                        updated.find(u => u.id === m.id) || m
                      )
                    );
                    setMembers(prev =>
                      prev.map(m => updated.find(u => u.id === m.id) || m)
                    );

                    setBulkImages([]);
                    setPreviewUrls([]);
                    if (inputRef.current) inputRef.current.value = "";

                    alert("อัปโหลดรูปทั้งหมดสำเร็จ");
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 mt-4"
                >
                  📁 อัปโหลดรูปสมาชิก
                </button>
              </>
            )}
          </div>

          <h2 className="text-3xl text-white text-center mt-6">สมาชิกพรรค</h2>
          {members.length === 0 ? (
            <p className="text-white text-center mt-4 text-xl">ไม่มีสมาชิกพรรค</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-4">
              {visibleMembers.map((member) => (
                <div key={member.id} className="relative bg-white p-4 rounded-lg shadow-lg text-center">
                  <div className="absolute top-2 left-2 text-gray-700 px-2 py-1 text-md ">
                    ID: {member.id}
                  </div>

                  <LazyImage
                    key={`${member.id}-${member.image}`}
                    src={member.image}
                    alt={`${member.name} ${member.surname}`}
                    className="w-24 h-24 mx-auto rounded-full shadow-md object-cover"
                  />

                  <p className="mt-2 font-semibold">
                    {member.name} {member.surname}
                  </p>
                  <p className="text-gray-600">{member.role}</p>
                  <div className=" mt-4">
                    <button
                      onClick={() => editMember(member.id)}
                      className="m-2 bg-yellow-500 text-white px-3 py-1 rounded-md hover:bg-yellow-600"
                    >
                      ✏ แก้ไข
                    </button>
                    <button onClick={() => deleteMember(member.id)} className="m-2 bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-700">
                      ❌ ลบ
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div ref={observerRef} className="h-10 mt-10" />
        </main>
      </div>
    </div>
  );
}