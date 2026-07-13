import { useNavigate } from "react-router-dom";
import { MapPin, History, Wallet, User } from "lucide-react";

export function BottomNav({ activePage }) {
  const navigate = useNavigate();

  const handleNav = (path) => {
    navigate(path);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 w-full z-[100] flex justify-around items-center px-4 h-[84px] bg-white/90 rounded-t-2xl backdrop-blur-xl border-t border-[#c1c7d2]/30 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <button
        onClick={() => handleNav("/passenger/map")}
        className={`flex flex-col items-center gap-1 transition-colors ${
          activePage === "map" ? "text-[#3198F5]" : "text-[#56656e] hover:text-[#191c1e]"
        }`}
      >
        <div className={activePage === "map" ? "bg-[#3198F5]/10 px-6 py-1.5 rounded-2xl" : ""}>
          <MapPin className={activePage === "map" ? "w-5 h-5" : "w-6 h-6"} strokeWidth={activePage === "map" ? 2.5 : 2} />
        </div>
        <span className={`text-[10px] tracking-wide ${activePage === "map" ? "font-bold" : "mt-0.5"}`}>Map</span>
      </button>

      <button
        onClick={() => handleNav("/passenger/activity")}
        className={`flex flex-col items-center gap-1 transition-colors ${
          activePage === "activity" ? "text-[#3198F5]" : "text-[#56656e] hover:text-[#191c1e]"
        }`}
      >
        <div className={activePage === "activity" ? "bg-[#3198F5]/10 px-6 py-1.5 rounded-2xl" : ""}>
          <History className={activePage === "activity" ? "w-5 h-5" : "w-6 h-6"} strokeWidth={activePage === "activity" ? 2.5 : 2} />
        </div>
        <span className={`text-[10px] tracking-wide ${activePage === "activity" ? "font-bold" : "mt-0.5"}`}>Activity</span>
      </button>

      <button
        onClick={() => handleNav("/passenger/wallet")}
        className={`flex flex-col items-center gap-1 transition-colors ${
          activePage === "wallet" ? "text-[#3198F5]" : "text-[#56656e] hover:text-[#191c1e]"
        }`}
      >
        <div className={activePage === "wallet" ? "bg-[#3198F5]/10 px-6 py-1.5 rounded-2xl" : ""}>
          <Wallet className={activePage === "wallet" ? "w-5 h-5" : "w-6 h-6"} strokeWidth={activePage === "wallet" ? 2.5 : 2} />
        </div>
        <span className={`text-[10px] tracking-wide ${activePage === "wallet" ? "font-bold" : "mt-0.5"}`}>Wallet</span>
      </button>

      <button
        onClick={() => handleNav("/passenger/profile")}
        className={`flex flex-col items-center gap-1 transition-colors ${
          activePage === "profile" ? "text-[#3198F5]" : "text-[#56656e] hover:text-[#191c1e]"
        }`}
      >
        <div className={activePage === "profile" ? "bg-[#3198F5]/10 px-6 py-1.5 rounded-2xl" : ""}>
          <User className={activePage === "profile" ? "w-5 h-5" : "w-6 h-6"} strokeWidth={activePage === "profile" ? 2.5 : 2} />
        </div>
        <span className={`text-[10px] tracking-wide ${activePage === "profile" ? "font-bold" : "mt-0.5"}`}>Profile</span>
      </button>
    </nav>
  );
}
