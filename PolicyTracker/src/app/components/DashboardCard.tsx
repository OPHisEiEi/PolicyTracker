"use client";

interface Props {
  title: string;
  main?: string | number;
  sub?: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;

}

export default function DashboardCard({ title, main, sub, children, className = "", style }: Props) {
  return (
    <div
      className={`w-full p-6 rounded-xl bg-white shadow-md text-center h-full flex flex-col justify-between ${className}`}
      style={style}
    >
      <h3 className="text-4xl md:text-3xl font-semibold text-[#0B1D3A] mb-3">
        {title}
      </h3>
      {children ? (
        <div className="flex-grow text-left  text-[#475066]  ">{children}</div>
      ) : (
        <div className="flex-grow flex flex-col justify-center text-[#475066] ">
          <p className="text-3xl font-bold mb-1 text-[#475066] ">{main}</p>
          {sub && <p className="text-sm text-[#475066] ">{sub}</p>}
        </div>
      )}
    </div>
  );
}