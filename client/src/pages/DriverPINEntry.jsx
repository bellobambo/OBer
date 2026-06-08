import { useNavigate } from "react-router-dom";
import { ScreenHeader } from "../components/ScreenHeader";
import { PinInput } from "../components/PinInput";
import { Button } from "../components/Button";
import { InfoAlert } from "../components/InfoAlert";
import { ShieldCheck, Power } from "lucide-react";
import { useState } from "react";

export function DriverPINEntry() {
  const navigate = useNavigate();
  const [pin, setPin] = useState("");

  return (
    <div className="p-6 min-h-screen bg-white flex flex-col max-w-md mx-auto">
      <ScreenHeader 
        title="Enter your PIN" 
        subtitle="Driver #K-2207 - Adewale K." 
      />
      
      <div className="mt-8 flex-1 space-y-8">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-900">Password</label>
          <input 
            type="password"
            maxLength={8}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-white border border-gray-200 rounded-[12px] px-4 py-4 text-center tracking-[0.3em] text-xl outline-none focus:border-[#3198F5] focus:ring-1 focus:ring-[#3198F5]"
          />
        </div>
        
        <InfoAlert icon={ShieldCheck}>
          Going on duty makes you visible on every passenger map across OAU.
        </InfoAlert>
      </div>

      <div className="mt-auto pb-8 pt-8">
        <Button onClick={() => navigate("/")} className="flex justify-center items-center space-x-2">
          <Power className="w-5 h-5" />
          <span>Log in & go on duty</span>
        </Button>
      </div>
    </div>
  );
}
