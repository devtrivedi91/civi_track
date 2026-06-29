import { useEffect, useRef, useState } from "react";
import { Issue } from "../types";

// Declare global Leaflet since we loaded it via CDN to avoid bundler issues
declare const L: any;

interface InteractiveMapProps {
  issues: Issue[];
  selectedIssueId?: string | null;
  onSelectIssue?: (issueId: string) => void;
  selectable?: boolean;
  onLocationSelect?: (lat: number, lng: number, address: string, areaName: string) => void;
  defaultCenter?: [number, number];
  defaultZoom?: number;
  showHeatmap?: boolean;
}

export default function InteractiveMap({
  issues,
  selectedIssueId,
  onSelectIssue,
  selectable = false,
  onLocationSelect,
  defaultCenter = [19.0760, 72.8777], // default to Mumbai, India (highly urbanized)
  defaultZoom = 13,
  showHeatmap = false
}: InteractiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersGroupRef = useRef<any>(null);
  const heatCirclesGroupRef = useRef<any>(null);
  const clickMarkerRef = useRef<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Auto-detect user location
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 15);
        }

        if (selectable && onLocationSelect) {
          // Reverse geocode using OpenStreetMap Nominatim
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
            const data = await res.json();
            const address = data.display_name || `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`;
            const areaName = data.address?.suburb || data.address?.neighbourhood || data.address?.quarter || data.address?.city_district || "Local Ward";
            
            // Set placement marker
            if (mapInstanceRef.current) {
              if (clickMarkerRef.current) {
                clickMarkerRef.current.setLatLng([latitude, longitude]);
              } else {
                clickMarkerRef.current = L.marker([latitude, longitude], {
                  draggable: true,
                  icon: L.divIcon({
                    className: "custom-div-icon",
                    html: `<div class="w-8 h-8 bg-indigo-600 rounded-full border-2 border-white flex items-center justify-center shadow-lg animate-pulse">
                            <div class="w-3 h-3 bg-white rounded-full"></div>
                           </div>`,
                    iconSize: [32, 32],
                    iconAnchor: [16, 16]
                  })
                }).addTo(mapInstanceRef.current);

                clickMarkerRef.current.on("dragend", async (e: any) => {
                  const newLatLng = e.target.getLatLng();
                  await reverseGeocode(newLatLng.lat, newLatLng.lng);
                });
              }
            }

            onLocationSelect(latitude, longitude, address, areaName);
          } catch (e) {
            onLocationSelect(latitude, longitude, `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`, "Detected Area");
          }
        }
      },
      (err) => {
        setErrorMsg("Failed to retrieve location. Please grant permission.");
        console.error(err);
      }
    );
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    if (onLocationSelect) {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
        const data = await res.json();
        const address = data.display_name || `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
        const areaName = data.address?.suburb || data.address?.neighbourhood || data.address?.quarter || data.address?.city_district || "Local Ward";
        onLocationSelect(lat, lng, address, areaName);
      } catch (err) {
        onLocationSelect(lat, lng, `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`, "Selected Area");
      }
    }
  };

  // SVG color indicators for severity/category
  const getMarkerIcon = (category: string, severity: string, isSelected: boolean) => {
    let color = "#6366f1"; // Indigo default
    switch (severity) {
      case "Critical": color = "#ef4444"; break; // Red
      case "High": color = "#f97316"; break; // Orange
      case "Medium": color = "#eab308"; break; // Yellow
      case "Low": color = "#22c55e"; break; // Green
    }

    const scaleClass = isSelected ? "scale-125 z-50 ring-4 ring-indigo-400" : "hover:scale-110";

    return L.divIcon({
      className: "custom-div-icon",
      html: `<div class="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center shadow-md transition-all duration-300 ${scaleClass}" style="background-color: ${color}">
              <span class="text-white text-xs font-bold">${category.substring(0,2).toUpperCase()}</span>
             </div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
  };

  // Primary map setup
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Check if L is loaded
    if (typeof L === "undefined") {
      setErrorMsg("Leaflet map library could not be loaded. Please refresh the page.");
      return;
    }

    // Initialize map
    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: defaultZoom,
      zoomControl: true,
      scrollWheelZoom: true
    });

    // Load beautiful, clean modern map tiles from CartoDB Voyager
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 20
    }).addTo(map);

    mapInstanceRef.current = map;
    markersGroupRef.current = L.layerGroup().addTo(map);
    heatCirclesGroupRef.current = L.layerGroup().addTo(map);

    // If selectable setup map clicks
    if (selectable) {
      map.on("click", async (e: any) => {
        const { lat, lng } = e.latlng;
        
        if (clickMarkerRef.current) {
          clickMarkerRef.current.setLatLng([lat, lng]);
        } else {
          clickMarkerRef.current = L.marker([lat, lng], {
            draggable: true,
            icon: L.divIcon({
              className: "custom-div-icon",
              html: `<div class="w-8 h-8 bg-indigo-600 rounded-full border-2 border-white flex items-center justify-center shadow-lg">
                      <div class="w-3 h-3 bg-white rounded-full"></div>
                     </div>`,
              iconSize: [32, 32],
              iconAnchor: [16, 16]
            })
          }).addTo(map);

          clickMarkerRef.current.on("dragend", async (dragEvent: any) => {
            const dragLatLng = dragEvent.target.getLatLng();
            await reverseGeocode(dragLatLng.lat, dragLatLng.lng);
          });
        }

        await reverseGeocode(lat, lng);
      });
    }

    return () => {
      map.remove();
    };
  }, [selectable]);

  // Update Markers when issues or selectedIssueId changes
  useEffect(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current) return;

    markersGroupRef.current.clearLayers();
    heatCirclesGroupRef.current.clearLayers();

    // Plot issues markers
    issues.forEach((issue) => {
      if (!issue.location || isNaN(issue.location.lat) || isNaN(issue.location.lng)) return;

      const isSelected = selectedIssueId === issue.issueId;
      const marker = L.marker([issue.location.lat, issue.location.lng], {
        icon: getMarkerIcon(issue.category, issue.severity, isSelected)
      });

      // Simple click to trigger callback
      marker.on("click", () => {
        if (onSelectIssue) {
          onSelectIssue(issue.issueId);
        }
      });

      // Dynamic popup overlay on hover
      const severityColors: Record<string, string> = {
        Low: "bg-green-100 text-green-800",
        Medium: "bg-yellow-100 text-yellow-800",
        High: "bg-orange-100 text-orange-800",
        Critical: "bg-red-100 text-red-800"
      };

      const popupContent = `
        <div class="p-2 min-w-48 font-sans">
          <div class="flex justify-between items-center mb-1">
            <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">${issue.category}</span>
            <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${severityColors[issue.severity]}">${issue.severity}</span>
          </div>
          <h4 class="font-semibold text-slate-800 text-sm leading-tight mb-1">${issue.title}</h4>
          <p class="text-xs text-slate-500 line-clamp-2 mb-1">${issue.location.address}</p>
          <div class="flex justify-between items-center mt-2 border-t pt-1.5 text-[10px] text-slate-400">
            <span>By: ${issue.reporterName}</span>
            <span>Votes: ${issue.verificationScore}</span>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, {
        closeButton: false,
        offset: [0, -8]
      });

      markersGroupRef.current.addLayer(marker);

      // Plot Heatmap Circle if requested
      if (showHeatmap) {
        let heatRadius = 150;
        let heatColor = "#ef4444"; // default red
        
        if (issue.severity === "Critical") {
          heatRadius = 250;
          heatColor = "#ef4444";
        } else if (issue.severity === "High") {
          heatRadius = 200;
          heatColor = "#f97316";
        } else if (issue.severity === "Medium") {
          heatRadius = 150;
          heatColor = "#eab308";
        } else {
          heatRadius = 100;
          heatColor = "#22c55e";
        }

        const circle = L.circle([issue.location.lat, issue.location.lng], {
          color: heatColor,
          fillColor: heatColor,
          fillOpacity: 0.15,
          radius: heatRadius + (issue.verificationScore * 5), // Size increases with verification upvotes
          stroke: false
        });

        heatCirclesGroupRef.current.addLayer(circle);
      }

      // Pan to selected issue
      if (isSelected) {
        mapInstanceRef.current.setView([issue.location.lat, issue.location.lng], 16, {
          animate: true,
          duration: 1
        });
        setTimeout(() => {
          marker.openPopup();
        }, 300);
      }
    });
  }, [issues, selectedIssueId, showHeatmap]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-slate-200/80 shadow-inner bg-slate-100">
      {errorMsg && (
        <div className="absolute top-3 left-3 z-[1000] bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-1.5 rounded-lg shadow-md flex items-center gap-1">
          <span className="font-semibold">Map Error:</span> {errorMsg}
        </div>
      )}

      {/* Primary map DOM holder */}
      <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: "350px" }} />

      {/* Floating map controls */}
      <div className="absolute bottom-4 right-4 z-[1000] flex flex-col gap-2">
        <button
          onClick={handleDetectLocation}
          type="button"
          className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-indigo-600 font-semibold text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 shadow-md transition-all active:scale-95"
          title="Auto-detect current location"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Detect Location
        </button>
      </div>

      {selectable && (
        <div className="absolute top-4 left-4 z-[1000] bg-indigo-900/90 backdrop-blur-md text-white px-3 py-2 rounded-xl text-xs shadow-md max-w-xs border border-indigo-700/50">
          <p className="font-medium">📍 Click anywhere on the map to place issue marker, or drag the blue marker to adjust.</p>
        </div>
      )}
    </div>
  );
}
