import { useNavigate, Link } from "react-router-dom";
import { ScreenHeader } from "../components/ScreenHeader";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { InfoAlert } from "../components/InfoAlert";
import { ShieldCheck, CarFront, Lock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { loginDriver } from "../services/api";

export function DriverSignIn() {
  const navigate = useNavigate();
  const [driverCode, setDriverCode] = useState("");
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!driverCode || pin.length < 8) return;
    setIsLoading(true);
    try {
      const data = await loginDriver(driverCode, pin);
      toast.success("Driver signed in successfully");
      if (data.token) localStorage.setItem("token", data.token);
      navigate("/driver/pin");
    } catch (error) {
      toast.error(error.message || "Failed to sign in as driver");
    } finally {
      setIsLoading(false);
    }
  };

  const isValid = driverCode.length > 0 && pin.length >= 8;

  return (
    <div className="p-6 min-h-screen bg-white max-w-md mx-auto">
      <ScreenHeader 
        title="Driver sign-in" 
        subtitle="Onboarded by the OAU transport unit" 
      />
      
      <div className="space-y-6">
        <InfoAlert icon={ShieldCheck}>
          Your OBer code was issued with your campus driving licence. No public sign-up.
        </InfoAlert>

        <Input 
          label="Driver code" 
          placeholder="K-2207" 
          icon={CarFront}
          value={driverCode}
          onChange={(e) => setDriverCode(e.target.value)}
        />

        <Input 
          label="Password" 
          placeholder="••••••••" 
          type="password"
          icon={Lock}
          inputClassName="tracking-[0.2em]"
          maxLength={8}
          value={pin}
          onChange={(e) => setPin(e.target.value)}
        />
      </div>

      <div className="mt-10 space-y-4">
        <Button 
          onClick={handleLogin}
          disabled={!isValid || isLoading}
          className={(!isValid || isLoading) ? "opacity-50 cursor-not-allowed" : ""}
        >
          {isLoading ? "Logging in..." : "Log in"}
        </Button>
        <p className="text-center text-[14px] text-gray-500">
          New driver?{" "}
          <Link to="/driver/signup" className="text-[#3198F5] font-semibold hover:underline">
            Complete onboarding here
          </Link>
        </p>
      </div>
    </div>
  );
}
