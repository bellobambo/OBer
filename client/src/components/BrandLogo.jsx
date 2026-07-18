export function BrandLogo({ className = "", textClassName = "" }) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`} aria-label="OBer">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white p-[2px] shadow-sm">
        <div className="flex h-full w-full items-center justify-center rounded-full border-[2.5px] border-[#3198F5]">
          <div className="h-1 w-1 rounded-full bg-[#3198F5]" />
        </div>
      </div>
      <span className={`text-2xl font-bold tracking-tight text-[#3198F5] ${textClassName}`}>Ber</span>
    </div>
  );
}
