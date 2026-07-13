import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { Spinner } from "../components/Spinner";
import { BottomNav } from "../components/BottomNav";
import { toast } from "sonner";
import { fetchUserProfile, updateUserProfile } from "../services/api";
import { getAdminProfile } from "../services/adminApi";
import {
  ShieldCheck,
  ChevronRight,
  Settings,
  LifeBuoy,
  LogOut,
  Mail,
  Phone,
  User,
  PenLine,
  X,
  Wallet,
  Bell,
  ChevronLeft,
  Activity
} from "lucide-react";

export function PassengerProfile() {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [refresh, setRefresh] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const data = await fetchUserProfile();
      setProfile(data);
      setFormData({
        fullName: data.fullName || "",
        email: data.email || "",
      });
      setIsLoading(false);
    } catch (error) {
      toast.error(error.message);
    }
  };

  useEffect(() => {
    fetchProfile();
    getAdminProfile()
      .then(user => {
        if (user) setIsAdmin(true);
      })
      .catch(() => {
        // Handle silently or log if needed
      });
  }, [refresh]);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
  });

  const initials = name => {
    if (!name) return "";
    const names = name.split(" ");
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const formatPhone = phoneStr => {
    if (!phoneStr) return "";
    let cleanPhone = phoneStr.startsWith("+234")
      ? "0" + phoneStr.slice(4)
      : phoneStr;
    if (cleanPhone.length === 11) {
      return `${cleanPhone.slice(0, 4)} ${cleanPhone.slice(4, 7)} ${cleanPhone.slice(7)}`;
    }
    return cleanPhone;
  };
  const formattedPhone = formatPhone(profile?.phone);

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // handle form submission
  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      const response = await updateUserProfile(formData);
      toast.success(response.message);
      await fetchProfile(); // Refresh the profile data after update
      setIsEditing(false);
    } catch (error) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("passenger_isArmed");
    localStorage.removeItem("passenger_hotspotId");
    localStorage.removeItem("passenger_selectedSpot");
    localStorage.removeItem("passenger_hotspotExpiresAt");
    navigate("/login", { replace: true });
  };

  if (isLoading && !profile) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-gray-50">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gray-50 pb-[100px] font-sans">
      {/* Header */}
      <div className="bg-[#3198F5] pt-12 pb-24 px-6 rounded-b-[40px] shadow-sm relative">
        <div className="flex items-center justify-between text-white relative z-10">
          <button 
            onClick={() => navigate("/passenger/map")}
            className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold">Passenger Profile</h1>
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
              {initials(profile?.fullName)}
            </div>
            <div className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full"></div>
          </div>
          
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">
            {profile?.fullName || "Passenger"}
          </h2>
          <p className="text-sm font-medium text-gray-500 mt-1">
            {formattedPhone}
          </p>

          <div className="flex items-center gap-3 mt-4">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
              <span className="text-xs font-bold uppercase tracking-wide">Active</span>
            </div>
            
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${profile?.phoneVerified ? "bg-[#3198F5]/10 text-[#3198F5]" : "bg-gray-100 text-gray-500"}`}>
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="text-xs font-bold uppercase tracking-wide">
                {profile?.phoneVerified ? "OAU Verified" : "Not Verified"}
              </span>
            </div>
          </div>
        </div>

        {/* Account Section */}
        <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-6">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-5">Account</h3>
          
          <div className="space-y-5">
            <div className="flex items-center gap-4 group cursor-pointer">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-[#3198F5] group-hover:bg-[#3198F5] group-hover:text-white transition-colors">
                <Wallet className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">Wallet</p>
                <p className="text-xs font-medium text-gray-500 mt-0.5">Manage your balance</p>
              </div>
              <div className="text-sm font-bold text-gray-900 mr-2">₦3200</div>
              <ChevronRight className="w-5 h-5 text-gray-300" />
            </div>
            
            <div className="flex items-center gap-4 group cursor-pointer">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-[#3198F5] group-hover:bg-[#3198F5] group-hover:text-white transition-colors">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">OAU Verification</p>
                <p className="text-xs font-medium text-gray-500 mt-0.5">Student Email Confirmed</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300" />
            </div>
          </div>
        </div>

        {/* App Section */}
        <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-6">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-5">App</h3>
          
          <div className="space-y-5">
            <div className="flex items-center gap-4 group cursor-pointer">
              <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 group-hover:bg-gray-100 transition-colors">
                <Bell className="w-5 h-5" />
              </div>
              <div className="flex-1 text-sm font-bold text-gray-900">Notifications</div>
              <ChevronRight className="w-5 h-5 text-gray-300" />
            </div>
            
            <div className="flex items-center gap-4 group cursor-pointer">
              <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 group-hover:bg-gray-100 transition-colors">
                <Settings className="w-5 h-5" />
              </div>
              <div className="flex-1 text-sm font-bold text-gray-900">Settings</div>
              <ChevronRight className="w-5 h-5 text-gray-300" />
            </div>

            <div className="flex items-center gap-4 group cursor-pointer">
              <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 group-hover:bg-gray-100 transition-colors">
                <LifeBuoy className="w-5 h-5" />
              </div>
              <div className="flex-1 text-sm font-bold text-gray-900">Help & Support</div>
              <ChevronRight className="w-5 h-5 text-gray-300" />
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
              <Input
                label="Phone Number"
                name="phone"
                type="tel"
                icon={Phone}
                value={formattedPhone}
                readOnly
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
                  <p className="text-sm font-bold text-gray-900 mt-0.5">{profile?.fullName}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500">
                  <Phone className="w-5 h-5" />
                </div>
                <div className="flex-1 flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase">Phone Number</p>
                    <p className="text-sm font-bold text-gray-900 mt-0.5">{formattedPhone}</p>
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
                  <p className="text-sm font-bold text-gray-900 mt-0.5 break-all">{profile?.email || "Not set"}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Admin Dashboard */}
        {isAdmin && (
          <div className="mb-6">
            <button
              onClick={() => navigate("/admin")}
              className="w-full flex items-center gap-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-4 text-white shadow-lg shadow-purple-500/20 active:scale-95 transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-base font-bold">Admin Dashboard</p>
                <p className="text-xs text-purple-100 mt-0.5">Manage fleet and drivers</p>
              </div>
              <ChevronRight className="w-5 h-5 text-white/70" />
            </button>
          </div>
        )}

        {/* Danger Zone */}
        <button 
          onClick={handleLogout}
          className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-bold py-4 rounded-2xl transition-colors flex items-center justify-center gap-2 active:scale-95"
        >
          <LogOut className="w-5 h-5" />
          Log Out
        </button>

        <p className="text-center text-xs font-bold text-gray-400 mt-6 pb-[100px]">
          OBer Passenger App v1.0.0
        </p>
      </div>

      <BottomNav activePage="profile" />
    </div>
  );
}
