import { useNavigate } from "react-router-dom";
import { Button } from "../components/Button";
import { User, Car } from "lucide-react";

export function Welcome() {
  const navigate = useNavigate();

  return (
    <div className="bg-[#3198F5] min-h-screen flex flex-col relative overflow-hidden">
      {/* Top Section */}
      <div className="pt-16 px-6 z-10">
        <div className="flex items-center space-x-2 mb-4">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center p-[2px]">
            <div className="w-full h-full border-[3px] border-[#3198F5] rounded-full flex items-center justify-center">
              <div className="w-[6px] h-[6px] bg-[#3198F5] rounded-full"></div>
            </div>
          </div>
          <span className="text-3xl font-bold tracking-tight text-white">Ber</span>
        </div>
        <p className="text-white/90 text-[15px] max-w-[240px] leading-relaxed">
          Find a ride before the ride finds you — live tricycles & shuttles across OAU.
        </p>
      </div>

      {/* Map Background Wrapper */}
      <div className="flex-1 mt-6 relative bg-[#EAF4FF] rounded-t-[32px] overflow-hidden flex flex-col">
        {/* Static Map Image Background */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/map_bg.png" 
            alt="Map" 
            className="w-full h-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent opacity-80" />
        </div>

        {/* Bottom Sheet */}
        <div className="mt-auto bg-white p-6 pt-10 z-20 rounded-t-[32px] shadow-[0_-8px_30px_rgba(0,0,0,0.04)]">
          <div className="space-y-4 pb-4">
            <Button onClick={() => navigate("/passenger/login")} className="flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>I'm a passenger</span>
            </Button>
            <Button variant="secondary" onClick={() => navigate("/driver/signin")} className="flex items-center space-x-2 text-gray-700 bg-gray-100 hover:bg-gray-200">
              <Car className="w-5 h-5" />
              <span>I'm a driver</span>
            </Button>
            
            <p className="text-center text-xs text-gray-400 mt-4">
              Zero commitment · No booking ever
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
