import { useNavigate, Link } from "react-router-dom";
import { ScreenHeader } from "../components/ScreenHeader";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { Phone, Lock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { loginPassenger } from "../services/api";

export function PassengerLogin() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!phone || phone.length < 10 || !password) return;
    setIsLoading(true);
    try {
      const data = await loginPassenger(phone, password);
      toast.success("Logged in successfully!");
      if (data.token) localStorage.setItem("token", data.token);
      navigate("/"); // In a real app, go to the dashboard map
    } catch (error) {
      toast.error(error.message || "Failed to log in");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 min-h-screen bg-white max-w-md mx-auto flex flex-col">
      <ScreenHeader title="Welcome back" subtitle="Log in to your OBer account" />
      
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

        <div className="space-y-2">
          <Input 
            label="Password" 
            placeholder="••••••••" 
            icon={Lock}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-sm font-semibold text-[#3198F5] hover:underline">
              Forgot password?
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-4 pb-8">
        <Button 
          onClick={handleLogin} 
          disabled={!phone || phone.length < 10 || !password || isLoading}
          className={(!phone || phone.length < 10 || !password || isLoading) ? "opacity-50 cursor-not-allowed" : ""}
        >
          {isLoading ? "Logging in..." : "Log in"}
        </Button>
        <p className="text-center text-[14px] text-gray-500">
          Don't have an account?{" "}
          <Link to="/passenger/signup" className="text-[#3198F5] font-semibold hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
