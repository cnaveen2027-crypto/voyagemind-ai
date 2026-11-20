import React, { useState } from 'react';
import { MapPin } from 'lucide-react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { useAutocompleteSuggestions } from '../../hooks/useAutocompleteSuggestions';

interface Props {
  value: string;
  onChange: (val: string) => void;
  onPlaceSelected?: (place: { name: string; lat?: number; lng?: number }) => void;
  placeholder?: string;
  id?: string;
  required?: boolean;
  className?: string;
}

export function PlacesAutocompleteInput({
  value,
  onChange,
  onPlaceSelected,
  placeholder = 'Search city or destination',
  id,
  required,
  className = '',
}: Props) {
  const placesLib = useMapsLibrary('places');
  const [focused, setFocused] = useState(false);
  const { suggestions, resetSession } = useAutocompleteSuggestions(focused ? value : '');

  const handleSelect = async (suggestion: google.maps.places.AutocompleteSuggestion) => {
    const label = suggestion.placePrediction?.text.text || value;
    onChange(label);
    setFocused(false);

    if (placesLib && suggestion.placePrediction) {
      try {
        const place = suggestion.placePrediction.toPlace();
        await place.fetchFields({ fields: ['displayName', 'location'] });
        const loc = place.location;
        onPlaceSelected?.({
          name: place.displayName || label,
          lat: loc ? loc.lat() : undefined,
          lng: loc ? loc.lng() : undefined,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('OVER_QUERY_LIMIT')) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        onPlaceSelected?.({ name: label });
      } finally {
        resetSession();
      }
    } else {
      onPlaceSelected?.({ name: label });
      resetSession();
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          id={id}
          type="text"
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 180)}
          placeholder={placeholder}
          autoComplete="off"
          className={`w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-slate-200 rounded-lg text-[#182B3A] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#247BA0]/30 focus:border-[#247BA0] ${className}`}
        />
      </div>

      {focused && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto py-1"
        >
          {suggestions.map((s, idx) => {
            const text = s.placePrediction?.text.text;
            if (!text) return null;
            return (
              <li key={idx}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    void handleSelect(s);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-[#182B3A] hover:bg-[#F5F7FA] flex items-center gap-2 transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#247BA0] shrink-0" />
                  <span className="truncate">{text}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
