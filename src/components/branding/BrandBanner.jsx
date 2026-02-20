import React, { useState, useEffect } from 'react';
import { X, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const PuzzleHouseIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Roof - puzzle piece 1 */}
    <path d="M60 20 L90 45 L85 45 L85 42 C85 40 83 38 81 38 C79 38 77 40 77 42 L77 45 L43 45 L43 42 C43 40 41 38 39 38 C37 38 35 40 35 42 L35 45 L30 45 Z" fill="currentColor" opacity="0.9"/>
    
    {/* Left wall - puzzle piece 2 */}
    <path d="M30 45 L30 85 L35 85 L35 82 C35 80 37 78 39 78 C41 78 43 80 43 82 L43 85 L30 85 L30 100 L50 100 L50 85 Z" fill="currentColor" opacity="0.85"/>
    
    {/* Right wall - puzzle piece 3 */}
    <path d="M90 45 L90 85 L77 85 L77 82 C77 80 79 78 81 78 C83 78 85 80 85 82 L85 85 L90 85 L90 100 L70 100 L70 85 Z" fill="currentColor" opacity="0.85"/>
    
    {/* Door - puzzle piece 4 */}
    <path d="M50 85 L50 100 L70 100 L70 85 L67 85 L67 88 C67 90 65 92 63 92 L57 92 C55 92 53 90 53 88 L53 85 Z" fill="currentColor" opacity="0.8"/>
  </svg>
);

export default function BrandBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    const hasSeenBanner = localStorage.getItem('ks_brand_banner_seen');
    if (!hasSeenBanner) {
      setIsVisible(true);
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('ks_brand_banner_seen', 'true');
  };

  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  if (!isVisible) return null;

  return (
    <div className={cn(
      "relative bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-2xl shadow-lg overflow-hidden transition-all duration-300 mb-6",
      isMinimized ? "h-16" : "h-auto"
    )}>
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.1) 10px, rgba(255,255,255,.1) 20px)'
        }} />
      </div>

      <div className="relative z-10 p-6">
        {/* Action buttons */}
        <div className="absolute top-3 right-3 flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleMinimize}
            className="h-8 w-8 text-white hover:bg-white/20 rounded-full"
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-8 w-8 text-white hover:bg-white/20 rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className={cn(
          "flex items-center gap-6 transition-all duration-300",
          isMinimized && "opacity-0 h-0 overflow-hidden"
        )}>
          {/* Icon */}
          <div className="flex-shrink-0">
            <div className="w-24 h-24 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <PuzzleHouseIcon className="w-16 h-16 text-white" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            <h2 className="text-3xl font-bold text-white mb-2">
              Velkommen til ditt KS-system
            </h2>
            <p className="text-xl text-white/90 font-medium italic">
              Av håndverkeren, for håndverkeren
            </p>
            <p className="text-sm text-white/80 mt-3 max-w-2xl">
              Et komplett system laget av håndverkere som forstår dine behov. 
              Administrer prosjekter, timer, faktura og dokumentasjon på én plattform.
            </p>
          </div>
        </div>

        {/* Minimized state */}
        {isMinimized && (
          <div className="flex items-center gap-4">
            <PuzzleHouseIcon className="w-8 h-8 text-white" />
            <p className="text-white font-medium italic">
              Av håndverkeren, for håndverkeren
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export { PuzzleHouseIcon };