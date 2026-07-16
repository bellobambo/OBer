import { useNavigate } from "react-router-dom";
import { ScreenHeader } from "../components/ScreenHeader";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { InfoAlert } from "../components/InfoAlert";
import { ShieldCheck, CarFront, Phone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { loginDriver } from "../services/api";

export function DriverSignIn() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [driverCode, setDriverCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!phone || phone.length < 10 || !driverCode) return;
    setIsLoading(true);
    try {
      const data = await loginDriver(phone, driverCode);
      toast.success(data.message);
      const token = data.data?.token || data.token;
      if (token) localStorage.setItem("token", token);
      
      const user = data.data?.user || data.user || {};
      
      if (user.onboardingStatus === "SUSPENDED" || user.onboarding_status === "SUSPENDED") {
        toast.error("Your account has been suspended. Please contact admin.");
        return;
      }
      
      navigate("/driver/map");
    } catch (error) {
      toast.error(error.message || "Failed to sign in as driver");
    } finally {
      setIsLoading(false);
    }
  };

  const isValid = phone.length >= 10 && driverCode.trim().length > 0;

  return (
    <div className="p-6 min-h-screen bg-white max-w-md mx-auto">
      <ScreenHeader 
        title="Driver sign-in" 
        subtitle="Onboarded by the OAU transport unit" 
      />
      
      <div className="space-y-6">
        <InfoAlert icon={ShieldCheck}>
          Use the phone number linked to your driver account and the code issued during onboarding.
        </InfoAlert>

        <Input 
          label="Phone number"
          placeholder="08012345678"
          icon={Phone}
          type="tel"
          maxLength={11}
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
        />

        <Input 
          label="Driver code"
          placeholder="OAU-2207"
          icon={CarFront}
          value={driverCode}
          onChange={(e) => setDriverCode(e.target.value.toUpperCase())}
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
      </div>
    </div>
  );
}
