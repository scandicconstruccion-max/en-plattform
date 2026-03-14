import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, X, Loader2 } from 'lucide-react';

export default function GeotagButton({ value, onChange }) {
  const [loading, setLoading] = useState(false);

  const handleGeolocate = () => {
    if (!navigator.geolocation) return;
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`,
        });
        setLoading(false);
      },
      () => setLoading(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  if (value?.lat) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
        <MapPin className="h-4 w-4 flex-shrink-0" />
        <span className="flex-1 truncate">{value.label}</span>
        <button type="button" onClick={() => onChange(null)} className="text-emerald-400 hover:text-emerald-700">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <Button type="button" variant="outline" size="sm" className="rounded-xl gap-2" onClick={handleGeolocate} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
      {loading ? 'Henter posisjon…' : 'Legg til geotagging'}
    </Button>
  );
}