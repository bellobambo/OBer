import { useNavigate, Link } from "react-router-dom";
import { ScreenHeader } from "../components/ScreenHeader";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { InfoAlert } from "../components/InfoAlert";
import { Phone, Mail, ShieldCheck, Lock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { registerPassenger } from "../services/api";

export function PassengerSignUp() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSendCode = async () => {
    if (!phone || phone.length < 10 || !password) return;
    setIsLoading(true);
    try {
      const response = await registerPassenger({ phone, email, password });
      
      // The backend returns the OTP directly in development
      const otp = response.data?.verificationCode || response.verificationCode || "";
      
      toast.success("Account created! Verification code sent.");
      navigate("/verify-phone", { state: { phone, autoFillOtp: otp } });
    } catch (error) {
      toast.error(error.message || "Failed to register");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 min-h-screen bg-white max-w-md mx-auto flex flex-col">
      <ScreenHeader title="Sign up" subtitle="Create your OBer account" />
      
      <div className="space-y-6 flex-1">
        <Input 
          label="Phone number" 
          placeholder="0811 822 8328" 
          icon={Phone}
          type="tel"
          maxLength={11}
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
        />

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-semibold text-gray-900">OAU email <span className="text-[#3198F5] font-normal">- unlocks perks</span></label>
          </div>
          <Input 
            placeholder="a.bello@student.oauife.edu.ng" 
            icon={Mail}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <Input 
          label="Password" 
          placeholder="••••••••" 
          icon={Lock}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <InfoAlert icon={ShieldCheck}>
          Verified OAU students & staff unlock discounts, monthly coupons & priority hotspots in peak hours.
        </InfoAlert>
      </div>

      <div className="mt-8 space-y-4 pb-8">
        <Button 
          onClick={handleSendCode} 
          disabled={!phone || phone.length < 10 || !password || isLoading}
          className={(!phone || phone.length < 10 || !password || isLoading) ? "opacity-50 cursor-not-allowed" : ""}
        >
          {isLoading ? "Signing up..." : "Sign up"}
        </Button>
        <p className="text-center text-[14px] text-gray-500">
          Already have an account?{" "}
          <Link to="/passenger/login" className="text-[#3198F5] font-semibold hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
