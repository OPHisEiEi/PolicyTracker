"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, firestore } from "@/app/lib/firebase";
import Navbar from "@/app/components/Navbar";


export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDoc = await getDoc(doc(firestore, "users", user.uid));
      if (!userDoc.exists()) {
        setErrorMsg("ไม่พบข้อมูลผู้ใช้ในระบบ");
        return;
      }

      const { role, partyName, partyId } = userDoc.data();

      localStorage.setItem("role", role);
      if (role === "pr") {
        localStorage.setItem("partyName", partyName);
        localStorage.setItem("partyId", String(partyId));
        router.push("/pr");

      } else if (role === "admin") {
        router.push("/admin");

      } else {
        setErrorMsg("คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
      }
    } catch (error: any) {
      console.warn("Login failed:", error.code);
      setErrorMsg("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");

    }
  };

  return (
    <div
      className="min-h-screen flex flex-col bg-cover bg-center"
      style={{ backgroundImage: "url('/bg/หัวข้อ.png')" }}
    >
      <Navbar />
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="flex w-full max-w-4xl bg-white rounded-lg shadow-lg overflow-hidden">
          <div
            className="hidden sm:block w-1/2 bg-cover bg-center"
            style={{ backgroundImage: "url('/bg/ธงชาติ.jpg')" }}
          />

          <div className="w-full sm:w-1/2 p-8">
            <h1 className="text-2xl font-bold mb-6 text-[#5D5A88] text-center">
              เข้าสู่ระบบ
            </h1>
            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="email"
                placeholder="อีเมล"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 border rounded"
                required
              />
              <input
                type="password"
                placeholder="รหัสผ่าน"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleLogin(e);
                  }
                }}
                className="w-full p-2 border rounded"
                required
              />
              {errorMsg && <p className="text-red-500">{errorMsg}</p>}
              <button
                type="submit"
                className="w-full bg-[#5D5A88] text-white p-2 rounded hover:bg-[#46426b] transition"
              >
                เข้าสู่ระบบ
              </button>
            </form>
            <div className="pt-4 text-center">
              <a href="/" className="text-sm text-gray-600 hover:underline">
                กลับไปหน้าหลัก
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}