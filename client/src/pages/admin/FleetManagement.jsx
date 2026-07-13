import { useEffect, useState } from "react";
import { getFleet } from "../../services/adminApi";
import { Spinner } from "../../components/Spinner";
import { toast } from "sonner";
import { Search, Plus, UserPlus } from "lucide-react";
import { OnboardDriverModal } from "../../components/admin/OnboardDriverModal";

export function FleetManagement() {
  const [drivers, setDrivers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchDrivers = () => {
    setIsLoading(true);
    getFleet({ search: searchQuery, page, limit: 10 })
      .then((data) => {
        setDrivers(data?.drivers || []);
        setTotalPages(data?.pagination?.totalPages || 1);
        setIsLoading(false);
      })
      .catch((error) => {
        toast.error(error.message || "Failed to load fleet data");
        setIsLoading(false);
      });
  };

  useEffect(() => {
    setPage(1); // Reset to page 1 on new search
  }, [searchQuery]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchDrivers();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, page]);

  const StatusBadge = ({ status }) => {
    // Standardize status text from backend to frontend
    const normalizedStatus = status === "COMPLETE" ? "ACTIVE" : status === "PENDING" ? "ACTIVE" : status;
    
    const styles = {
      ACTIVE: "bg-emerald-100 text-emerald-800 border-emerald-200",
      SUSPENDED: "bg-red-100 text-red-800 border-red-200"
    };

    const style = styles[normalizedStatus] || "bg-gray-100 text-gray-800 border-gray-200";

    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${style}`}>
        {normalizedStatus}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-[#c1c7d2]/20">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search drivers by name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3198F5]/50 transition-all text-sm font-medium text-gray-800 placeholder:font-normal"
          />
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-[#3198F5] hover:bg-[#2b88dc] text-white px-5 py-2.5 rounded-xl font-bold transition-colors w-full md:w-auto justify-center shadow-sm"
        >
          <UserPlus className="w-5 h-5" />
          Onboard Driver
        </button>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#c1c7d2]/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50/50 text-xs uppercase text-gray-500 font-bold border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">Driver Details</th>
                <th className="px-6 py-4">Driver Code</th>
                <th className="px-6 py-4">Vehicle Info</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center">
                    <Spinner size="md" color="blue" />
                  </td>
                </tr>
              ) : drivers.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-500 font-medium">
                    No drivers found.
                  </td>
                </tr>
              ) : (
                drivers.map((driver) => (
                  <tr key={driver.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{driver.fullName || driver.full_name || "N/A"}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{driver.email} • {driver.phone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono bg-blue-50 text-[#3198F5] px-2 py-1 rounded-md text-xs font-bold border border-blue-100">
                        {driver.driverCode || driver.driver_code}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-800">{driver.vehicleType || driver.vehicle_type || "N/A"}</div>
                      <div className="text-xs text-gray-500 mt-0.5 uppercase">ID: {driver.vehicleId || driver.vehicle_id || "N/A"}</div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={driver.onboardingStatus || driver.onboarding_status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between bg-gray-50/50">
          <div className="text-sm text-gray-500 font-medium">
            Page <span className="text-gray-900 font-bold">{page}</span> of <span className="text-gray-900 font-bold">{Math.max(1, totalPages)}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
              className="px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isLoading}
              className="px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <OnboardDriverModal 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={() => {
            setIsModalOpen(false);
            fetchDrivers();
          }} 
        />
      )}
    </div>
  );
}
