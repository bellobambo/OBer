import { useState, useEffect } from "react";

// Helper to generate a random coordinate near a center within a given radius
function getRandomNearby(centerLng, centerLat, radiusDegrees = 0.005) {
  const angle = Math.random() * Math.PI * 2;
  const dist = Math.random() * radiusDegrees;
  return [
    centerLng + Math.cos(angle) * dist,
    centerLat + Math.sin(angle) * dist
  ];
}

export function useDummyDrivers(centerCoords, isActive) {
  const [drivers, setDrivers] = useState([]);

  useEffect(() => {
    if (!centerCoords || !isActive) {
      setDrivers([]);
      return;
    }

    // Generate 3 to 6 initial drivers around the selected location
    const numDrivers = Math.floor(Math.random() * 4) + 3; 
    const initialDrivers = Array.from({ length: numDrivers }).map((_, i) => {
      // Start them somewhere around the user (e.g. 0.008 degrees ~ 800m away)
      const start = getRandomNearby(centerCoords[0], centerCoords[1], 0.006);
      
      // Determine if they are approaching or driving away
      const isApproaching = Math.random() > 0.4; // 60% chance approaching
      
      // Calculate a rough direction vector towards the center
      const dx = centerCoords[0] - start[0];
      const dy = centerCoords[1] - start[1];
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      const dirX = (dx / dist) * (isApproaching ? 1 : -1);
      const dirY = (dy / dist) * (isApproaching ? 1 : -1);

      return {
        id: `driver_${i}_${Date.now()}`,
        coords: start,
        // Speed factor roughly equivalent to moving down a street
        dirX: dirX * 0.00015, 
        dirY: dirY * 0.00015
      };
    });

    setDrivers(initialDrivers);

    // Animate drivers every 1 second
    const interval = setInterval(() => {
      setDrivers(prev => prev.map(d => {
        // Add a tiny bit of random jitter so they don't move in perfectly straight lines
        const jitterX = (Math.random() - 0.5) * 0.00005;
        const jitterY = (Math.random() - 0.5) * 0.00005;
        
        return {
          ...d,
          coords: [d.coords[0] + d.dirX + jitterX, d.coords[1] + d.dirY + jitterY]
        };
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [centerCoords, isActive]);

  return drivers;
}
