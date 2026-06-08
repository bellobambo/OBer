import { useNavigate } from "react-router-dom";
import { ScreenHeader } from "../components/ScreenHeader";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { Phone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { requestPasswordReset } from "../services/api";

export function ForgotPasswordRequest() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRequest = async () => {
    if (!phone || phone.length < 10) return;
    setIsLoading(true);
    try {
      const response = await requestPasswordReset(phone);
      
      const resetCode = response.data?.resetCode || response.resetCode || "";
      
      toast.success("Reset code sent to your phone");
      navigate("/reset-password", { state: { phone, autoFillCode: resetCode } });
    } catch (error) {
      toast.error(error.message || "Failed to request password reset");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 min-h-screen bg-white max-w-md mx-auto flex flex-col">
      <ScreenHeader title="Reset Password" subtitle="Enter your phone number to receive a reset code" />
      
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
      </div>

      <div className="mt-8 pb-8">
        <Button 
          onClick={handleRequest} 
          disabled={!phone || phone.length < 10 || isLoading}
          className={(!phone || phone.length < 10 || isLoading) ? "opacity-50 cursor-not-allowed" : ""}
        >
          {isLoading ? "Sending..." : "Send Reset Code"}
        </Button>
      </div>
    </div>
  );
}
