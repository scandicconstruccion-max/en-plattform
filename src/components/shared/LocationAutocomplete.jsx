import React, { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin, Loader2 } from 'lucide-react';

// Loads the Google Maps Places script once
function loadGoogleMapsScript(callback) {
  if (window.google?.maps?.places) {
    callback();
    return;
  }
  if (document.getElementById('gm-places-script')) {
    // Script already loading, wait for it
    const interval = setInterval(() => {
      if (window.google?.maps?.places) {
        clearInterval(interval);
        callback();
      }
    }, 100);
    return;
  }
  const script = document.createElement('script');
  script.id = 'gm-places-script';
  script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyD-9tSrke72PouQMnMX-a7eZSW0jkFMBWY&libraries=places`;
  script.async = true;
  script.onload = callback;
  document.head.appendChild(script);
}

export default function LocationAutocomplete({ value, onChange, placeholder = 'Adresse eller sted', className }) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const serviceRef = useRef(null);
  const sessionTokenRef = useRef(null);

  // Keep input in sync with external value
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  useEffect(() => {
    loadGoogleMapsScript(() => {
      serviceRef.current = new window.google.maps.places.AutocompleteService();
      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
    });
  }, []);

  const handleInput = (e) => {
    const val = e.target.value;
    setInputValue(val);
    onChange(val);

    if (!val || val.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (!serviceRef.current) return;
    setLoading(true);

    serviceRef.current.getPlacePredictions(
      {
        input: val,
        sessionToken: sessionTokenRef.current,
        componentRestrictions: { country: 'no' },
      },
      (predictions, status) => {
        setLoading(false);
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          setSuggestions(predictions);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      }
    );
  };

  const handleSelect = (prediction) => {
    setInputValue(prediction.description);
    onChange(prediction.description);
    setSuggestions([]);
    setShowSuggestions(false);
    // Refresh session token after selection
    if (window.google?.maps?.places) {
      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
    }
  };

  const handleBlur = () => {
    // Delay so click on suggestion registers first
    setTimeout(() => setShowSuggestions(false), 150);
  };

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={handleInput}
          onBlur={handleBlur}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder={placeholder}
          className={`pl-9 ${className || ''}`}
          autoComplete="off"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 animate-spin" />
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          {suggestions.map((s) => (
            <button
              key={s.place_id}
              type="button"
              onMouseDown={() => handleSelect(s)}
              className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-start gap-2 border-b border-slate-100 last:border-0"
            >
              <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <span className="text-sm font-medium text-slate-900">
                  {s.structured_formatting?.main_text}
                </span>
                <span className="text-xs text-slate-500 block">
                  {s.structured_formatting?.secondary_text}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}