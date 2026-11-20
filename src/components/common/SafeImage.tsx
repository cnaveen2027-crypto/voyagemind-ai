import React, { useState } from 'react';
import { Compass } from 'lucide-react';

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}

export function SafeImage({ src, alt, className = '', fallbackLabel }: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={`bg-gradient-to-br from-[#10243A] to-[#247BA0] flex flex-col items-center justify-center text-white/90 p-4 ${className}`}
        role="img"
        aria-label={alt}
      >
        <Compass className="w-7 h-7 text-[#32C6B5] mb-1.5" />
        <span className="text-xs font-medium text-center">{fallbackLabel || alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
