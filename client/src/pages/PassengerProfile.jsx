import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { Spinner } from "../components/Spinner";
import { toast } from "sonner";
import { fetchUserProfile, updateUserProfile } from "../services/api";
import {
  MapPin,
  History,
  Wallet,
  User,
  PenLine,
  X,
  ShieldCheck,
  ChevronRight,
  Bell,
  Settings,
  LifeBuoy,
  LogOut,
  Mail,
  Phone,
} from "lucide-react";

export function PassengerProfile() {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [refresh, setRefresh] = useState(false);
  const [activePage, setActivePage] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const navigate = useNavigate();

  // Fetch profile data
  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const data = await fetchUserProfile();
      setProfile(data);
      setIsLoading(false);
      console.log("Fetched profile data:", data);
    } catch (error) {
      toast.error(error.message);
    }
  };

  // fetch data in the background when the component mounts or when refresh changes
  useEffect(() => {
    fetchProfile();
  }, []);

  //form Data
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
  });

  // handle phone number formatting

  const formatPhoneNumber = phone => {
    const digits = String(phone || "").replace(/\D/g, "");

    if (digits.length === 11) {
      return `+234 ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
    }

    if (digits.length === 13 && digits.startsWith("234")) {
      const local = digits.slice(3);
      return `+234 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
    }

    return phone;
  };
  const formattedPhone = formatPhoneNumber(profile?.phone);

  const initials = fullName => {
    const initial = fullName
      ?.trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(name => name[0])
      .join("")
      .toUpperCase();

    if (initial) return initial;
  };

  //handle navigation
  const handleClick = e => {
    const clickedButton = e.target.closest("button");
    if (!clickedButton) return;
    const nav = clickedButton.getAttribute("data-nav");
    if (nav === "map") {
      setActivePage(false);
      navigate("/passenger/map");
    }
  };

  // Handle form input changes
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
      await updateUserProfile(formData);
      toast.success("Profile updated successfully!");
      await fetchProfile(); // Refresh the profile data after update
      setIsEditing(false);
    } catch (error) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-[#f7f9fb] font-body-md min-h-screen flex flex-col  overflow-hidden relative pt-4 tall-screen:pt-6">
      {isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-50">
          <Spinner
            size="lg"
            color="blue"
            label="Loading..."
            showLabel
            className="flex-col"
          />
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center px-5 ">
            <p className="text-2xl font-bold sm:text-3xl">
              {isEditing ? "Edit Profile" : "Profile"}
            </p>
            <div
              className="inline-flex items-center justify-center rounded-2xl bg-white p-2"
              onClick={() => setIsEditing(!isEditing)}
            >
              {!isEditing ? (
                <PenLine className="w-6 h-6" strokeWidth={2} />
              ) : (
                <X className="w-6 h-6" strokeWidth={2} />
              )}
            </div>
          </div>

          {!isEditing ? (
            <div className="px-5 flex-1 overflow-y-auto pb-21 mt-5">
              <div className="flex flex-col tall-screen:gap-2 items-center">
                <div className="mb-[15px] rounded-4xl bg-[#3198F5] p-5 tall-screen:p-8">
                  <span className="text-3xl text-white font-bold sm:text-2xl tall-screen:text-4xl">
                    {profile?.fullName ? initials(profile?.fullName) : "?"}
                  </span>
                </div>
                <p className="text-lg tall-screen:text-xl font-black">
                  {profile?.fullName}
                </p>
                <p className="text-xs tall-screen:text-sm text-gray-500 tall-screen:mt-1">
                  {formattedPhone}
                </p>
                <div className=" mt-3 tall-screen:mt-5 inline-flex justify-center items-center space-x-7 text-xs font-bold sm:space-x-5">
                  <div className="flex items-center space-x-2 rounded-full bg-blue-300/30 p-2 text-[#3198F5] w-[100px]">
                    <ShieldCheck className="w-6 h-6" strokeWidth={2} />
                    <p>
                      {profile?.phoneVerified ? "OAU Verified" : "Not Verified"}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 rounded-full bg-green-300/40 p-4 text-green-600">
                    <div className="h-2 w-2 rounded-full bg-green-600"></div>
                    <p>Active</p>
                  </div>
                </div>
              </div>
              <div className="mt-7 tall-screen:mt-15 flex flex-col space-y-2 tall-screen:space-y-4">
                <p className="font-sans text-sm tall-screen:text-base font-bold text-gray-600 uppercase">
                  account
                </p>
                <div className="flex items-center space-x-5 rounded-2xl bg-white p-2 tall-screen:p-4 mt-[-5px]">
                  <div className="rounded-2xl bg-blue-300/30 p-2.5 text-grey-900">
                    <Wallet strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 text-base tall-screen:text-lg font-semibold">
                    Wallet
                  </div>
                  <div className="text-sm tall-screen:text-base font-semibold text-gray-600/70">
                    <span>₦3200</span>
                  </div>
                  <div>
                    <ChevronRight
                      className="w-6 h-6 text-grey-600/20"
                      strokeWidth={2.5}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-5 rounded-2xl bg-white p-2 tall-screen:p-4">
                  <div className="rounded-2xl bg-blue-300/30 p-2.5 text-grey-900">
                    <ShieldCheck strokeWidth={1.5} />
                  </div>
                  <div className="flex-1">
                    <p className="text-base tall-screen:text-xl font-semibold text-black-900">
                      OAU Verification
                    </p>
                    <p className="text-sm tall-screen:text-sm text-gray-900/50">
                      Student Email Confirmed
                    </p>
                  </div>
                  <div>
                    <ChevronRight
                      className="w-6 h-6 text-grey-600/20"
                      strokeWidth={2.5}
                    />
                  </div>
                </div>
              </div>
              <div className="mt-3 tall-screen:mt-10 flex flex-col space-y-2 tall-screen:space-y-4">
                <p className="font-sans text-sm tall-screen:text-base font-bold text-gray-600">
                  APP
                </p>
                <div className="flex items-center space-x-5 rounded-2xl bg-white p-2 tall-screen:p-4 mt-[-5px]">
                  <div className="rounded-2xl bg-blue-300/30 p-2.5 text-grey-900">
                    <Bell strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 text-base tall-screen:text-xl font-semibold">
                    Notifications
                  </div>
                  <div>
                    <ChevronRight
                      className="w-6 h-6 text-grey-600/20"
                      strokeWidth={2.5}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-5 rounded-2xl bg-white p-2 tall-screen:p-4">
                  <div className="rounded-2xl bg-blue-300/30 p-2.5 text-grey-900">
                    <Settings strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 text-base tall-screen:text-xl font-semibold">
                    Settings
                  </div>
                  <div>
                    <ChevronRight
                      className="w-6 h-6 text-grey-600/20"
                      strokeWidth={2.5}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-5 rounded-2xl bg-white p-2">
                  <div className="rounded-2xl bg-blue-300/30 p-2.5 text-grey-900">
                    <LifeBuoy strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 text-base tall-screen:text-xl font-semibold">
                    Help & Support
                  </div>
                  <div>
                    <ChevronRight
                      className="w-6 h-6 text-grey-600/20"
                      strokeWidth={2.5}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-5 rounded-2xl bg-white p-2">
                  <div className="rounded-2xl bg-red-400/50 p-2.5 text-red-900">
                    <LogOut strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 text-base tall-screen:text-xl font-semibold">
                    Log Out
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="container max-w-md mx-auto flex flex-col justify-center items-center px-4 mt-8 mb-[90px]">
              <div className="mb-[15px] rounded-full bg-[#3198F5] p-7 tall-screen:p-10">
                <span className="text-4xl text-white font-bold tall-screen:text-10xl">
                  {profile.fullName ? initials(profile.fullName) : "?"}
                </span>
              </div>

              <p className="text-sm mt-[-10px] font-medium text-gray-700 hover:text-[#3198F5] transition-colors cursor-pointer">
                Edit Picture
              </p>
              <div className="space-y-4 mt-6 w-full tall-screen:mt-10 tall-screen:space-y-8">
                {/* Full Name */}
                <Input
                  label="Full Name"
                  icon={User}
                  type="text"
                  name="fullName"
                  placeholder="Start with your last name e.g. John Doe"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                />

                {/* Email */}
                <Input
                  label="Email Address"
                  icon={Mail}
                  type="email"
                  name="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={handleChange}
                />

                {/* Phone Number */}
                <Input
                  label="Phone Number"
                  icon={Phone}
                  type="tel"
                  name="phone"
                  placeholder="090 2019 9741"
                  value={formData.phone}
                  readOnly
                />
                {/* Save Changes Button */}
                <div className="flex justify-center mt-12 tall-screen:mt-15">
                  <Button className="w-auto" onClick={handleSubmit}>
                    {isSaving ? (
                      <span className="flex items-center gap-2">
                        <Spinner
                          size="sm"
                          color="white"
                          label="Saving..."
                          showLabel={false}
                        />
                        Saving...
                      </span>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Bottom Navigation Bar */}
      <nav
        className={`fixed bottom-0 w-full z-[25] flex justify-around items-center px-4 h-[84px] bg-white/90 rounded-t-2xl backdrop-blur-xl border-t border-[#c1c7d2]/30 transition-transform duration-300`}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <button
          className="flex flex-col items-center text-[#56656e] hover:text-[#191c1e] transition-colors gap-1"
          data-nav="map"
          onClick={handleClick}
        >
          <div>
            <MapPin className="w-6 h-6" strokeWidth={2} />
          </div>
          <span className="text-[10px] tracking-wide mt-0.5">Map</span>
        </button>
        <button className="flex flex-col items-center text-[#56656e] hover:text-[#191c1e] transition-colors gap-1">
          <div>
            <History className="w-6 h-6" strokeWidth={2} />
          </div>
          <span className="text-[10px] tracking-wide mt-0.5">Activity</span>
        </button>
        <button className="flex flex-col items-center text-[#56656e] hover:text-[#191c1e] transition-colors gap-1">
          <div>
            <Wallet className="w-6 h-6" strokeWidth={2} />
          </div>
          <span className="text-[10px] tracking-wide mt-0.5">Wallet</span>
        </button>
        <button
          className={`flex flex-col items-center text-[#3198F5] ${!activePage ? "hover:text-[#191c1e]" : ""} transition-colors gap-1`}
        >
          <div
            className={`${activePage ? "bg-[#3198F5]/10 px-6 py-1.5 rounded-2xl" : ""}`}
          >
            <User
              className={activePage ? "w-5 h-5" : "w-6 h-6"}
              strokeWidth={activePage ? 2.5 : 2}
            />
          </div>

          <span
            className={`text-[10px] ${activePage ? "font-bold" : ""} tracking-wide ${!activePage ? "mt-0.5" : ""}`}
          >
            Profile
          </span>
        </button>
      </nav>
    </div>
  );
}
