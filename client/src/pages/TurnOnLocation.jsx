import { useNavigate } from "react-router-dom";
import { Button } from "../components/Button";
import { MapPin } from "lucide-react";

export function TurnOnLocation() {
  const navigate = useNavigate();

  return (
    <div className="p-6 min-h-screen bg-white flex flex-col items-center text-center max-w-md mx-auto">
      <div className="flex-1 flex flex-col items-center justify-center max-w-[300px]">
        <div className="w-[120px] h-[120px] bg-[#EAF4FF] rounded-[40px] flex items-center justify-center mb-8">
          <MapPin className="w-12 h-12 text-[#3198F5]" strokeWidth={2} />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Turn on location</h1>
        <p className="text-[15px] text-gray-500 leading-[1.6]">
          OBer uses your location to show nearby tricycles and shuttles, and to drop your 5-minute pickup pin. We never track you when you're not looking for a ride.
        </p>
      </div>

      <div className="w-full space-y-4 pb-8">
        <Button onClick={() => navigate("/")}>
          Allow while using OBer
        </Button>
        <Button variant="secondary" onClick={() => navigate("/")} className="bg-[#F3F4F6] text-gray-700 hover:bg-gray-200">
          Not now
        </Button>
      </div>
    </div>
  );
}
