import Link from "next/link";

"use client";
import React from "react";

interface StepProps {
  step: number;
  label: string;
  bgColor?: string;
}

const Step: React.FC<StepProps> = ({ step, label, bgColor }) => {
  return (
    <div
      className="flex items-center h-[50px] max-w-[160px] rounded-full px-2"
      style={{ backgroundColor: bgColor || "#F8B664" }}
    >
      <h3 className="bg-white text-center h-[40px] w-[40px] rounded-full m-0 flex items-center justify-center">
        {step}
      </h3>
      <p className="text-white m-0 text-[18px] mx-2">{label}</p>
    </div>
  );
};

export default Step;
