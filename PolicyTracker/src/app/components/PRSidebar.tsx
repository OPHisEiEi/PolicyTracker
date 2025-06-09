"use client";
import Link from "next/link";

interface SidebarProps {
  isMobile?: boolean;
  onClose?: () => void;
}

const PRSidebar = ({ isMobile = false, onClose }: SidebarProps) => {
  const links = [
    { href: "/pr", label: "หน้าแรก" },
    { href: "/prPolicy", label: "นโยบาย" },
    { href: "/prCampaign", label: "โครงการ" },
    { href: "/prEvent", label: "กิจกรรม" },
    { href: "/prPartyInfo", label: "ข้อมูลพรรค" },
    { href: "/login", label: "ออกจากระบบ" },
  ];

  return (
    <aside className={`${isMobile ? "md:hidden bg-gray-100 p-4 absolute top-16 left-0 w-full shadow-md" : "w-64 bg-gray-200 p-6 fixed h-full hidden md:block"}`}>
      <ul className="space-y-4">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="block text-[#5D5A88] bg-[#E3E1F1] p-3 rounded-md hover:bg-[#D0CEF0]"
              onClick={onClose} 
            >
              {link.label}
            </Link>
          </li>
        ))}
        {isMobile && (
          <li>
            <Link
              href="/login"
              className="block text-[#5D5A88] px-4 py-2 hover:bg-gray-200"
              onClick={onClose}
            >
              ออกจากระบบ
            </Link>
          </li>
        )}
      </ul>
    </aside>
  );
};

export default PRSidebar;
