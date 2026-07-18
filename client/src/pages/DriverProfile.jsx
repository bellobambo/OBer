import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { Spinner } from "../components/Spinner";
import { toast } from "sonner";
import { fetchUserProfile, updateUserProfile } from "../services/api";
import { updateDriverVisibility } from "../services/api";
import {
  ChevronLeft,
  Settings,
  LogOut,
  Mail,
  Phone,
  User,
  PenLine,
  X,
  Car,
  Hash,
  Activity,
} from "lucide-react";
import { DriverBottomNav } from "../components/DriverBottomNav";

export function DriverProfile() {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [refresh, setRefresh] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
  });

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const data = await fetchUserProfile();
      setProfile(data);
      setFormData({
        fullName: data.fullName || data.full_name || "",
        email: data.email || "",
      });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [refresh]);

  const initials = (name) => {
    if (!name) return "";
    const names = name.split(" ");
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const formatPhone = (phoneStr) => {
    if (!phoneStr) return "";
    let cleanPhone = phoneStr.startsWith("+234") ? "0" + phoneStr.slice(4) : phoneStr;
    if (cleanPhone.length === 11) {
      return `${cleanPhone.slice(0, 4)} ${cleanPhone.slice(4, 7)} ${cleanPhone.slice(7)}`;
    }
    return cleanPhone;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      const response = await updateUserProfile(formData);
      toast.success(response.message);
      setIsEditing(false);
      setRefresh((prev) => !prev);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      // Best effort to go offline before logging out
      await updateDriverVisibility(false).catch(() => {});
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("driver_isOnline");
      navigate("/driver/signin");
    }
  };

  if (isLoading && !profile) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-gray-50">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gray-50 pb-8 font-sans">
      {/* Header */}
      <div className="bg-[#3198F5] pt-12 pb-24 px-6 rounded-b-[40px] shadow-sm relative">
        <div className="flex items-center justify-between text-white relative z-10">
          <button 
            onClick={() => navigate("/driver/map")}
            className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold">Driver Profile</h1>
          <button className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-6 -mt-16 relative z-20">
        {/* Profile Card */}
        <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.08)] mb-6 flex flex-col items-center">
          <div className="relative mb-4">
            <div className="w-24 h-24 bg-gradient-to-br from-[#3198F5] to-blue-600 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-lg border-4 border-white">
              {initials(profile?.fullName || profile?.full_name)}
            </div>
            {profile?.accountStatus === "ACTIVE" && (
              <div className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full"></div>
            )}
          </div>
          
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">
            {profile?.fullName || profile?.full_name || "Driver"}
          </h2>
          <p className="text-sm font-medium text-gray-500 mt-1">
            {profile?.driverCode || "Pending Code"}
          </p>

          <div className="flex items-center gap-2 mt-4 px-4 py-1.5 bg-[#3198F5]/10 rounded-full">
            <Activity className="w-4 h-4 text-[#3198F5]" />
            <span className="text-sm font-bold text-[#3198F5]">
              {profile?.accountStatus || "ACTIVE"}
            </span>
          </div>
        </div>

        {/* Vehicle Details Section */}
        <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Vehicle Info</h3>
          </div>
          
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-[#3198F5]">
                <Car className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-gray-500 uppercase">Vehicle Type</p>
                <p className="text-sm font-bold text-gray-900 mt-0.5">{profile?.vehicleType || "BUS"}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500">
                <Hash className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-gray-500 uppercase">License / Reg Number</p>
                <p className="text-sm font-bold text-gray-900 mt-0.5">{profile?.licenseNumber || profile?.vehicleId || "Not registered"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Personal Details Section */}
        <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Personal Info</h3>
            <button 
              onClick={() => setIsEditing(!isEditing)}
              className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              {isEditing ? <X className="w-4 h-4" /> : <PenLine className="w-4 h-4" />}
            </button>
          </div>

          {isEditing ? (
            <div className="space-y-4 animate-in fade-in duration-200">
              <Input
                label="Full Name"
                name="fullName"
                icon={User}
                value={formData.fullName}
                onChange={handleChange}
              />
              <Input
                label="Email Address"
                name="email"
                type="email"
                icon={Mail}
                value={formData.email}
                onChange={handleChange}
              />
              <Button 
                className="w-full mt-2" 
                onClick={handleSubmit}
                disabled={isSaving}
              >
                {isSaving ? <Spinner size="sm" color="white" /> : "Save Changes"}
              </Button>
            </div>
          ) : (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500">
                  <User className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-gray-500 uppercase">Full Name</p>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">{profile?.fullName || profile?.full_name}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500">
                  <Phone className="w-5 h-5" />
                </div>
                <div className="flex-1 flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase">Phone Number</p>
                    <p className="text-sm font-bold text-gray-900 mt-0.5">{formatPhone(profile?.phone)}</p>
                  </div>
                  {profile?.phoneVerified && (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                      Verified
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-gray-500 uppercase">Email Address</p>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">{profile?.email || "Not provided"}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Danger Zone */}
        <button 
          onClick={handleLogout}
          className="w-full bg-rose-50 text-rose-600 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-rose-100 transition-colors active:scale-[0.98]"
        >
          <LogOut className="w-5 h-5" />
          Log Out
        </button>

        <p className="text-center text-xs font-bold text-gray-400 mt-6 pb-[100px]">
          OBer Driver App v1.0.0
        </p>

      </div>
      <DriverBottomNav activePage="profile" />
    </div>
  );
}
