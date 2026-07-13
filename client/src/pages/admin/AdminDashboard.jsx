import { useEffect, useState } from "react";
import { getDriverStats } from "../../services/adminApi";
import { Spinner } from "../../components/Spinner";
import { toast } from "sonner";
import { Users, Bus, Navigation, Activity, Map as MapIcon, ArrowUpRight, ArrowDownRight, Clock, CheckCircle2, UserPlus } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

export function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getDriverStats()
      .then((data) => {
        setStats(data);
        setIsLoading(false);
      })
      .catch((error) => {
        toast.error(error.message || "Failed to load dashboard statistics");
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)]">
        <Spinner size="lg" color="blue" />
      </div>
    );
  }

  // Ensure default values if backend stats are missing/null
  const s = stats?.stats || {};
  const totalDrivers = s.totalDrivers || 0;
  const activeBuses = s.totalBusDrivers || 0;
  const activeTricycles = s.totalTricycleDrivers || 0;
  const suspendedDrivers = s.suspendedDrivers || 0;

  const chartData = [
    { name: "Buses", count: activeBuses, color: "#3198F5" },
    { name: "Tricycles", count: activeTricycles, color: "#10b981" },
    { name: "Suspended", count: suspendedDrivers, color: "#ef4444" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* Header section with glass effect */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 relative">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Command Center</h1>
          <p className="text-gray-500 font-medium mt-1">Real-time overview of your fleet operations</p>
        </div>
        <div className="flex items-center gap-2 bg-white/60 backdrop-blur-md border border-gray-200/50 px-4 py-2 rounded-full shadow-sm">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <span className="text-sm font-bold text-gray-700">System Online</span>
        </div>
      </div>

      {/* Metric Cards - Premium Glassmorphism */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Total Drivers", value: totalDrivers, icon: Users, color: "text-[#3198F5]", bg: "bg-[#3198F5]/10", border: "border-[#3198F5]/20", trend: "+12%" },
          { title: "Active Buses", value: activeBuses, icon: Bus, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20", trend: "+5%" },
          { title: "Active Tricycles", value: activeTricycles, icon: Navigation, color: "text-indigo-500", bg: "bg-indigo-500/10", border: "border-indigo-500/20", trend: "-2%" },
          { title: "Suspended", value: suspendedDrivers, icon: Clock, color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/20", trend: "0 Issues", trendUp: true },
        ].map((stat, i) => (
          <div key={i} className="group relative bg-white rounded-3xl p-6 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
            <div className={`absolute top-0 right-0 w-32 h-32 ${stat.bg} rounded-full blur-3xl -mr-16 -mt-16 opacity-50 group-hover:opacity-100 transition-opacity`}></div>
            <div className="relative z-10 flex justify-between items-start">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${stat.bg} ${stat.color} ${stat.border} border backdrop-blur-sm`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${stat.trend.includes('-') ? 'text-rose-600 bg-rose-50' : stat.trend.includes('Action') ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50'}`}>
                {stat.trend.includes('-') ? <ArrowDownRight className="w-3 h-3" /> : stat.trend.includes('Action') ? null : <ArrowUpRight className="w-3 h-3" />}
                {stat.trend}
              </div>
            </div>
            <div className="mt-6 relative z-10">
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">{stat.title}</p>
              <p className="text-4xl font-black text-gray-900 mt-1">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
        
        {/* Charts Section */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#3198F5]" />
              Fleet Composition
            </h2>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontWeight: 600, fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontWeight: 'bold' }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={50} animationDuration={1500}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Activity Feed */}
        <div className="bg-white rounded-3xl p-6 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-gray-100 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <MapIcon className="w-5 h-5 text-emerald-500" />
              Live Activity
            </h2>
            <span className="text-xs font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full">Real-time</span>
          </div>
          
          <div className="flex-1 overflow-hidden relative">
            <div className="absolute top-0 bottom-0 left-[15px] w-px bg-gray-100"></div>
            <div className="space-y-6 relative">
              
              {[
                { time: "Just now", text: "Driver OAU-8335 came online", icon: MapIcon, color: "text-emerald-500", bg: "bg-emerald-50" },
                { time: "5m ago", text: "New driver onboarded: OAU-2902", icon: UserPlus, color: "text-[#3198F5]", bg: "bg-blue-50" },
                { time: "12m ago", text: "Driver OAU-2206 went offline", icon: Clock, color: "text-gray-400", bg: "bg-gray-100" },
                { time: "1h ago", text: "System daily snapshot completed", icon: CheckCircle2, color: "text-indigo-500", bg: "bg-indigo-50" },
              ].map((activity, i) => (
                <div key={i} className="flex gap-4 relative">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${activity.bg} ${activity.color} ring-4 ring-white`}>
                    <activity.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">{activity.text}</p>
                    <p className="text-xs font-medium text-gray-400 mt-0.5">{activity.time}</p>
                  </div>
                </div>
              ))}

            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
