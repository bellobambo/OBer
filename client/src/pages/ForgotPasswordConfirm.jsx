import { useNavigate, useLocation } from "react-router-dom";
import { ScreenHeader } from "../components/ScreenHeader";
import { Input } from "../components/Input";
import { PinInput } from "../components/PinInput";
import { Button } from "../components/Button";
import { Lock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { confirmPasswordReset } from "../services/api";

export function ForgotPasswordConfirm() {
  const navigate = useNavigate();
  const location = useLocation();
  const phone = location.state?.phone || "";
  const autoFillCode = location.state?.autoFillCode || "";
  
  const [code, setCode] = useState(autoFillCode);
  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleReset = async () => {
    if (code.length < 6 || newPassword.length < 8) return;
    if (!phone) {
      toast.error("Phone number missing, please request again");
      return;
    }
    
    setIsLoading(true);
    try {
      await confirmPasswordReset(phone, code, newPassword);
      toast.success("Password reset successful. You can now log in.");
      navigate("/passenger/login");
    } catch (error) {
      toast.error(error.message || "Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 min-h-screen bg-white max-w-md mx-auto flex flex-col">
      <ScreenHeader title="Enter Reset Code" subtitle={`Code sent to ${phone || "your number"}`} />
      
      <div className="space-y-8 flex-1 mt-4">
        <div>
          <label className="text-sm font-semibold text-gray-900 mb-4 block">Reset Code</label>
          <PinInput length={6} value={code} onChange={setCode} />
        </div>

        <Input 
          label="New Password" 
          placeholder="••••••••" 
          icon={Lock}
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </div>

      <div className="mt-8 pb-8">
        <Button 
          onClick={handleReset} 
          disabled={code.length < 6 || newPassword.length < 8 || isLoading}
          className={(code.length < 6 || newPassword.length < 8 || isLoading) ? "opacity-50 cursor-not-allowed" : ""}
        >
          {isLoading ? "Resetting..." : "Confirm Password Reset"}
        </Button>
      </div>
    </div>
  );
}
