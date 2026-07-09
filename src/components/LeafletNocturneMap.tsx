import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import type { Mission } from "../types/mission";
import type { Villain } from "../types/villain";

export type NocturneDistrictMap = {
  id: string;
  name: string;
  aliases: string[];
  center: [number, number];
  pin: [number, number];
  bounds: [[number, number], [number, number]];
};

type LeafletNocturneMapProps = {
  imageUrl: string;
  districts: NocturneDistrictMap[];
  activeDistrictId: string;
  activeMissionPins: Mission[];
  escapedVillainPins: Villain[];
  getDistrictForValue: (value: string) => NocturneDistrictMap;
  onSelectDistrict: (districtId: string) => void;
  onOpenVillain?: (name: string) => void;
  onOpenMissions?: () => void;
  fitAllToken?: number;
};

const mapBounds: L.LatLngBoundsExpression = [[0, 0], [1000, 1400]];

function toLeafletPoint(point: [number, number]): L.LatLngExpression {
  return [point[1], point[0]];
}

function createMarkerIcon(type: "district" | "mission" | "villain", label: string, active = false) {
  const content = document.createElement("div");
  const signal = document.createElement("span");
  const text = document.createElement("strong");
  text.textContent = label;
  content.append(signal, text);

  return L.divIcon({
    className: `nocturne-leaflet-marker ${type} ${active ? "active" : ""}`,
    html: content,
    iconSize: [120, 34],
    iconAnchor: [14, 17],
  });
}

export function LeafletNocturneMap({
  imageUrl,
  districts,
  activeDistrictId,
  activeMissionPins,
  escapedVillainPins,
  getDistrictForValue,
  onSelectDistrict,
  onOpenVillain,
  onOpenMissions,
  fitAllToken = 0,
}: LeafletNocturneMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const overlayRef = useRef<L.ImageOverlay | null>(null);
  const districtLayerRef = useRef<L.LayerGroup | null>(null);
  const signalLayerRef = useRef<L.LayerGroup | null>(null);
  const onSelectDistrictRef = useRef(onSelectDistrict);

  useEffect(() => {
    onSelectDistrictRef.current = onSelectDistrict;
  }, [onSelectDistrict]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container || mapRef.current) {
      return;
    }

    const map = L.map(container, {
      attributionControl: false,
      crs: L.CRS.Simple,
      maxBounds: mapBounds,
      maxBoundsViscosity: 0.85,
      minZoom: -1,
      maxZoom: 2.5,
      zoomSnap: 0.25,
      zoomControl: false,
      preferCanvas: true,
    });

    map.fitBounds(mapBounds);
    map.setZoom(0);

    overlayRef.current = L.imageOverlay(imageUrl, mapBounds)
      .on("load", () => {
        map.invalidateSize();
      })
      .addTo(map);
    districtLayerRef.current = L.layerGroup().addTo(map);
    signalLayerRef.current = L.layerGroup().addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);

    mapRef.current = map;
    window.setTimeout(() => map.invalidateSize(), 0);

    return () => {
      map.remove();
      mapRef.current = null;
      overlayRef.current = null;
      districtLayerRef.current = null;
      signalLayerRef.current = null;
    };
  }, [imageUrl]);

  useEffect(() => {
    const map = mapRef.current;
    const districtLayer = districtLayerRef.current;

    if (!map || !districtLayer) {
      return;
    }

    districtLayer.clearLayers();

    districts.forEach((district) => {
      const active = district.id === activeDistrictId;
      const rectangle = L.rectangle(district.bounds, {
        color: active ? "#d6b35a" : "#8ba4b4",
        weight: active ? 2 : 1,
        opacity: active ? 0.8 : 0.28,
        fillColor: active ? "#d6b35a" : "#5f7f92",
        fillOpacity: active ? 0.1 : 0.035,
        interactive: true,
        className: "nocturne-district-hitbox",
      });
      const marker = L.marker(toLeafletPoint(district.center), {
        icon: createMarkerIcon("district", district.name, active),
      });

      rectangle.on("click", () => onSelectDistrictRef.current(district.id));
      marker.on("click", () => onSelectDistrictRef.current(district.id));
      districtLayer.addLayer(rectangle);
      districtLayer.addLayer(marker);
    });
  }, [activeDistrictId, districts]);

  useEffect(() => {
    const signalLayer = signalLayerRef.current;

    if (!signalLayer) {
      return;
    }

    signalLayer.clearLayers();

    activeMissionPins.forEach((mission, index) => {
      const district = getDistrictForValue(mission.district);
      const marker = L.marker([district.pin[1] + index * 12, district.pin[0] + index * 10], {
        icon: createMarkerIcon("mission", mission.title),
      });

      marker.bindTooltip(`${mission.title} / ${mission.riskLevel}% risk`, {
        direction: "top",
        className: "nocturne-map-tooltip",
      });
      marker.on("click", () => onOpenMissions?.());
      signalLayer.addLayer(marker);
    });

    escapedVillainPins.forEach((villain, index) => {
      const district = getDistrictForValue(villain.lastLocation);
      const marker = L.marker([district.pin[1] + 44 + index * 12, district.pin[0] - 22 + index * 14], {
        icon: createMarkerIcon("villain", villain.name),
      });

      marker.bindTooltip(`${villain.name} / ${villain.dangerLevel}`, {
        direction: "top",
        className: "nocturne-map-tooltip",
      });
      marker.on("click", () => onOpenVillain?.(villain.name));
      signalLayer.addLayer(marker);
    });
  }, [activeMissionPins, escapedVillainPins, getDistrictForValue, onOpenMissions, onOpenVillain]);

  useEffect(() => {
    const map = mapRef.current;
    const activeDistrict = districts.find((district) => district.id === activeDistrictId);

    if (!map || !activeDistrict) {
      return;
    }

    map.flyTo(toLeafletPoint(activeDistrict.center), 0.45, {
      animate: true,
      duration: 0.75,
    });
  }, [activeDistrictId, districts]);

  useEffect(() => {
    if (fitAllToken > 0) mapRef.current?.fitBounds(mapBounds, { animate: true, padding: [20, 20] });
  }, [fitAllToken]);

  return <div className="nocturne-leaflet-map" ref={containerRef} aria-label="Custom Nocturne Leaflet map" />;
}
