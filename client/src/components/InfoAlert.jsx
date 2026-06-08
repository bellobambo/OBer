import { Info } from "lucide-react";

export function InfoAlert({ icon: Icon = Info, children, className }) {
  return (
    <div className={`flex items-start space-x-3 bg-[#F0F7FF] rounded-[16px] p-4 ${className}`}>
      <div className="mt-0.5">
        <Icon className="w-5 h-5 text-[#3198F5]" strokeWidth={2.5} />
      </div>
      <div className="text-sm text-[#3198F5] leading-relaxed font-medium flex-1">
        {children}
      </div>
    </div>
  );
}
