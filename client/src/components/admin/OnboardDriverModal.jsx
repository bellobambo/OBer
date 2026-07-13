import { useState } from "react";
import { onboardDriver } from "../../services/adminApi";
import { toast } from "sonner";
import { X, UserPlus, Car, Mail, Phone, Lock, Hash } from "lucide-react";
import { Spinner } from "../Spinner";
import { Input } from "../Input";

export function OnboardDriverModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    vehicleId: "",
    vehicleType: "BUS",
    licenseNumber: "",
    onboardingStatus: "ACTIVE",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onboardDriver(formData);
      toast.success("Driver onboarded successfully!");
      onSuccess();
    } catch (error) {
      toast.error(error.message || "Failed to onboard driver");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#3198F5]/10 rounded-full flex items-center justify-center text-[#3198F5]">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Onboard Driver</h2>
              <p className="text-xs font-medium text-gray-500">Register a new fleet operator</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="overflow-y-auto p-6 scrollbar-hide">
          <form id="onboard-form" onSubmit={handleSubmit} className="space-y-6">
            
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider border-b pb-2">Personal Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  name="fullName"
                  icon={UserPlus}
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                />
                <Input
                  label="Email Address"
                  name="email"
                  type="email"
                  icon={Mail}
                  placeholder="john@oauife.edu.ng"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
                <Input
                  label="Phone Number"
                  name="phone"
                  type="tel"
                  icon={Phone}
                  placeholder="08012345678"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
                <Input
                  label="Temporary Password"
                  name="password"
                  type="text"
                  icon={Lock}
                  placeholder="Password (min 8 chars)"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={8}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider border-b pb-2 mt-6">Vehicle Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Custom Select for Vehicle Type */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 ml-1">Vehicle Type</label>
                  <div className="relative">
                    <Car className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <select
                      name="vehicleType"
                      value={formData.vehicleType}
                      onChange={handleChange}
                      className="w-full pl-11 pr-4 py-3 bg-white border border-[#c1c7d2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3198F5]/50 focus:border-[#3198F5] transition-all text-sm font-bold text-[#191c1e] appearance-none"
                    >
                      <option value="BUS">Bus</option>
                      <option value="TRICYCLE">Tricycle (Korope)</option>
                    </select>
                  </div>
                </div>

                <Input
                  label="Vehicle ID"
                  name="vehicleId"
                  icon={Hash}
                  placeholder="e.g. OAU-BUS-01"
                  value={formData.vehicleId}
                  onChange={handleChange}
                  required
                />
                <Input
                  label="License Number"
                  name="licenseNumber"
                  icon={Hash}
                  placeholder="ABC-123-XY"
                  value={formData.licenseNumber}
                  onChange={handleChange}
                />

                {/* Custom Select for Status */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 ml-1">Account Status</label>
                  <select
                    name="onboardingStatus"
                    value={formData.onboardingStatus}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white border border-[#c1c7d2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3198F5]/50 focus:border-[#3198F5] transition-all text-sm font-bold text-[#191c1e]"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>
                </div>
              </div>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-bold text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="onboard-form"
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl font-bold text-white bg-[#3198F5] hover:bg-[#2b88dc] transition-colors shadow-sm disabled:opacity-70 flex items-center justify-center min-w-[120px] text-sm"
          >
            {isSubmitting ? <Spinner size="sm" color="white" /> : "Onboard Driver"}
          </button>
        </div>

      </div>
    </div>
  );
}
