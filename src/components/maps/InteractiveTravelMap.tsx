import React, { useCallback, useState } from 'react';
import {
  Map as GoogleMap,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useAdvancedMarkerRef,
  useApiLoadingStatus,
  APILoadingStatus,
} from '@vis.gl/react-google-maps';
import { MapPin } from 'lucide-react';

export interface MapMarkerPoint {
  id: string;
  title: string;
  subtitle?: string;
  lat: number;
  lng: number;
  tag?: string;
}

interface MarkerWithWindowProps {
  point: MapMarkerPoint;
  isSelected: boolean;
  onSelect: (id: string, marker: google.maps.marker.AdvancedMarkerElement) => void;
}

function MarkerWithInfo({ point, isSelected, onSelect }: MarkerWithWindowProps) {
  const [markerRef, marker] = useAdvancedMarkerRef();

  return (
    <AdvancedMarker
      ref={markerRef}
      position={{ lat: point.lat, lng: point.lng }}
      zIndex={isSelected ? 1000 : 10}
      onClick={() => {
        if (marker) onSelect(point.id, marker);
      }}
    >
      <Pin
        background={isSelected ? '#32C6B5' : '#10243A'}
        borderColor={isSelected ? '#10243A' : '#247BA0'}
        glyphColor="#FFFFFF"
      />
    </AdvancedMarker>
  );
}

interface InteractiveTravelMapProps {
  center: { lat: number; lng: number };
  zoom?: number;
  markers: MapMarkerPoint[];
  heightClassName?: string;
  onSelectMarker?: (point: MapMarkerPoint) => void;
}

export function InteractiveTravelMap({
  center,
  zoom = 11,
  markers,
  heightClassName = 'h-[360px]',
  onSelectMarker,
}: InteractiveTravelMapProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const status = useApiLoadingStatus();
  const [selectedPoint, setSelectedPoint] = useState<MapMarkerPoint | null>(null);
  const [anchorMarker, setAnchorMarker] = useState<google.maps.marker.AdvancedMarkerElement | null>(null);

  const handleMarkerClick = useCallback(
    (point: MapMarkerPoint, markerEl: google.maps.marker.AdvancedMarkerElement) => {
      setSelectedPoint(point);
      setAnchorMarker(markerEl);
      onSelectMarker?.(point);
    },
    [onSelectMarker]
  );

  if (!apiKey || apiKey === 'MY_GOOGLE_MAPS_API_KEY' || status === APILoadingStatus.AUTH_FAILURE || status === APILoadingStatus.FAILED) {
    return (
      <div
        className={`${heightClassName} w-full rounded-xl border border-slate-200 bg-slate-50 flex flex-col items-center justify-center p-6 text-center`}
      >
        <MapPin className="w-8 h-8 text-[#247BA0] mb-2" />
        <p className="text-sm font-semibold text-[#10243A]">Interactive Map Preview Unavailable</p>
        <p className="text-xs text-slate-600 mt-1 max-w-sm">
          Google Maps JavaScript API key is currently unavailable or exceeded quota. Coordinates and locations remain listed alongside the itinerary.
        </p>
      </div>
    );
  }

  return (
    <div className={`${heightClassName} w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-100`}>
      <GoogleMap
        mapId="DEMO_MAP_ID"
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        defaultCenter={center}
        center={center}
        defaultZoom={zoom}
        gestureHandling="greedy"
        disableDefaultUI={false}
        style={{ width: '100%', height: '100%' }}
      >
        {markers.map((m) => (
          <MarkerWithInfo
            key={m.id}
            point={m}
            isSelected={selectedPoint?.id === m.id}
            onSelect={(_id, markerEl) => handleMarkerClick(m, markerEl)}
          />
        ))}

        {selectedPoint && anchorMarker && (
          <InfoWindow anchor={anchorMarker} onCloseClick={() => setSelectedPoint(null)}>
            <div className="p-1 max-w-[220px]">
              <p className="text-sm font-semibold text-[#10243A] leading-snug">{selectedPoint.title}</p>
              {selectedPoint.subtitle && (
                <p className="text-xs text-slate-600 mt-1">{selectedPoint.subtitle}</p>
              )}
              {selectedPoint.tag && (
                <p className="text-xs font-medium text-[#247BA0] mt-1">{selectedPoint.tag}</p>
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}
