"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface BudgetSummary {
  policy_name: string;
  total_budget: number;
  total_expense: number;
  remaining: number;
}

export default function DashboardPage() {
  const params = useParams();
  const rawPolicy = params?.policyName;
  const policyName = decodeURIComponent(Array.isArray(rawPolicy) ? rawPolicy[0] : rawPolicy || "");

  const [data, setData] = useState<BudgetSummary | null>(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (policyName) {
      fetchBudget();
      fetchProgress();
    }
  }, [policyName]);

  const fetchBudget = async () => {
    try {
      const res = await fetch(`/api/budget-summary?policy=${encodeURIComponent(policyName)}`);
      const result = await res.json();
      if (res.ok) {
        setData(result);
        setError("");
      } else {
        setData(null);
        setError(result.error || "ไม่สามารถโหลดข้อมูลได้");
      }
    } catch (err) {
      console.error(err);
      setError("เกิดข้อผิดพลาดในการโหลดข้อมูล");
      setData(null);
    }
  };

  const fetchProgress = async () => {
    try {
      const res = await fetch(`/api/policyProgress?policy=${encodeURIComponent(policyName)}`);
      const result = await res.json();
      setProgress(result.progress ?? 0);
    } catch (err) {
      console.error("โหลดความคืบหน้าไม่สำเร็จ", err);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow mt-10">
      <h1 className="text-2xl font-bold text-[#5D5A88] mb-6 text-center">
        สรุปการเงินและความคืบหน้าของนโยบาย: {policyName || "-"}
      </h1>

      {error ? (
        <p className="text-red-500 text-center">{error}</p>
      ) : data ? (
        <div className="space-y-4 text-lg">
          <p><strong>งบประมาณทั้งหมด:</strong> {data.total_budget?.toLocaleString() ?? "-"} บาท</p>
          <p><strong>ใช้ไปแล้ว:</strong> {data.total_expense?.toLocaleString() ?? "-"} บาท</p>
          <p><strong>คงเหลือ:</strong> {data.remaining?.toLocaleString() ?? "-"} บาท</p>
          <p><strong>ความคืบหน้ารวม:</strong> {progress.toFixed(0)}%</p>

          <div className="w-full bg-gray-200 rounded-full h-5 mt-2">
            <div
              className="bg-[#5D5A88] h-5 rounded-full"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      ) : (
        <p className="text-center text-gray-500">กำลังโหลดข้อมูล...</p>
      )}
    </div>
  );
}
