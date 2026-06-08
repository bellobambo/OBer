import { useNavigate, useLocation } from "react-router-dom";
import { ScreenHeader } from "../components/ScreenHeader";
import { PinInput } from "../components/PinInput";
import { Button } from "../components/Button";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { verifyPhone } from "../services/api";

export function OTPVerify() {
  const navigate = useNavigate();
  const location = useLocation();
  const phone = location.state?.phone || "";
  const autoFillOtp = location.state?.autoFillOtp || "";
  
  const [pin, setPin] = useState(autoFillOtp);
  const [timeLeft, setTimeLeft] = useState(24);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timerId = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timerId);
  }, [timeLeft]);

  const handleVerify = async () => {
    if (pin.length < 6 || !phone) return;
    setIsLoading(true);
    try {
      const data = await verifyPhone(phone, pin);
      toast.success("Phone verified successfully!");
      if (data.token) localStorage.setItem("token", data.token);
      navigate("/location-permission");
    } catch (error) {
      toast.error(error.message || "Invalid verification code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = () => {
    if (timeLeft === 0) {
      // Logic for resending OTP would go here
      toast.success("A new code has been sent!");
      setTimeLeft(30);
    }
  };

  const formattedTime = `0:${timeLeft.toString().padStart(2, '0')}`;

  return (
    <div className="p-6 min-h-screen bg-white flex flex-col max-w-md mx-auto">
      <ScreenHeader 
        title="Verify your number" 
        subtitle={`Code sent to ${phone}`} 
      />
      
      <div className="mt-8 flex-1">
        <PinInput length={6} value={pin} onChange={setPin} />
        
        <div className="text-center mt-8">
          {timeLeft > 0 ? (
            <p className="text-sm text-gray-500">
              Resend code in <span className="font-semibold text-gray-900">{formattedTime}</span>
            </p>
          ) : (
            <button 
              onClick={handleResend}
              className="text-sm font-semibold text-[#3198F5] hover:underline"
            >
              Resend code
            </button>
          )}
        </div>
      </div>

      <div className="mt-auto space-y-4 pb-8 pt-8">
        <Button 
          onClick={handleVerify}
          disabled={pin.length < 6 || isLoading}
          className={(pin.length < 6 || isLoading) ? "opacity-50 cursor-not-allowed" : ""}
        >
          {isLoading ? "Verifying..." : "Verify & continue"}
        </Button>
        <Button variant="secondary" onClick={() => navigate(-1)} className="bg-[#EAF4FF] text-[#3198F5]">
          Change number
        </Button>
      </div>
    </div>
  );
}
