import { useState, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Search, X, Settings2, Car, MapPin } from "lucide-react";
import { toast } from "sonner";
import { BottomNav } from "../components/BottomNav";
import { BrandLogo } from "../components/BrandLogo";
import { useDummyDrivers } from "../hooks/useDummyDrivers";
import { armHotspot, disarmHotspot, fetchUserProfile, getNearbyDrivers } from "../services/api";
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

const DEFAULT_DRIVER_RADIUS_KM = 5;
const RANGE_OPTIONS_KM = [1, 3, 5, 10];
const MIN_SEARCH_RADIUS_KM = 1;
const MAX_SEARCH_RADIUS_KM = 50;

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function calculateDistanceInKm(fromCoords, toCoords) {
  if (!fromCoords || !toCoords) return Number.POSITIVE_INFINITY;

  const [fromLongitude, fromLatitude] = fromCoords;
  const [toLongitude, toLatitude] = toCoords;
  const earthRadiusInKm = 6371;
  const latitudeDelta = toRadians(toLatitude - fromLatitude);
  const longitudeDelta = toRadians(toLongitude - fromLongitude);
  const originLatitude = toRadians(fromLatitude);
  const targetLatitude = toRadians(toLatitude);

  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(originLatitude) *
      Math.cos(targetLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return earthRadiusInKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getInitials(name) {
  return String(name || "User")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function normalizeRadius(value) {
  const radius = Number(value);
  if (!Number.isFinite(radius)) return DEFAULT_DRIVER_RADIUS_KM;
  return Math.min(MAX_SEARCH_RADIUS_KM, Math.max(MIN_SEARCH_RADIUS_KM, radius));
}

async function getCurrentLocationName(latitude, longitude) {
  try {
    const query = new URLSearchParams({
      lat: String(latitude),
      lon: String(longitude),
      format: "json",
      zoom: "18",
    });
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${query}`);
    if (!response.ok) throw new Error("Unable to identify current location.");

    const place = await response.json();
    const address = place.address || {};
    return (
      place.name ||
      address.amenity ||
      address.building ||
      address.road ||
      place.display_name?.split(",").slice(0, 2).join(",").trim() ||
      "Current location"
    );
  } catch {
    return "Current location";
  }
}

export function PassengerMap() {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const selectedSpotMarkerRef = useRef(null);
  const driverMarkersRef = useRef(new Map());
  const location = useLocation();
  const hasStoredHotspot = localStorage.getItem("passenger_isArmed") === "true";

  const [isModalOpen, setIsModalOpen] = useState(hasStoredHotspot);
  const [isArmed, setIsArmed] = useState(() => hasStoredHotspot);
  const [hotspotId, setHotspotId] = useState(() => localStorage.getItem("passenger_hotspotId") || null);
  const [isArming, setIsArming] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedSpot, setSelectedSpot] = useState(() => {
    const saved = localStorage.getItem("passenger_selectedSpot");
    return saved ? JSON.parse(saved) : PREDEFINED_HOTSPOTS[0];
  });
  const [timeLeft, setTimeLeft] = useState(() => {
    const expiresAt = localStorage.getItem("passenger_hotspotExpiresAt");
    if (!expiresAt) return 300;

    const remaining = Math.max(
      0,
      Math.floor((Number.parseInt(expiresAt, 10) - Date.now()) / 1000)
    );

    return remaining;
  });

  // Clear expired hotspot on mount
  useEffect(() => {
    if (isArmed && timeLeft === 0) {
      handleCancelArm();
    }
  }, []);

  const { socket, isDemoMode, setIsDemoMode } = useSocket();
  const dummyDrivers = useDummyDrivers(selectedSpot?.coords, !!selectedSpot);
  const [liveDrivers, setLiveDrivers] = useState({});
  const [driverRadiusKm, setDriverRadiusKm] = useState(DEFAULT_DRIVER_RADIUS_KM);
  const [isLoadingDrivers, setIsLoadingDrivers] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [userInitials, setUserInitials] = useState("U");
  const [driverStatus, setDriverStatus] = useState("Check nearby drivers around your pickup point.");
  const queryOrigin = useMemo(
    () =>
      location.state?.lat && location.state?.lng
        ? [location.state.lng, location.state.lat]
        : selectedSpot?.coords || OAU_CENTER,
    [location.state?.lat, location.state?.lng, selectedSpot],
  );

  useEffect(() => {
    fetchUserProfile()
      .then((profile) => setUserInitials(getInitials(profile?.fullName || profile?.full_name)))
      .catch(() => {});
  }, []);

  function focusMapOnDrivers(origin, drivers) {
    if (!mapRef.current || !origin || drivers.length === 0) return;

    const bounds = drivers.reduce(
      (nextBounds, driver) => nextBounds.extend(driver.coords),
      new maplibregl.LngLatBounds(origin, origin),
    );

    mapRef.current.fitBounds(bounds, {
      padding: { top: 110, right: 56, bottom: 190, left: 56 },
      maxZoom: 16,
      duration: 700,
    });
  }

  async function loadNearbyDrivers({ origin = queryOrigin, announce = false } = {}) {
    if (isDemoMode || !origin) return;

    setIsLoadingDrivers(true);

    try {
      const [longitude, latitude] = origin;
      const response = await getNearbyDrivers(latitude, longitude, driverRadiusKm);
      const drivers = {};
      (response.data?.drivers || []).forEach((driver) => {
        const id = driver.driver_id ?? driver.driverId;
        drivers[id] = {
          id,
          coords: [Number(driver.longitude), Number(driver.latitude)],
          heading: driver.heading,
        };
      });

      setLiveDrivers(drivers);
      const count = Object.keys(drivers).length;
      const foundDrivers = Object.values(drivers);
      setDriverStatus(
        count > 0
          ? `${count} driver${count === 1 ? "" : "s"} found nearby.`
          : `No active drivers within ${driverRadiusKm} km.`,
      );
      if (announce) {
        if (count > 0) {
          toast.success(`${count} active driver${count === 1 ? "" : "s"} found within ${driverRadiusKm} km.`);
          focusMapOnDrivers(origin, foundDrivers);
          setIsModalOpen(false);
        } else {
          toast.info(`No active drivers within ${driverRadiusKm} km.`);
        }
      }
    } catch (error) {
      toast.error(error.message);
      setDriverStatus("Unable to load nearby drivers right now.");
    } finally {
      setIsLoadingDrivers(false);
    }
  }

  useEffect(() => {
    if (!socket || isDemoMode) return;

    const handleLocationUpdate = (payload) => {
      const nextCoords = [payload.longitude, payload.latitude];

      setLiveDrivers((prev) => {
        if (!payload.isVisible) {
          const copy = { ...prev };
          delete copy[payload.driverId];
          return copy;
        }

        if (queryOrigin && calculateDistanceInKm(queryOrigin, nextCoords) > driverRadiusKm) {
          const copy = { ...prev };
          delete copy[payload.driverId];
          return copy;
        }

        return {
          ...prev,
          [payload.driverId]: {
            id: payload.driverId,
            coords: nextCoords,
            heading: payload.heading,
          },
        };
      });
    };

    socket.on("driver:location", handleLocationUpdate);
    socket.on("driver:visibility", handleLocationUpdate);

    return () => {
      socket.off("driver:location", handleLocationUpdate);
      socket.off("driver:visibility", handleLocationUpdate);
    };
  }, [socket, isDemoMode, queryOrigin, driverRadiusKm]);

  const activeDrivers = isDemoMode ? dummyDrivers : Object.values(liveDrivers);

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

  useEffect(() => {
    if (isArmed) {
      setIsModalOpen(true);
    }
  }, [isArmed]);

  const handleArm = async (spot = selectedSpot) => {
    if (!spot) return;
    setIsArming(true);
    try {
      setSelectedSpot(spot);
      const data = await armHotspot(spot.name, spot.coords);
      const newHotspotId = data.data?.hotspotId || data.hotspotId || data.data?.hotspot?.id;
      setHotspotId(newHotspotId);
      setIsArmed(true);
      setIsModalOpen(true);
      setTimeLeft(300);
      
      localStorage.setItem("passenger_isArmed", "true");
      if (newHotspotId) localStorage.setItem("passenger_hotspotId", newHotspotId);
      localStorage.setItem("passenger_selectedSpot", JSON.stringify(spot));
      localStorage.setItem("passenger_hotspotExpiresAt", Date.now() + 300 * 1000);

      toast.success(data.message);
    } catch (e) {
      toast.error(e.message || "Failed to arm hotspot");
    } finally {
      setIsArming(false);
    }
  };

  async function handleCancelArm() {
    if (hotspotId) {
      try {
        const response = await disarmHotspot(hotspotId);
        toast.success(response.message);
      } catch (e) {
        toast.error(e.message || "Unable to disarm hotspot");
      }
    }
    setHotspotId(null);
    setIsArmed(false);
    setTimeLeft(300);
    
    localStorage.removeItem("passenger_isArmed");
    localStorage.removeItem("passenger_hotspotId");
    localStorage.removeItem("passenger_selectedSpot");
    localStorage.removeItem("passenger_hotspotExpiresAt");
  }

  const formatTime = seconds => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m < 10 ? "0" + m : m}:${s < 10 ? "0" + s : s}`;
  };

  const selectSearchResult = result => {
    setSelectedSpot(result);
    setSearchQuery("");
    setSearchResults([]);
    loadNearbyDrivers({ origin: result.coords, announce: true });
    if (!isArmed) {
      handleArm(result);
    }
  };

  const useCurrentLocation = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const locationName = await getCurrentLocationName(coords.latitude, coords.longitude);
        const spot = {
          name: locationName,
          coords: [coords.longitude, coords.latitude],
          isCurrentLocation: true,
        };
        setSelectedSpot(spot);
        setIsLocating(false);
        loadNearbyDrivers({ origin: spot.coords, announce: true });
        if (!isArmed) {
          handleArm(spot);
        }
      },
      (error) => {
        setIsLocating(false);
        toast.error(error.message || "Unable to get your current location.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
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
        <BrandLogo />
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
          <button
            type="button"
            onClick={() => navigate("/passenger/profile")}
            className="w-9 h-9 rounded-full border border-[#c1c7d2] bg-[#3198F5] text-xs font-bold text-white hover:opacity-80 transition-opacity"
            aria-label="Open profile"
          >
            {userInitials}
          </button>
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
          {isArmed ? (
            <div className="bg-white shadow-lg px-4 py-3 rounded-[22px] border border-[#c1c7d2] min-w-[190px]">
              <div className="flex items-center justify-between gap-3">
                <div className="text-left">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#3198F5]">
                    Hotspot Active
                  </p>
                  <p className="text-2xl font-black tracking-wider text-[#191c1e] mt-1">
                    {formatTime(timeLeft)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleCancelArm();
                  }}
                  className="h-10 w-10 rounded-full bg-[#ba1a1a]/10 text-[#ba1a1a] flex items-center justify-center hover:bg-[#ba1a1a]/20 transition-colors"
                  aria-label="Cancel hotspot"
                >
                  <X className="w-4 h-4" strokeWidth={3} />
                </button>
              </div>
            </div>
          ) : (
            <div className="w-[72px] h-[72px] text-white rounded-full flex items-center justify-center azure-glow">
              <Car className="w-8 h-8" strokeWidth={2.5} />
            </div>
          )}
          <div className="bg-white shadow-lg px-6 py-2.5 rounded-full border border-[#c1c7d2]">
            <span className="text-[#3198F5] font-bold text-sm tracking-wide">
              {isArmed ? "View Hotspot" : "I Need a Ride"}
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

          <div className="mb-6 rounded-[28px] border border-[#d5e0ea] bg-[#f8fbfe] p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7a8a96]">Search Radius</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {RANGE_OPTIONS_KM.map((radius) => (
                  <button
                    key={radius}
                    type="button"
                    onClick={() => setDriverRadiusKm(radius)}
                    className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                      driverRadiusKm === radius
                        ? "bg-[#3198F5] text-white"
                        : "bg-white text-[#56656e] border border-[#d5e0ea]"
                    }`}
                  >
                    {radius} km
                  </button>
                ))}
                <label className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-[#56656e] border border-[#d5e0ea]">
                  <span className="sr-only">Custom driver search radius in kilometres</span>
                  <input
                    type="number"
                    min={MIN_SEARCH_RADIUS_KM}
                    max={MAX_SEARCH_RADIUS_KM}
                    step="1"
                    value={driverRadiusKm}
                    onChange={(event) => setDriverRadiusKm(normalizeRadius(event.target.value))}
                    className="w-9 bg-transparent text-right outline-none"
                    aria-label="Custom driver search radius in kilometres"
                  />
                  <span>km</span>
                </label>
              </div>
              <p className="mt-2 text-xs text-[#7a8a96]">Choose any range from 1 to 50 km.</p>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#d5e0ea] pt-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#3198F5]">Driver Search</p>
                <p className="mt-1 text-sm text-[#56656e]">{driverStatus}</p>
              </div>
              <div className="rounded-full bg-white px-3 py-1 text-sm font-bold text-[#3198F5] shadow-sm">
                {activeDrivers.length}
              </div>
            </div>

            <button
              type="button"
              onClick={() => loadNearbyDrivers({ announce: true })}
              disabled={isLoadingDrivers || isDemoMode}
              className="mt-4 rounded-full bg-[#3198F5] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoadingDrivers ? "Checking..." : "Find Nearby Drivers"}
            </button>
          </div>

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
                <button
                  type="button"
                  onClick={useCurrentLocation}
                  disabled={isLocating}
                  className={`shrink-0 w-44 p-4 rounded-2xl border-2 border-dashed text-left transition-colors disabled:cursor-wait disabled:opacity-60 ${
                    selectedSpot?.isCurrentLocation
                      ? "border-[#3198F5] bg-[#dcedff]"
                      : "border-[#3198F5]/40 bg-[#eff7ff] hover:bg-[#e2f1ff]"
                  }`}
                >
                  <MapPin className="w-6 h-6 text-[#3198F5] mb-8" />
                  <p className="font-bold text-[#191c1e]">{isLocating ? "Locating..." : "Use my location"}</p>
                  <p className="text-xs text-[#56656e] mt-1">
                    {selectedSpot?.isCurrentLocation
                      ? `Pickup point: ${selectedSpot.name}`
                      : "Set your pickup point"}
                  </p>
                </button>
                {PREDEFINED_HOTSPOTS.map((spot, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      const nextSpot =
                        selectedSpot?.name === spot.name ? null : spot;
                      setSelectedSpot(nextSpot);
                      if (nextSpot && !isArmed) {
                        handleArm(nextSpot);
                      }
                    }}
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
      <BottomNav activePage="map" />
    </div>
  );
}
