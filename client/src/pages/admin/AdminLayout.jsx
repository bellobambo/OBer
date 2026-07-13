import { useEffect, useState } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, LogOut, ArrowLeft, Menu, X } from "lucide-react";
import { toast } from "sonner";
import { getAdminProfile } from "../../services/adminApi";
import { Spinner } from "../../components/Spinner";

export function AdminLayout() {
  const [isAdmin, setIsAdmin] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Verify admin access on mount
    getAdminProfile()
      .then((user) => {
        if (!user) {
          throw new Error("Invalid admin profile");
        }
        setIsAdmin(true);
      })
      .catch((error) => {
        toast.error("You do not have administrative access.");
        navigate("/passenger/map"); // Redirect non-admins back to passenger map
      });
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/passenger/login");
  };

  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-[#f7f9fb] flex items-center justify-center">
        <Spinner size="lg" color="blue" label="Verifying Access..." showLabel />
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#f7f9fb] overflow-hidden font-sans text-[#191c1e]">
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-[#c1c7d2]/30 shadow-sm z-20 shrink-0">
        <span className="text-xl font-bold tracking-tight text-[#3198F5]">
          OBer <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md ml-1">ADMIN</span>
        </span>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2">
          {isSidebarOpen ? <X className="w-6 h-6 text-gray-700" /> : <Menu className="w-6 h-6 text-gray-700" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 transition-transform duration-300 fixed md:static top-0 left-0 h-full w-64 bg-white border-r border-[#c1c7d2]/30 flex flex-col shadow-sm z-30`}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-[#c1c7d2]/30">
          <span className="text-2xl font-bold tracking-tight text-[#3198F5]">
            OBer <span className="text-sm font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md ml-2">ADMIN</span>
          </span>
          <button className="md:hidden p-1 text-gray-500" onClick={() => setIsSidebarOpen(false)}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-2">
          <NavLink
            to="/admin/dashboard"
            onClick={() => setIsSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-colors ${
                isActive
                  ? "bg-[#3198F5]/10 text-[#3198F5]"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              }`
            }
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </NavLink>
          
          <NavLink
            to="/admin/fleet"
            onClick={() => setIsSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-colors ${
                isActive
                  ? "bg-[#3198F5]/10 text-[#3198F5]"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              }`
            }
          >
            <Users className="w-5 h-5" />
            Fleet Management
          </NavLink>
        </nav>

        <div className="p-4 border-t border-[#c1c7d2]/30 space-y-2">
          <button
            onClick={() => navigate("/passenger/map")}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl font-semibold text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to App
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl font-semibold text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Log Out
          </button>
        </div>
      </aside>

      {/* Overlay for mobile when sidebar is open */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden" 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top Header */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-[#c1c7d2]/30 flex items-center px-8 shadow-sm shrink-0">
          <h1 className="text-xl font-bold tracking-tight text-gray-800 capitalize">
            {location.pathname.split("/").pop().replace("-", " ")}
          </h1>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
