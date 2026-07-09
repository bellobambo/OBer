import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Car, History, Wallet, User, Search, X, MapPin, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { useDummyDrivers } from "../hooks/useDummyDrivers";
import { armHotspot, disarmHotspot } from "../services/api";
import { useSocket } from "../contexts/SocketContext";

const OAU_BOUNDS = [
  [4.5, 7.5], // Southwest
  [4.55, 7.54], // Northeast
];
const OAU_CENTER = [4.524, 7.521];

const PREDEFINED_HOTSPOTS = [
  { name: "Angola Hall", coords: [4.524, 7.518] },
  { name: "OAU Health Centre", coords: [4.521, 7.525] },
  { name: "Faculty of Tech", coords: [4.528, 7.522] },
];

export function PassengerMap() {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const selectedSpotMarkerRef = useRef(null);
  const driverMarkersRef = useRef(new Map());
  const location = useLocation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isArmed, setIsArmed] = useState(() => localStorage.getItem("passenger_isArmed") === "true");
  const [hotspotId, setHotspotId] = useState(() => localStorage.getItem("passenger_hotspotId") || null);
  const [isArming, setIsArming] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
<<<<<<< HEAD
  
  const [selectedSpot, setSelectedSpot] = useState(() => {
    const saved = localStorage.getItem("passenger_selectedSpot");
    return saved ? JSON.parse(saved) : PREDEFINED_HOTSPOTS[0];
  });
  const [timeLeft, setTimeLeft] = useState(() => {
    const expiresAt = localStorage.getItem("passenger_hotspotExpiresAt");
    if (expiresAt) {
      const remaining = Math.max(0, Math.floor((parseInt(expiresAt) - Date.now()) / 1000));
      return remaining > 0 ? remaining : 300;
    }
    return 300;
  });
=======

  const [selectedSpot, setSelectedSpot] = useState(PREDEFINED_HOTSPOTS[0]);
  const [timeLeft, setTimeLeft] = useState(300);
>>>>>>> b13b1481834fa77e72c1b66a26bcccd949a1ef70

  // Clear expired hotspot on mount
  useEffect(() => {
    if (isArmed && timeLeft === 0) {
      handleCancelArm();
    }
  }, []);

  const { socket, isDemoMode, setIsDemoMode } = useSocket();
  const dummyDrivers = useDummyDrivers(selectedSpot?.coords, !!selectedSpot);
  const [liveDrivers, setLiveDrivers] = useState({});

  useEffect(() => {
    if (!socket || isDemoMode) return;
    
    const handleLocationUpdate = (payload) => {
      setLiveDrivers(prev => {
        if (!payload.isVisible) {
          const copy = { ...prev };
          delete copy[payload.driverId];
          return copy;
        }
        return { 
          ...prev, 
          [payload.driverId]: { id: payload.driverId, coords: [payload.longitude, payload.latitude] } 
        };
      });
    };

    socket.on("driver:location", handleLocationUpdate);
    socket.on("driver:visibility", handleLocationUpdate);

    return () => {
      socket.off("driver:location", handleLocationUpdate);
      socket.off("driver:visibility", handleLocationUpdate);
    };
  }, [socket, isDemoMode]);

  const activeDrivers = isDemoMode ? dummyDrivers : Object.values(liveDrivers);

  //state navigation
  const [activePage, setActivePage] = useState(true); //Page currently being viewed

  const navigate = useNavigate();

  // Map Initialization
  useEffect(() => {
    if (mapRef.current) return;

    let initialCenter = OAU_CENTER;
    if (location.state?.lat && location.state?.lng) {
      const { lat, lng } = location.state;
      if (
        lng >= OAU_BOUNDS[0][0] &&
        lng <= OAU_BOUNDS[1][0] &&
        lat >= OAU_BOUNDS[0][1] &&
        lat <= OAU_BOUNDS[1][1]
      ) {
        initialCenter = [lng, lat];
      }
    }

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://tiles.openfreemap.org/styles/bright", 
      center: initialCenter,
      zoom: 15.5,
      maxBounds: OAU_BOUNDS,
      attributionControl: false,
    });
    mapRef.current = map;

    map.on("load", () => {
      // User Marker
      const userEl = document.createElement("div");
      userEl.className =
        "w-5 h-5 bg-[#3198F5] rounded-full border-[3px] border-white shadow-lg ring-4 ring-[#3198F5]/20";
      new maplibregl.Marker({ element: userEl })
        .setLngLat(initialCenter)
        .addTo(map);
    });
  }, [location.state]);

  // Handle Map FlyTo and Marker when selectedSpot changes
  useEffect(() => {
    if (selectedSpot?.coords && mapRef.current) {
      mapRef.current.flyTo({
        center: selectedSpot.coords,
        zoom: 16.5,
        speed: 1.2,
      });

      if (!selectedSpotMarkerRef.current) {
        const el = document.createElement("div");
        el.className =
          "w-10 h-10 flex items-center justify-center text-[#3198F5] drop-shadow-xl -translate-y-5 transition-transform duration-300";
        el.innerHTML =
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" /></svg>';
        selectedSpotMarkerRef.current = new maplibregl.Marker({
          element: el,
          anchor: "bottom",
        })
          .setLngLat(selectedSpot.coords)
          .addTo(mapRef.current);
      } else {
        selectedSpotMarkerRef.current.setLngLat(selectedSpot.coords);
      }
    } else if (!selectedSpot && selectedSpotMarkerRef.current) {
      selectedSpotMarkerRef.current.remove();
      selectedSpotMarkerRef.current = null;
    }
  }, [selectedSpot]);

  // Handle moving driver markers
  useEffect(() => {
    if (!mapRef.current) return;

    const currentIds = new Set(activeDrivers.map(d => d.id));

    // Remove old markers that are no longer nearby
    for (const [id, marker] of driverMarkersRef.current.entries()) {
      if (!currentIds.has(id)) {
        marker.remove();
        driverMarkersRef.current.delete(id);
      }
    }

    // Add or update markers
    activeDrivers.forEach(d => {
      if (driverMarkersRef.current.has(d.id)) {
        const marker = driverMarkersRef.current.get(d.id);
        marker.setLngLat(d.coords);
        if (d.heading !== undefined && d.heading !== null) {
          marker.setRotation(d.heading);
        }
      } else {
        const el = document.createElement("div");
<<<<<<< HEAD
        el.className = "transition-all duration-1000 ease-linear drop-shadow-xl";
        // Sleek, top-down view of a sedan car
        el.innerHTML = `
          <svg width="24" height="46" viewBox="0 0 28 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Shadow under the car -->
            <rect x="1" y="4" width="26" height="52" rx="12" fill="rgba(0,0,0,0.15)"/>
            <!-- Main Body -->
            <rect x="2" y="2" width="24" height="52" rx="10" fill="#2c3e50"/>
            <!-- Roof -->
            <rect x="4" y="16" width="20" height="24" rx="4" fill="#1a252f"/>
            <!-- Front Windshield -->
            <path d="M 4 16 Q 14 10 24 16 L 22 20 Q 14 17 6 20 Z" fill="#87ceeb"/>
            <!-- Rear Windshield -->
            <path d="M 4 40 Q 14 45 24 40 L 22 36 Q 14 38 6 36 Z" fill="#87ceeb"/>
            <!-- Headlights -->
            <rect x="4" y="2" width="5" height="3" rx="1.5" fill="#f1c40f"/>
            <rect x="19" y="2" width="5" height="3" rx="1.5" fill="#f1c40f"/>
            <!-- Taillights -->
            <rect x="4" y="51" width="5" height="3" rx="1.5" fill="#e74c3c"/>
            <rect x="19" y="51" width="5" height="3" rx="1.5" fill="#e74c3c"/>
          </svg>
        `;
        
=======
        // The CSS transition-transform handles the smooth animation!
        el.className =
          "w-10 h-10 bg-white shadow-xl rounded-full flex items-center justify-center border-2 border-[#3198F5] text-[#3198F5] transition-transform duration-1000 ease-linear";
        el.innerHTML =
          '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a2 2 0 0 0-1.6-.8H9.3a2 2 0 0 0-1.6.8L5 11l-5.16.86a1 1 0 0 0-.84.99V16h3m10 0a2 2 0 1 1-4 0m4 0a2 2 0 1 0-4 0m-10 0a2 2 0 1 1-4 0m4 0a2 2 0 1 0-4 0"/></svg>';

>>>>>>> b13b1481834fa77e72c1b66a26bcccd949a1ef70
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat(d.coords)
          .addTo(mapRef.current);
          
        if (d.heading !== undefined && d.heading !== null) {
          marker.setRotation(d.heading);
        }
          
        driverMarkersRef.current.set(d.id, marker);
      }
    });
  }, [activeDrivers]);

  // Handle Search Debounce
  useEffect(() => {
    if (!searchQuery) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const query = encodeURIComponent(`${searchQuery}, Ife`);
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=5`,
        );
        const data = await res.json();
        const valid = data
          .filter(d => {
            const lat = parseFloat(d.lat);
            const lon = parseFloat(d.lon);
            return (
              lon >= OAU_BOUNDS[0][0] &&
              lon <= OAU_BOUNDS[1][0] &&
              lat >= OAU_BOUNDS[0][1] &&
              lat <= OAU_BOUNDS[1][1]
            );
          })
          .map(d => ({
            name: d.display_name.split(",")[0],
            coords: [parseFloat(d.lon), parseFloat(d.lat)],
          }));

        setSearchResults(valid);
      } catch (e) {
        toast.error("Failed to connect to search service.");
        console.error(e);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Timer logic
  useEffect(() => {
    let timerId;
    if (isArmed && timeLeft > 0) {
      timerId = setInterval(() => setTimeLeft(p => p - 1), 1000);
    } else if (timeLeft === 0 && isArmed) {
      handleCancelArm(); 
    }
    return () => clearInterval(timerId);
  }, [isArmed, timeLeft]);

  const handleArm = async () => {
    if (!selectedSpot) return;
    setIsArming(true);
    try {
      const data = await armHotspot(selectedSpot.name, selectedSpot.coords);
<<<<<<< HEAD
      const newHotspotId = data.data?.hotspotId || data.hotspotId || data.data?.hotspot?.id;
      setHotspotId(newHotspotId);
=======
      setHotspotId(
        data.data?.hotspotId || data.hotspotId || data.data?.hotspot?.id,
      );
>>>>>>> b13b1481834fa77e72c1b66a26bcccd949a1ef70
      setIsArmed(true);
      setTimeLeft(300);
      
      localStorage.setItem("passenger_isArmed", "true");
      if (newHotspotId) localStorage.setItem("passenger_hotspotId", newHotspotId);
      localStorage.setItem("passenger_selectedSpot", JSON.stringify(selectedSpot));
      localStorage.setItem("passenger_hotspotExpiresAt", Date.now() + 300 * 1000);

      toast.success("Hotspot armed successfully!");
    } catch (e) {
      toast.error(e.message || "Failed to arm hotspot");
    } finally {
      setIsArming(false);
    }
  };

  const handleCancelArm = async () => {
    if (hotspotId) {
      try {
        await disarmHotspot(hotspotId);
      } catch (e) {
        console.error("Disarm error", e);
      }
    }
    setHotspotId(null);
    setIsArmed(false);
    setTimeLeft(300);
    
    localStorage.removeItem("passenger_isArmed");
    localStorage.removeItem("passenger_hotspotId");
    localStorage.removeItem("passenger_selectedSpot");
    localStorage.removeItem("passenger_hotspotExpiresAt");
  };

  const formatTime = seconds => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m < 10 ? "0" + m : m}:${s < 10 ? "0" + s : s}`;
  };

  const selectSearchResult = result => {
    setSelectedSpot(result);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleKeyDown = e => {
    if (e.key === "Enter") {
      if (searchResults.length > 0) {
        selectSearchResult(searchResults[0]);
      } else if (searchQuery) {
        toast.error(`No campus results found for "${searchQuery}"`);
      }
    }
  };

  //handles click from the nav bar

  const handleClick = e => {
    const clickedButton = e.target.closest("button");
    if (!clickedButton) return;
    const nav = clickedButton.getAttribute("data-nav");
    if (nav === "profile") {
      setActivePage(false);
      navigate("/passenger/profile");
    }
  };

  return (
    <div className="bg-[#f7f9fb] text-[#191c1e] font-body-md h-[100dvh] w-[100vw] overflow-hidden fixed m-0 p-0">
      <style>{`
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 20px 2px rgba(49, 152, 245, 0.4), 0 0 40px 8px rgba(49, 152, 245, 0.2); transform: scale(1); }
          50% { box-shadow: 0 0 30px 6px rgba(49, 152, 245, 0.8), 0 0 60px 15px rgba(49, 152, 245, 0.5); transform: scale(1.05); }
        }
        .azure-glow {
          animation: glow-pulse 2.5s infinite ease-in-out;
          background: linear-gradient(135deg, #3198F5, #227bd9);
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Map Container */}
      <main className="absolute inset-0 h-full w-full z-0" ref={mapContainer} />

      {/* Top App Bar */}
      <header className="fixed top-0 w-full z-[30] flex justify-between items-center px-6 h-16 bg-[#e6e8ea]/60 backdrop-blur-md border-b border-[#c1c7d2]/30">
        <div className="flex items-center space-x-1.5">
          <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center p-[2px] shadow-sm">
            <div className="w-full h-full border-[2.5px] border-[#3198F5] rounded-full flex items-center justify-center">
              <div className="w-1 h-1 bg-[#3198F5] rounded-full"></div>
            </div>
          </div>
          <span className="text-2xl font-bold tracking-tight text-[#3198F5]">
            Ber
          </span>
        </div>
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
          
          <div className="w-9 h-9 rounded-full overflow-hidden border border-[#c1c7d2]">
            <img alt="Profile" className="w-full h-full object-cover" src="https://ui-avatars.com/api/?name=User&background=3198F5&color=fff" />
          </div>
        </div>
      </header>

      {/* FAB */}
      <div
        className={`fixed bottom-28 left-1/2 -translate-x-1/2 z-[30] transition-all duration-300 ${isModalOpen ? "opacity-0 pointer-events-none translate-y-10" : ""}`}
      >
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex flex-col items-center gap-3"
        >
          <div className="w-[72px] h-[72px] text-white rounded-full flex items-center justify-center azure-glow">
            <Car className="w-8 h-8" strokeWidth={2.5} />
          </div>
          <div className="bg-white shadow-lg px-6 py-2.5 rounded-full border border-[#c1c7d2]">
            <span className="text-[#3198F5] font-bold text-sm tracking-wide">
              I Need a Ride
            </span>
          </div>
        </button>
      </div>

      {/* Modal Overlay */}
      <div
        className={`fixed inset-0 bg-black/20 z-[35] transition-opacity duration-300 ${isModalOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={() => setIsModalOpen(false)}
      />

      {/* Bottom Sheet Modal */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-[40] transition-transform duration-300 ${isModalOpen ? "translate-y-0" : "translate-y-full"}`}
      >
        <div
          className="bg-white rounded-t-[32px] shadow-[0_-12px_48px_rgba(0,0,0,0.12)] p-6 pb-safe max-h-[85vh] overflow-y-auto scrollbar-hide border-t border-[#c1c7d2]/10"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 24px)" }}
        >
          <div
            className="w-12 h-1.5 bg-[#c1c7d2]/50 rounded-full mx-auto mb-8 cursor-pointer"
            onClick={() => setIsModalOpen(false)}
          />

          {!isArmed ? (
            <div
              id="modal-content"
              className="animate-in fade-in slide-in-from-bottom-4 duration-500"
            >
              {/* Search Bar */}
              <div className="relative mb-8 z-50">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-[#f2f4f6] text-[#191c1e] rounded-2xl py-4 pl-12 pr-10 focus:outline-none focus:ring-2 focus:ring-[#3198F5] transition-all placeholder:text-gray-500"
                  placeholder="Where should we pick you up?"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#191c1e]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}

                {/* Search Results Dropdown */}
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#c1c7d2] rounded-xl shadow-2xl overflow-hidden">
                    {searchResults.map((res, i) => (
                      <button
                        key={i}
                        onClick={() => selectSearchResult(res)}
                        className="w-full text-left px-4 py-3 border-b border-[#f2f4f6] hover:bg-[#f2f4f6] flex items-center gap-3 text-[#191c1e]"
                      >
                        <MapPin className="w-4 h-4 text-[#3198F5]" />
                        <span className="truncate">{res.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Hotspots */}
              <h4 className="text-lg font-semibold text-[#191c1e] mb-4">
                Suggested Spots
              </h4>
              <div className="flex gap-4 overflow-x-auto pb-6 mb-4 scrollbar-hide">
                {PREDEFINED_HOTSPOTS.map((spot, idx) => (
                  <button
                    key={idx}
                    onClick={() =>
                      setSelectedSpot(
                        selectedSpot?.name === spot.name ? null : spot,
                      )
                    }
                    className="flex flex-col items-center gap-3 min-w-[90px] group"
                  >
                    <div
                      className={`w-14 h-14 rounded-[20px] flex items-center justify-center transition-all duration-300 ${selectedSpot?.name === spot.name ? "bg-[#3198F5] text-white shadow-lg" : "bg-[#f2f4f6] text-[#3198F5] group-hover:bg-[#e6e8ea]"}`}
                    >
                      <MapPin className="w-6 h-6 fill-current" />
                    </div>
                    <span
                      className={`text-[11px] font-bold tracking-wide text-center leading-tight ${selectedSpot?.name === spot.name ? "text-[#3198F5]" : "text-[#56656e]"}`}
                    >
                      {spot.name}
                    </span>
                  </button>
                ))}
              </div>

              <button
                onClick={handleArm}
                disabled={!selectedSpot || isArming}
                className={`w-full font-bold py-4 rounded-2xl shadow-lg active:scale-[0.98] transition-all text-[15px] ${selectedSpot ? "bg-[#3198F5] text-white" : "bg-[#e6e8ea] text-[#717782] cursor-not-allowed"}`}
              >
                {isArming
                  ? "Arming..."
                  : selectedSpot
                    ? `Arm Hotspot at ${selectedSpot.name}`
                    : "Select a location to arm"}
              </button>
            </div>
          ) : (
            <div
              id="armed-content"
              className="flex flex-col items-center py-6 animate-in fade-in zoom-in duration-500"
            >
              <div className="relative w-28 h-28 mb-8">
                <div className="absolute inset-0 rounded-full border-[6px] border-[#3198F5]/10" />
                <div className="absolute inset-0 rounded-full border-[6px] border-t-[#3198F5] animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center font-black text-[#3198F5] text-2xl tracking-widest">
                  {timeLeft > 0 ? formatTime(timeLeft) : "DONE"}
                </div>
              </div>
              <h3 className="text-2xl font-black text-[#3198F5] mb-2 tracking-tight">
                Searching for Ride
              </h3>
              <p className="text-[#56656e] text-[15px] mb-10">
                Pickup point:{" "}
                <span className="font-bold text-[#191c1e]">
                  {selectedSpot?.name}
                </span>
              </p>

              <button
                onClick={handleCancelArm}
                className="flex items-center justify-center w-full gap-2 text-[#ba1a1a] font-bold py-4 rounded-2xl bg-[#ba1a1a]/10 hover:bg-[#ba1a1a]/20 active:scale-[0.98] transition-transform"
              >
                <X className="w-5 h-5" strokeWidth={3} /> Cancel Hotspot
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Nav */}
      <nav
        className={`fixed bottom-0 w-full z-[25] flex justify-around rounded-t-2xl items-center px-4 h-[84px] bg-white/90 backdrop-blur-xl border-t border-[#c1c7d2]/30 transition-transform duration-300 ${isModalOpen ? "translate-y-full" : ""}`}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        onClick={handleClick}
      >
        <button
          className={`flex flex-col items-center gap-1 ${activePage ? "text-[#3198F5]" : "text-[#56656e]"}`}
          data-nav="map"
        >
          <div
            className={`${activePage ? "bg-[#3198F5]/10 px-6 py-1.5 rounded-2xl" : ""}`}
          >
            <MapPin
              className={`${activePage ? "w-5 h-5" : "w-6 h-6"}`}
              strokeWidth={activePage ? 2.5 : 2}
            />
          </div>
          <span
            className={`text-[10px] tracking-wide ${activePage ? "font-bold" : ""} ${activePage ? "" : "mt-0.5"}`}
          >
            Map
          </span>
        </button>
        <button
          className="flex flex-col items-center text-[#56656e] hover:text-[#191c1e] transition-colors gap-1"
          data-nav="activity"
        >
          <div>
            <History className="w-6 h-6" strokeWidth={2} />
          </div>
          <span className="text-[10px] tracking-wide mt-0.5">Activity</span>
        </button>
        <button
          className="flex flex-col items-center text-[#56656e] hover:text-[#191c1e] transition-colors gap-1"
          data-nav="wallet"
        >
          <div>
            <Wallet className="w-6 h-6" strokeWidth={2} />
          </div>
          <span className="text-[10px] tracking-wide mt-0.5">Wallet</span>
        </button>
        <button
          className="flex flex-col items-center text-[#56656e] hover:text-[#191c1e] transition-colors gap-1"
          data-nav="profile"
        >
          <div>
            <User className="w-6 h-6" strokeWidth={2} />
          </div>
          <span className="text-[10px] tracking-wide mt-0.5">Profile</span>
        </button>
      </nav>
    </div>
  );
}
