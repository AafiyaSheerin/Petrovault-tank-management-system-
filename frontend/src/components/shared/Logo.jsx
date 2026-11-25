import React from 'react';

const Logo = ({ size = 48 }) => {
    return (
        <div className="flex flex-col items-center justify-center select-none">
            <svg width={size} height={size} viewBox="0 0 120 120" className="overflow-visible">
                <defs>
                    <linearGradient id="pvPrimaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#6d28d9" />
                    </linearGradient>

                    <linearGradient id="pvAccentGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#38bdf8" />
                        <stop offset="100%" stopColor="#0284c7" />
                    </linearGradient>

                    <filter id="pvShadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#0f172a" floodOpacity="0.2" />
                    </filter>
                </defs>

                {/* Shield / Vault Outer Container */}
                <g filter="url(#pvShadow)">
                    <path 
                        d="M60,10 L102,28 V60 C102,86 60,110 60,110 C60,110 18,86 18,60 V28 L60,10 Z" 
                        fill="url(#pvPrimaryGrad)" 
                    />
                </g>

                {/* Inner Vault / Tank Droplet Symbol */}
                <path 
                    d="M60,32 C72,55 72,76 60,84 C48,76 48,55 60,32 Z" 
                    fill="url(#pvAccentGrad)" 
                />

                {/* Vault Core Dot */}
                <circle cx="60" cy="65" r="4" fill="#ffffff" opacity="0.9" />
            </svg>
        </div>
    );
};

export default Logo;
