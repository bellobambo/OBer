import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import maplibregl from "maplibre-gl";
import { Eye, EyeOff, Settings2, Info, X } from "lucide-react";
import { toast } from "sonner";
import { DriverBottomNav } from "../components/DriverBottomNav";
import { BrandLogo } from "../components/BrandLogo";
import { fetchUserProfile, getActiveHotspots, updateDriverVisibility } from "../services/api";
import { useSocket } from "../contexts/SocketContext";

const DEFAULT_CENTER = [4.518, 7.52];
const DEFAULT_HOTSPOT_RADIUS_KM = 5;
const RANGE_OPTIONS_KM = [1, 3, 5, 10];
const MIN_SEARCH_RADIUS_KM = 1;
const MAX_SEARCH_RADIUS_KM = 50;

const DUMMY_HOTSPOTS = [
  { placeName: "Anglo-Moz Car Park", passengerCount: 12, coords: [4.5135, 7.5219] },
  { placeName: "Fajuyi Hall Car Park", passengerCount: 8, coords: [4.5186, 7.518] },
  { placeName: "Moremi Car Park", passengerCount: 15, coords: [4.5183, 7.5202] },
  { placeName: "OAU Health Centre", passengerCount: 5, coords: [4.5175, 7.522] },
  { placeName: "SUB Car Park", passengerCount: 20, coords: [4.5207, 7.5178] },
];

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

function normalizeRadius(value) {
  const radius = Number(value);
  if (!Number.isFinite(radius)) return DEFAULT_HOTSPOT_RADIUS_KM;
  return Math.min(MAX_SEARCH_RADIUS_KM, Math.max(MIN_SEARCH_RADIUS_KM, radius));
}

function getInitials(name) {
  return String(name || "Driver")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function normalizeCoords(hotspot) {
  return hotspot.coords || hotspot.coordinates || null;
}

function toHotspotKey(hotspot) {
  const coords = normalizeCoords(hotspot) || [];
  return `${hotspot.placeName || hotspot.name || ""}|${coords[0] ?? ""}|${coords[1] ?? ""}`;
}

function isWithinRadius(coords, originCoords, radiusInKm) {
  if (!originCoords) return true;
  return calculateDistanceInKm(originCoords, coords) <= radiusInKm;
}

function normalizeHotspots(hotspots, originCoords, radiusInKm) {
  const next = {};

  (hotspots || []).forEach((hotspot) => {
    const coords = normalizeCoords(hotspot);
    if (!coords) return;
    if (!isWithinRadius(coords, originCoords, radiusInKm)) return;

    next[toHotspotKey(hotspot)] = {
      ...hotspot,
      coords,
    };
  });

  return next;
}

export function DriverMap() {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const hotspotMarkersRef = useRef([]);
  const lastNearbyFetchRef = useRef(null);

  const routeLocation = useLocation();
  const navigate = useNavigate();
  const { socket, isDemoMode, setIsDemoMode } = useSocket();

  const [isOnline, setIsOnline] = useState(() => localStorage.getItem("driver_isOnline") === "true");
  const [liveHotspots, setLiveHotspots] = useState({});
  const [searchRadiusKm, setSearchRadiusKm] = useState(DEFAULT_HOTSPOT_RADIUS_KM);
  const [hotspotMode, setHotspotMode] = useState("nearby");
  const [isLoadingHotspots, setIsLoadingHotspots] = useState(false);
  const [isPassengerSearchVisible, setIsPassengerSearchVisible] = useState(true);
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [driverInitials, setDriverInitials] = useState("D");
  const [hotspotStatus, setHotspotStatus] = useState("Load nearby passengers or switch to all hotspots.");
  const [driverCoords, setDriverCoords] = useState(() => {
    if (
      typeof routeLocation.state?.lng === "number" &&
      typeof routeLocation.state?.lat === "number"
    ) {
      return [routeLocation.state.lng, routeLocation.state.lat];
    }

    return null;
  });

  function focusMapAt(coords) {
    if (!mapRef.current || !coords) return;
    mapRef.current.flyTo({ center: coords, zoom: 16.5, speed: 1.2 });
    setIsLegendOpen(false);
  }

  function focusFirstPassengerHotspot() {
    const hotspots = isDemoMode ? DUMMY_HOTSPOTS : Object.values(liveHotspots);
    const hotspot = hotspots[0];
    if (!hotspot) {
      toast.info("No active passenger hotspots are available in your selected range.");
      return;
    }

    focusMapAt(normalizeCoords(hotspot));
  }

  useEffect(() => {
    fetchUserProfile()
      .then((profile) => setDriverInitials(getInitials(profile?.fullName || profile?.full_name)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    if (!driverCoords) return;

    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLngLat(driverCoords);
    }
  }, [driverCoords]);

  async function loadHotspots(mode = hotspotMode) {
    if (isDemoMode) return;

    if (mode === "nearby" && !driverCoords) {
      setHotspotStatus("Turn on your location or go online to load nearby passengers.");
      return;
    }

    setIsLoadingHotspots(true);

    try {
      const response =
        mode === "all"
          ? await getActiveHotspots()
          : await getActiveHotspots(driverCoords[1], driverCoords[0], searchRadiusKm);

      const hotspots = normalizeHotspots(
        response.data?.hotspots,
        mode === "nearby" ? driverCoords : null,
        searchRadiusKm,
      );

      setHotspotMode(mode);
      setLiveHotspots(hotspots);

      const count = Object.keys(hotspots).length;
      setHotspotStatus(
        count > 0
          ? `${count} hotspot${count === 1 ? "" : "s"} loaded.`
          : mode === "all"
            ? "No active passenger hotspots right now."
            : `No active passengers within ${searchRadiusKm} km.`,
      );
    } catch (error) {
      toast.error(error.message || "Unable to load active hotspots.");
      setHotspotStatus("Unable to load hotspots right now.");
    } finally {
      setIsLoadingHotspots(false);
    }
  }

  useEffect(() => {
    if (isDemoMode) return;
    if (!driverCoords && hotspotMode === "nearby") return;

    loadHotspots(hotspotMode);
  }, [driverCoords, isDemoMode, searchRadiusKm]);

  useEffect(() => {
    if (!socket || isDemoMode) return;

    const handleSnapshot = (payload) => {
      const nextHotspots = normalizeHotspots(
        payload.hotspots,
        hotspotMode === "nearby" ? driverCoords : null,
        searchRadiusKm,
      );
      setLiveHotspots(nextHotspots);
    };

    const handleUpdated = (payload) => {
      const coords = normalizeCoords(payload);
      if (!coords) return;

      setLiveHotspots((prev) => {
        const next = { ...prev };
        const hotspotKey = toHotspotKey(payload);

        if (hotspotMode === "nearby" && !isWithinRadius(coords, driverCoords, searchRadiusKm)) {
          delete next[hotspotKey];
          return next;
        }

        next[hotspotKey] = { ...payload, coords };
        return next;
      });
    };

    const handleRemoved = (payload) => {
      setLiveHotspots((prev) => {
        const next = { ...prev };
        delete next[toHotspotKey(payload)];
        return next;
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
  }, [socket, isDemoMode, driverCoords, hotspotMode, searchRadiusKm]);

  useEffect(() => {
    if (mapRef.current) return;

    const initialCenter = driverCoords || DEFAULT_CENTER;
    mapRef.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://tiles.openfreemap.org/styles/bright",
      center: initialCenter,
      zoom: 15.5,
      attributionControl: false,
    });

    mapRef.current.on("load", () => {
      // Do not confuse built-in parking POIs with active passenger markers.
      mapRef.current.getStyle().layers?.forEach((layer) => {
        if (layer.type === "symbol" && /parking/i.test(layer.id)) {
          mapRef.current.setLayoutProperty(layer.id, "visibility", "none");
        }
      });
    });

    const el = document.createElement("div");
    el.className = "w-5 h-5 bg-[#3198F5] rounded-full border-[3px] border-white shadow-lg ring-4 ring-[#3198F5]/20";
    driverMarkerRef.current = new maplibregl.Marker({ element: el })
      .setLngLat(initialCenter)
      .addTo(mapRef.current);
  }, [driverCoords]);

  useEffect(() => {
    if (!mapRef.current) return;

    hotspotMarkersRef.current.forEach((marker) => marker.remove());
    hotspotMarkersRef.current = [];

    if (!isOnline) return;

    const spotsToRender = isDemoMode ? DUMMY_HOTSPOTS : Object.values(liveHotspots);

    spotsToRender.forEach((spot) => {
      const coords = normalizeCoords(spot);
      if (!coords) return;

      const el = document.createElement("div");
      el.className = "flex flex-col items-center pointer-events-none";
      el.innerHTML = `
        <div class="bg-white h-12 w-12 rounded-full shadow-lg border-[2px] flex items-center justify-center relative transition-transform duration-500 hover:scale-110" style="border-color: #00497d;">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00497d" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
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
        .addTo(mapRef.current);
      hotspotMarkersRef.current.push(marker);
    });
  }, [isOnline, isDemoMode, liveHotspots]);

  useEffect(() => {
    let watchId;

    if (isOnline && "geolocation" in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, heading } = position.coords;
          const nextCoords = [longitude, latitude];

          if (driverMarkerRef.current) {
            driverMarkerRef.current.setLngLat(nextCoords);
          }

          if (mapRef.current) {
            mapRef.current.easeTo({ center: nextCoords });
          }

          const lastFetchCoords = lastNearbyFetchRef.current;
          if (!lastFetchCoords || calculateDistanceInKm(lastFetchCoords, nextCoords) >= 0.2) {
            lastNearbyFetchRef.current = nextCoords;
            setDriverCoords(nextCoords);
          }

          if (!isDemoMode && socket) {
            socket.emit(
              "driver:location:update",
              { latitude, longitude, heading: heading || 0 },
              (response) => {
                if (response && !response.success) {
                  toast.error(response.message);
                }
              },
            );
          }
        },
        (error) => {
          console.error("GPS Error:", error);
          toast.error("Lost GPS signal.");
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 },
      );
    } else if (isOnline && !("geolocation" in navigator)) {
      toast.error("Geolocation is not supported by your browser");
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [isOnline, isDemoMode, socket]);

  const toggleStatus = async () => {
    try {
      if (isOnline) {
        if (!isDemoMode) {
          await updateDriverVisibility(false);
        }

        setIsOnline(false);
        localStorage.setItem("driver_isOnline", "false");
        toast.info("You are now offline.");
        return;
      }

      if (!isDemoMode) {
        if (!("geolocation" in navigator)) {
          throw new Error("Geolocation is not supported by your browser.");
        }

        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
          });
        });

        const { latitude, longitude, heading } = position.coords;
        const nextCoords = [longitude, latitude];
        setDriverCoords(nextCoords);
        lastNearbyFetchRef.current = nextCoords;

        const response = await updateDriverVisibility(
          true,
          latitude,
          longitude,
          heading || 0,
        );
        toast.success(response.message);
      } else {
        toast.success("Demo driver is now online.");
      }

      setIsOnline(true);
      localStorage.setItem("driver_isOnline", "true");
    } catch (error) {
      toast.error(error.message || "Unable to update your availability.");
    }
  };

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-[#f7f9fb] text-gray-900 font-sans">
      <div ref={mapContainer} className="absolute inset-0 w-full h-full z-0" />

      <header className="absolute top-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <BrandLogo />

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsLegendOpen(!isLegendOpen)}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-white text-gray-700 border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors"
            aria-label="Map Legend"
          >
            <Info className="w-4 h-4" />
          </button>

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
            onClick={() => navigate("/driver/profile")}
            className="w-9 h-9 rounded-full border-2 border-gray-200 bg-[#00497d] text-xs font-bold text-white hover:border-[#3198F5] transition-colors"
            aria-label="Open profile"
          >
            {driverInitials}
          </button>
        </div>
      </header>

      {isLegendOpen && (
        <div className="absolute top-20 right-4 z-[60] w-64 bg-white/95 backdrop-blur-md border border-gray-200 shadow-xl rounded-2xl p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-sm text-[#00497d]">Map Legend</h3>
            <button onClick={() => setIsLegendOpen(false)} className="text-gray-500 hover:text-gray-800">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            <button type="button" onClick={focusFirstPassengerHotspot} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-[#edf6ff]">
              <div className="bg-white h-8 w-8 rounded-full shadow-sm border flex items-center justify-center relative" style={{ borderColor: '#00497d' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00497d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <div className="absolute min-w-[12px] h-[12px] px-[2px] flex items-center justify-center text-[8px] font-bold rounded-full shadow-sm" style={{ backgroundColor: '#ba1a1a', color: 'white', border: '1px solid white', top: '-4px', right: '-4px' }}>3</div>
              </div>
              <span className="text-xs font-semibold text-gray-700">Passenger Hotspot<br/><span className="text-[10px] text-gray-500 font-normal">Go to the first active hotspot</span></span>
            </button>
            <button type="button" onClick={() => focusMapAt(driverCoords || DEFAULT_CENTER)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-[#edf6ff]">
              <div className="w-8 h-8 bg-[#3198F5] rounded-full border-[2px] border-white shadow-sm ring-2 ring-[#3198F5]/20" />
              <span className="text-xs font-semibold text-gray-700">Your Location</span>
            </button>
          </div>
        </div>
      )}

      <section className="absolute top-20 left-4 right-4 z-40 pointer-events-none">
        <div className="pointer-events-auto">
          {isPassengerSearchVisible ? (
          <div className="rounded-3xl border border-white/60 bg-white/88 p-4 shadow-lg backdrop-blur-md">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#00497d]">Passenger Search</p>
                <p className="mt-1 text-sm text-gray-600">{hotspotStatus}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-[#e8f2fb] px-3 py-1 text-sm font-bold text-[#00497d]">
                  {Object.keys(liveHotspots).length}
                </div>
                <button
                  type="button"
                  onClick={() => setIsPassengerSearchVisible(false)}
                  className="flex items-center gap-1.5 rounded-full border border-[#c9d7e6] bg-white px-3 py-1.5 text-xs font-bold text-black hover:bg-[#e8f2fb]"
                  aria-label="Hide passenger search"
                  title="Hide passenger search"
                >
                  <EyeOff className="h-4 w-4" />
                  Hide
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => loadHotspots("nearby")}
                disabled={isLoadingHotspots || (hotspotMode === "nearby" && !driverCoords && !isDemoMode)}
                className="rounded-full bg-[#00497d] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoadingHotspots && hotspotMode === "nearby" ? "Loading..." : "Nearby Passengers"}
              </button>
              <button
                type="button"
                onClick={() => loadHotspots("all")}
                disabled={isLoadingHotspots}
                className="rounded-full border border-[#c9d7e6] bg-white px-4 py-2 text-sm font-semibold text-[#00497d] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoadingHotspots && hotspotMode === "all" ? "Loading..." : "All Hotspots"}
              </button>
            </div>

            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Search Radius</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {RANGE_OPTIONS_KM.map((radius) => (
                  <button
                    key={radius}
                    type="button"
                    onClick={() => setSearchRadiusKm(radius)}
                    className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                      searchRadiusKm === radius
                        ? "bg-[#3198F5] text-white"
                        : "bg-[#eef3f8] text-[#4a5c6e]"
                    }`}
                  >
                    {radius} km
                  </button>
                ))}
                  <label className="flex items-center gap-2 rounded-full border border-[#c9d7e6] bg-white px-3 py-1.5 text-sm font-semibold text-[#4a5c6e]">
                    <span className="sr-only">Custom passenger search radius in kilometres</span>
                    <input
                      type="number"
                      min={MIN_SEARCH_RADIUS_KM}
                      max={MAX_SEARCH_RADIUS_KM}
                      step="1"
                      value={searchRadiusKm}
                      onChange={(event) => setSearchRadiusKm(normalizeRadius(event.target.value))}
                      className="w-9 bg-transparent text-right outline-none"
                      aria-label="Custom passenger search radius in kilometres"
                    />
                    <span>km</span>
                  </label>
              </div>
              <p className="mt-2 text-xs text-gray-500">Choose any range from 1 to 50 km.</p>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsPassengerSearchVisible(true)}
            className="flex items-center gap-2 rounded-full border border-white/60 bg-white/88 px-4 py-2.5 text-sm font-semibold text-black shadow-lg backdrop-blur-md"
          >
            <Eye className="h-4 w-4" />
            Show Passenger Search
          </button>
        )}
        </div>
      </section>

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

      <DriverBottomNav activePage="map" />
    </div>
  );
}
