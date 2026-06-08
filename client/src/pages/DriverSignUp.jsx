import { useNavigate, Link } from "react-router-dom";
import { ScreenHeader } from "../components/ScreenHeader";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { InfoAlert } from "../components/InfoAlert";
import { Phone, Mail, CarFront, Lock, Info } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { registerDriver } from "../services/api";

export function DriverSignUp() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [driverCode, setDriverCode] = useState("");
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (!phone || phone.length < 10 || !driverCode || pin.length < 8) return;
    setIsLoading(true);
    try {
      const response = await registerDriver({ phone, email, password: pin, driverCode });
      
      const otp = response.data?.verificationCode || response.verificationCode || "";
      
      toast.success("Driver account created! Please verify your phone.");
      navigate("/verify-phone", { state: { phone, autoFillOtp: otp } });
    } catch (error) {
      toast.error(error.message || "Failed to register driver");
    } finally {
      setIsLoading(false);
    }
  };

  const isValid = phone.length >= 10 && driverCode.length > 0 && pin.length >= 8;

  return (
    <div className="p-6 min-h-screen bg-white max-w-md mx-auto flex flex-col">
      <ScreenHeader title="Driver Onboarding" subtitle="Register your driver account" />
      
      <div className="space-y-6 flex-1 mt-4">
        <InfoAlert icon={Info}>
          Temporary self-onboarding. You still need a valid driver code issued by the transport office.
        </InfoAlert>

        <Input 
          label="Phone number" 
          placeholder="0811 822 8328" 
          icon={Phone}
          type="tel"
          maxLength={11}
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
        />

        <Input 
          label="Email (Optional)" 
          placeholder="driver@example.com" 
          icon={Mail}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Input 
          label="Driver code" 
          placeholder="K-2207" 
          icon={CarFront}
          value={driverCode}
          onChange={(e) => setDriverCode(e.target.value)}
        />

        <Input 
          label="Create Password" 
          placeholder="••••••••" 
          type="password"
          icon={Lock}
          inputClassName="tracking-[0.2em]"
          maxLength={8}
          value={pin}
          onChange={(e) => setPin(e.target.value)}
        />
      </div>

      <div className="mt-8 space-y-4 pb-8">
        <Button 
          onClick={handleRegister} 
          disabled={!isValid || isLoading}
          className={(!isValid || isLoading) ? "opacity-50 cursor-not-allowed" : ""}
        >
          {isLoading ? "Registering..." : "Complete Onboarding"}
        </Button>
        <p className="text-center text-[14px] text-gray-500">
          Already onboarded?{" "}
          <Link to="/driver/signin" className="text-[#3198F5] font-semibold hover:underline">
            Log in here
          </Link>
        </p>
      </div>
    </div>
  );
}
