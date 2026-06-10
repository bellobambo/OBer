import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Car, Map as MapIcon, History, Wallet, User, Search, X, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useDummyDrivers } from "../hooks/useDummyDrivers";

const OAU_BOUNDS = [
  [4.50, 7.50], // Southwest
  [4.55, 7.54]  // Northeast
];
const OAU_CENTER = [4.524, 7.521];

const PREDEFINED_HOTSPOTS = [
  { name: "Angola Hall", coords: [4.524, 7.518] },
  { name: "OAU Health Center", coords: [4.521, 7.525] },
  { name: "Faculty of Tech", coords: [4.528, 7.522] },
];

export function PassengerMap() {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const selectedSpotMarkerRef = useRef(null);
  const driverMarkersRef = useRef(new Map());
  const location = useLocation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isArmed, setIsArmed] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  
  const [selectedSpot, setSelectedSpot] = useState(PREDEFINED_HOTSPOTS[0]);
  const [timeLeft, setTimeLeft] = useState(300);

  const activeDrivers = useDummyDrivers(selectedSpot?.coords, !!selectedSpot);

  // Map Initialization
  useEffect(() => {
    if (mapRef.current) return;
    
    let initialCenter = OAU_CENTER;
    if (location.state?.lat && location.state?.lng) {
      const { lat, lng } = location.state;
      if (lng >= OAU_BOUNDS[0][0] && lng <= OAU_BOUNDS[1][0] && lat >= OAU_BOUNDS[0][1] && lat <= OAU_BOUNDS[1][1]) {
        initialCenter = [lng, lat];
      }
    }

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://tiles.openfreemap.org/styles/bright", // Switched back to Bright mode!
      center: initialCenter,
      zoom: 15.5,
      maxBounds: OAU_BOUNDS,
      attributionControl: false,
    });
    mapRef.current = map;

    map.on("load", () => {
      // User Marker
      const userEl = document.createElement("div");
      userEl.className = "w-5 h-5 bg-[#3198F5] rounded-full border-[3px] border-white shadow-lg ring-4 ring-[#3198F5]/20";
      new maplibregl.Marker({ element: userEl }).setLngLat(initialCenter).addTo(map);
    });
  }, [location.state]);

  // Handle Map FlyTo and Marker when selectedSpot changes
  useEffect(() => {
    if (selectedSpot?.coords && mapRef.current) {
      mapRef.current.flyTo({ center: selectedSpot.coords, zoom: 16.5, speed: 1.2 });
      
      if (!selectedSpotMarkerRef.current) {
        const el = document.createElement("div");
        el.className = "w-10 h-10 flex items-center justify-center text-[#3198F5] drop-shadow-xl -translate-y-5 transition-transform duration-300";
        el.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" /></svg>';
        selectedSpotMarkerRef.current = new maplibregl.Marker({ element: el, anchor: "bottom" })
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
      } else {
        const el = document.createElement("div");
        // The CSS transition-transform handles the smooth animation!
        el.className = "w-10 h-10 bg-white shadow-xl rounded-full flex items-center justify-center border-2 border-[#3198F5] text-[#3198F5] transition-transform duration-1000 ease-linear";
        el.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a2 2 0 0 0-1.6-.8H9.3a2 2 0 0 0-1.6.8L5 11l-5.16.86a1 1 0 0 0-.84.99V16h3m10 0a2 2 0 1 1-4 0m4 0a2 2 0 1 0-4 0m-10 0a2 2 0 1 1-4 0m4 0a2 2 0 1 0-4 0"/></svg>';
        
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat(d.coords)
          .addTo(mapRef.current);
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
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=5`);
        const data = await res.json();
        const valid = data.filter(d => {
            const lat = parseFloat(d.lat);
            const lon = parseFloat(d.lon);
            return lon >= OAU_BOUNDS[0][0] && lon <= OAU_BOUNDS[1][0] && lat >= OAU_BOUNDS[0][1] && lat <= OAU_BOUNDS[1][1];
        }).map(d => ({
          name: d.display_name.split(",")[0],
          coords: [parseFloat(d.lon), parseFloat(d.lat)]
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
      setIsArmed(false); // Cancel automatically when done
    }
    return () => clearInterval(timerId);
  }, [isArmed, timeLeft]);

  const handleArm = () => {
    setIsArmed(true);
    setTimeLeft(300);
  };

  const handleCancelArm = () => {
    setIsArmed(false);
    setTimeLeft(300);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m < 10 ? "0" + m : m}:${s < 10 ? "0" + s : s}`;
  };

  const selectSearchResult = (result) => {
    setSelectedSpot(result);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      if (searchResults.length > 0) {
        selectSearchResult(searchResults[0]);
      } else if (searchQuery) {
        toast.error(`No campus results found for "${searchQuery}"`);
      }
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
          <span className="text-2xl font-bold tracking-tight text-[#3198F5]">Ber</span>
        </div>
        <div className="w-9 h-9 rounded-full overflow-hidden border border-[#c1c7d2]">
          <img alt="Profile" className="w-full h-full object-cover" src="https://ui-avatars.com/api/?name=User&background=3198F5&color=fff" />
        </div>
      </header>

      {/* FAB */}
      <div className={`fixed bottom-28 left-1/2 -translate-x-1/2 z-[30] transition-all duration-300 ${isModalOpen ? "opacity-0 pointer-events-none translate-y-10" : ""}`}>
        <button onClick={() => setIsModalOpen(true)} className="flex flex-col items-center gap-3">
          <div className="w-[72px] h-[72px] text-white rounded-full flex items-center justify-center azure-glow">
            <Car className="w-8 h-8" strokeWidth={2.5} />
          </div>
          <div className="bg-white shadow-lg px-6 py-2.5 rounded-full border border-[#c1c7d2]">
            <span className="text-[#3198F5] font-bold text-sm tracking-wide">I Need a Ride</span>
          </div>
        </button>
      </div>

      {/* Modal Overlay */}
      <div 
        className={`fixed inset-0 bg-black/20 z-[35] transition-opacity duration-300 ${isModalOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`} 
        onClick={() => setIsModalOpen(false)}
      />

      {/* Bottom Sheet Modal */}
      <div className={`fixed bottom-0 left-0 right-0 z-[40] transition-transform duration-300 ${isModalOpen ? "translate-y-0" : "translate-y-full"}`}>
        <div className="bg-white rounded-t-[32px] shadow-[0_-12px_48px_rgba(0,0,0,0.12)] p-6 pb-safe max-h-[85vh] overflow-y-auto scrollbar-hide border-t border-[#c1c7d2]/10" style={{ paddingBottom: "env(safe-area-inset-bottom, 24px)" }}>
          <div className="w-12 h-1.5 bg-[#c1c7d2]/50 rounded-full mx-auto mb-8 cursor-pointer" onClick={() => setIsModalOpen(false)} />
          
          {!isArmed ? (
            <div id="modal-content" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Search Bar */}
              <div className="relative mb-8 z-50">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-[#f2f4f6] text-[#191c1e] rounded-2xl py-4 pl-12 pr-10 focus:outline-none focus:ring-2 focus:ring-[#3198F5] transition-all placeholder:text-gray-500" 
                  placeholder="Where should we pick you up?"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#191c1e]">
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
              <h4 className="text-lg font-semibold text-[#191c1e] mb-4">Suggested Spots</h4>
              <div className="flex gap-4 overflow-x-auto pb-6 mb-4 scrollbar-hide">
                {PREDEFINED_HOTSPOTS.map((spot, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setSelectedSpot(selectedSpot?.name === spot.name ? null : spot)}
                    className="flex flex-col items-center gap-3 min-w-[90px] group"
                  >
                    <div className={`w-14 h-14 rounded-[20px] flex items-center justify-center transition-all duration-300 ${selectedSpot?.name === spot.name ? "bg-[#3198F5] text-white shadow-lg" : "bg-[#f2f4f6] text-[#3198F5] group-hover:bg-[#e6e8ea]"}`}>
                      <MapPin className="w-6 h-6" />
                    </div>
                    <span className={`text-[11px] font-bold tracking-wide text-center leading-tight ${selectedSpot?.name === spot.name ? "text-[#3198F5]" : "text-[#56656e]"}`}>{spot.name}</span>
                  </button>
                ))}
              </div>
              
              <button 
                onClick={handleArm}
                disabled={!selectedSpot}
                className={`w-full font-bold py-4 rounded-2xl shadow-lg active:scale-[0.98] transition-all text-[15px] ${selectedSpot ? "bg-[#3198F5] text-white" : "bg-[#e6e8ea] text-[#717782] cursor-not-allowed"}`}
              >
                {selectedSpot ? `Arm Hotspot at ${selectedSpot.name}` : "Select a location to arm"}
              </button>
            </div>
          ) : (
            <div id="armed-content" className="flex flex-col items-center py-6 animate-in fade-in zoom-in duration-500">
              <div className="relative w-28 h-28 mb-8">
                <div className="absolute inset-0 rounded-full border-[6px] border-[#3198F5]/10" />
                <div className="absolute inset-0 rounded-full border-[6px] border-t-[#3198F5] animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center font-black text-[#3198F5] text-2xl tracking-widest">
                  {timeLeft > 0 ? formatTime(timeLeft) : "DONE"}
                </div>
              </div>
              <h3 className="text-2xl font-black text-[#3198F5] mb-2 tracking-tight">Searching for Ride</h3>
              <p className="text-[#56656e] text-[15px] mb-10">Pickup point: <span className="font-bold text-[#191c1e]">{selectedSpot?.name}</span></p>
              
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
      <nav className={`fixed bottom-0 w-full z-[25] flex justify-around items-center px-4 h-[84px] bg-white/90 backdrop-blur-xl border-t border-[#c1c7d2]/30 transition-transform duration-300 ${isModalOpen ? "translate-y-full" : ""}`} style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <button className="flex flex-col items-center text-[#3198F5] gap-1">
          <div className="bg-[#3198F5]/10 px-6 py-1.5 rounded-2xl">
            <MapIcon className="w-5 h-5" strokeWidth={2.5} />
          </div>
          <span className="text-[10px] font-bold tracking-wide">Map</span>
        </button>
        <button className="flex flex-col items-center text-[#56656e] hover:text-[#191c1e] transition-colors gap-1">
          <History className="w-6 h-6" strokeWidth={2} />
          <span className="text-[10px] tracking-wide mt-0.5">Activity</span>
        </button>
        <button className="flex flex-col items-center text-[#56656e] hover:text-[#191c1e] transition-colors gap-1">
          <Wallet className="w-6 h-6" strokeWidth={2} />
          <span className="text-[10px] tracking-wide mt-0.5">Wallet</span>
        </button>
        <button className="flex flex-col items-center text-[#56656e] hover:text-[#191c1e] transition-colors gap-1">
          <User className="w-6 h-6" strokeWidth={2} />
          <span className="text-[10px] tracking-wide mt-0.5">Profile</span>
        </button>
      </nav>
    </div>
  );
}
