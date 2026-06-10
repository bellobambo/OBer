import { useNavigate } from "react-router-dom";
import { ScreenHeader } from "../components/ScreenHeader";
import { Input } from "../components/Input";
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
        <Input 
          label="Password"
          type="password"
          maxLength={8}
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="••••••••"
          inputClassName="text-center tracking-[0.3em] text-xl"
        />
        
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
