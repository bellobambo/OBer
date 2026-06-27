import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Users, MapPin, History, Wallet, User as UserIcon, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { updateDriverVisibility } from "../services/api";
import { useSocket } from "../contexts/SocketContext";

const DUMMY_HOTSPOTS = [
  { placeName: "Anglo-Moz Car Park", passengerCount: 12, coords: [4.5135, 7.5219] },
  { placeName: "Fajuyi Hall Car Park", passengerCount: 8, coords: [4.5186, 7.5180] },
  { placeName: "Moremi Car Park", passengerCount: 15, coords: [4.5183, 7.5202] },
  { placeName: "OAU Health Centre", passengerCount: 5, coords: [4.5175, 7.5220] },
  { placeName: "SUB Car Park", passengerCount: 20, coords: [4.5207, 7.5178] },
];

export function DriverMap() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const driverMarkerRef = useRef(null);
  const hotspotMarkersRef = useRef([]);

  const [isOnline, setIsOnline] = useState(() => localStorage.getItem("driver_isOnline") === "true");
  const [liveHotspots, setLiveHotspots] = useState({});

  const { socket, isDemoMode, setIsDemoMode } = useSocket();

  // Socket event listeners
  useEffect(() => {
    if (!socket || isDemoMode) return;

    const handleSnapshot = (payload) => {
      const newHotspots = {};
      payload.hotspots.forEach((h) => {
        newHotspots[h.placeName] = h;
      });
      setLiveHotspots(newHotspots);
    };

    const handleUpdated = (payload) => {
      setLiveHotspots((prev) => ({
        ...prev,
        [payload.placeName]: payload,
      }));
    };

    const handleRemoved = (payload) => {
      setLiveHotspots((prev) => {
        const copy = { ...prev };
        delete copy[payload.placeName];
        return copy;
      });
    };

    socket.on("hotspots:snapshot", handleSnapshot);
    socket.on("hotspot:updated", handleUpdated);
    socket.on("hotspot:removed", handleRemoved);

    return () => {
      socket.off("hotspots:snapshot", handleSnapshot);
      socket.off("hotspot:updated", handleUpdated);
      socket.off("hotspot:removed", handleRemoved);
    };
  }, [socket, isDemoMode]);

  // Map Initialization
  useEffect(() => {
    if (map.current) return;
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://tiles.openfreemap.org/styles/bright",
      center: [4.518, 7.520], 
      zoom: 15.5,
      attributionControl: false,
    });

    const el = document.createElement("div");
    el.className = "w-5 h-5 bg-[#3198F5] rounded-full border-[3px] border-white shadow-lg ring-4 ring-[#3198F5]/20";
    driverMarkerRef.current = new maplibregl.Marker({ element: el })
      .setLngLat([4.518, 7.520])
      .addTo(map.current);
  }, []);

  // Update map markers when hotspots or demo mode changes
  useEffect(() => {
    if (!map.current) return;

    hotspotMarkersRef.current.forEach((marker) => marker.remove());
    hotspotMarkersRef.current = [];

    if (isOnline) {
      const spotsToRender = isDemoMode ? DUMMY_HOTSPOTS : Object.values(liveHotspots);

      spotsToRender.forEach((spot) => {
        const coords = spot.coords || spot.coordinates;
        if (!coords) return;

        const el = document.createElement("div");
        el.className = "flex flex-col items-center pointer-events-none";
        
        el.innerHTML = `
          <div class="bg-white p-2 rounded-full shadow-lg border-[2px] flex items-center justify-center relative transition-transform duration-500 hover:scale-110" style="border-color: #00497d;">
            <span class="material-symbols-outlined text-[24px]" style="color: #00497d; font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;">groups</span>
            <div class="absolute min-w-[20px] h-[20px] px-1 flex items-center justify-center text-[10px] font-bold rounded-full shadow-sm" style="background-color: #ba1a1a; color: white; border: 2px solid white; top: -6px; right: -6px;">
              ${spot.passengerCount || spot.count || 0}
            </div>
          </div>
          <span class="text-[11px] font-bold bg-white/95 text-[#00497d] px-2.5 py-0.5 rounded shadow-sm mt-1.5 backdrop-blur-sm border border-gray-100">
            ${spot.placeName || spot.name}
          </span>
        `;

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat(coords)
          .addTo(map.current);
        hotspotMarkersRef.current.push(marker);
      });
    }
  }, [isOnline, isDemoMode, liveHotspots]);

  // Continuous GPS Tracking when Online
  useEffect(() => {
    let watchId;
    if (isOnline) {
      if ("geolocation" in navigator) {
        watchId = navigator.geolocation.watchPosition(
          (pos) => {
            const { latitude, longitude, heading } = pos.coords;
            if (driverMarkerRef.current) {
              driverMarkerRef.current.setLngLat([longitude, latitude]);
            }
            if (map.current) {
              // Smoothly pan map to follow driver
              map.current.easeTo({ center: [longitude, latitude] });
            }
            
            if (isDemoMode) {
              updateDriverVisibility(true, latitude, longitude, heading || 0).catch(() => {});
            } else if (socket) {
              socket.emit("driver:visibility:update", { isVisible: true, latitude, longitude, heading: heading || 0 }, () => {});
            }
          },
          (err) => {
            console.error("GPS Error:", err);
            toast.error("Lost GPS signal.");
          },
          { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
        );
      } else {
        toast.error("Geolocation is not supported by your browser");
      }
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [isOnline, isDemoMode, socket]);

  const toggleStatus = async () => {
    if (isOnline) {
      setIsOnline(false);
      localStorage.setItem("driver_isOnline", "false");
      toast.info("You are now offline.");
      
      if (isDemoMode) {
        await updateDriverVisibility(false, 0, 0, 0).catch(() => {}); 
      } else if (socket) {
        socket.emit("driver:visibility:update", { isVisible: false, latitude: 0, longitude: 0 }, () => {});
      }
    } else {
      setIsOnline(true);
      localStorage.setItem("driver_isOnline", "true");
      toast.success("You are now online and visible to passengers.");
    }
  };

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-[#f7f9fb] text-gray-900 font-sans">
      <div ref={mapContainer} className="absolute inset-0 w-full h-full z-0" />

      <header className="absolute top-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <h1 className="text-2xl text-[#00497d] font-bold tracking-tight">OBer</h1>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsDemoMode(!isDemoMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors border shadow-sm ${
              isDemoMode 
                ? "bg-amber-100 text-amber-800 border-amber-300" 
                : "bg-emerald-100 text-emerald-800 border-emerald-300"
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            {isDemoMode ? "Demo Mode" : "Live Mode"}
          </button>
          
          <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-gray-200">
            <img 
              alt="Profile" 
              className="w-full h-full object-cover" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuARDgvR22O96b4HBpQ0Aw8XZESjhQtt9qLMFQ-LPMckgproLzqsPsC1uf2JYDJZtB6u33vdw-RMd1ST284YnfOouNowxOtlI7Ild8WpXRaywVQ2Vg0hTVnfMk-Bxq3-0XRihvyqw0IIFhefChwBrJquxMV45O0BpGRcRlh63-F0tlXi-OWmt6IYKGfKQ6HpdlCzauaGppDq84PM1VcQURl1th5NTuIKu6gIoEPKaJUTzx4DAX-qmWVXAuXPMJHnkamhD-p_YxpQx_g" 
            />
          </div>
        </div>
      </header>

      <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-50 w-full max-w-[348px] px-6 flex justify-center">
        <button 
          onClick={toggleStatus}
          className={`w-full max-w-[300px] font-bold py-4 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center gap-3 active:scale-95 ${
            isOnline 
              ? "bg-[#3198F5] text-white azure-glow" 
              : "bg-white text-gray-700 border border-gray-200"
          }`}
        >
          <div className={`w-3 h-3 rounded-full ${isOnline ? "bg-[#99f894] shadow-[0_0_8px_#99f894]" : "bg-gray-400"}`} />
          <span>{isOnline ? "Go Offline" : "Go Online"}</span>
        </button>
      </div>

      <nav className="absolute bottom-0 w-full z-40 flex justify-around items-center px-4 h-20 bg-white/90 backdrop-blur-xl border-t border-gray-200 shadow-[0_-4px_16px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom)]">
        <a className="flex flex-col items-center justify-center text-[#3198F5] gap-1 cursor-pointer">
          <div className="bg-[#3198F5]/10 px-6 py-1.5 rounded-full">
            <MapPin className="w-6 h-6 fill-current" />
          </div>
          <span className="text-[11px] font-bold">Map</span>
        </a>
        <a className="flex flex-col items-center justify-center text-gray-500 hover:text-gray-900 gap-1 cursor-pointer transition-colors">
          <History className="w-6 h-6" />
          <span className="text-[11px] font-medium">Activity</span>
        </a>
        <a className="flex flex-col items-center justify-center text-gray-500 hover:text-gray-900 gap-1 cursor-pointer transition-colors">
          <Wallet className="w-6 h-6" />
          <span className="text-[11px] font-medium">Wallet</span>
        </a>
        <a className="flex flex-col items-center justify-center text-gray-500 hover:text-gray-900 gap-1 cursor-pointer transition-colors">
          <UserIcon className="w-6 h-6" />
          <span className="text-[11px] font-medium">Profile</span>
        </a>
      </nav>
    </div>
  );
}
