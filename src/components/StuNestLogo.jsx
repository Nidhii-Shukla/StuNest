import React from 'react';
import { Link } from 'react-router-dom';

/**
 * StuNest Premium Brand Logo Component
 * Renders the exact hand-crafted vector logo mark (Teal Bird + Orange House Roof + Teal Nest/Graduation Cap)
 * alongside the StuNest text brand and "Student Housing Solutions" slogan.
 */
export default function StuNestLogo({ 
  height = 42, 
  showText = true, 
  showTagline = true, 
  inline = false,
  variant = 'default', // 'default' (colored), 'light' (white text for dark headers)
  to = '/' 
}) {
  const tealColor = variant === 'light' ? '#FFFFFF' : '#084C5D';
  const orangeColor = variant === 'light' ? '#FFFFFF' : '#E88B23';
  const tagColor = variant === 'light' ? 'rgba(255, 255, 255, 0.7)' : '#5C7A82';

  // The premium SVG visual mark
  const svgMark = (
    <svg 
      width={height} 
      height={height} 
      viewBox="0 0 120 120" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, transition: 'transform 0.3s ease' }}
    >
      {/* 1. House Roof (Orange) */}
      <path 
        d="M 58 36 L 82 14 L 106 36 L 106 44 L 98 44 L 98 38 L 82 23 L 66 38 L 66 44 Z" 
        fill={orangeColor} 
      />
      {/* Small orange chimney-like edge inside bird */}
      <path 
        d="M 82 28 L 88 34 M 91 38 L 86 44" 
        stroke={orangeColor} 
        strokeWidth="2.5" 
        strokeLinecap="round" 
      />

      {/* 2. Outer Nest Swoops / Rings (Teal) */}
      <path 
        d="M 18 64 C 18 84, 102 84, 102 64 C 102 54, 94 48, 94 48 C 94 48, 106 56, 106 66 C 106 90, 14 90, 14 66 C 14 56, 22 48, 22 48 C 22 48, 18 54, 18 64 Z" 
        fill={tealColor} 
      />
      <path 
        d="M 26 70 C 26 84, 94 84, 94 70 C 94 63, 88 58, 88 58 C 88 58, 98 64, 98 72 C 98 90, 22 90, 22 72 C 22 64, 30 58, 30 58 C 30 58, 26 63, 26 70 Z" 
        fill={tealColor} 
        opacity="0.8"
      />

      {/* 3. Bird Wing Feathers (Teal) - Sweeping up & left */}
      {/* Feather 1 (Top) */}
      <path 
        d="M 52 54 C 36 50, 18 36, 22 18 C 24 28, 36 40, 52 46 Z" 
        fill={tealColor} 
      />
      {/* Feather 2 (Middle) */}
      <path 
        d="M 55 58 C 32 54, 12 44, 16 26 C 18 36, 32 46, 55 50 Z" 
        fill={tealColor} 
      />
      {/* Feather 3 (Bottom) */}
      <path 
        d="M 58 63 C 30 60, 14 52, 16 36 C 20 44, 32 52, 58 55 Z" 
        fill={tealColor} 
      />

      {/* 4. Bird Body & Beak (Orange & Teal) */}
      {/* Teal head & beak */}
      <path 
        d="M 56 46 C 60 40, 68 34, 76 34 C 76 34, 72 38, 76 40 C 70 42, 64 45, 60 52 Z" 
        fill={tealColor} 
      />
      {/* Orange inner body contour */}
      <path 
        d="M 50 48 C 62 48, 72 52, 72 64 C 72 74, 52 74, 48 64 C 46 60, 48 52, 50 48 Z" 
        fill={orangeColor} 
      />

      {/* 5. Graduation Cap at the base (Teal) */}
      {/* Cap Diamond */}
      <path 
        d="M 32 94 L 58 84 L 84 94 L 58 104 Z" 
        fill={tealColor} 
      />
      {/* Cap base outline */}
      <path 
        d="M 44 98 L 44 104 C 44 108, 72 108, 72 104 L 72 98" 
        stroke={tealColor} 
        strokeWidth="3" 
        strokeLinecap="round" 
      />
      {/* Cap Tassel */}
      <path 
        d="M 32 94 L 23 103 L 23 111 C 23 113, 26 113, 26 111 L 26 104 Z" 
        fill={tealColor} 
      />
    </svg>
  );

  const containerStyles = {
    display: inline ? 'inline-flex' : 'flex',
    alignItems: 'center',
    gap: '0.625rem',
    textDecoration: 'none',
    cursor: 'pointer',
  };

  const textContainerStyles = {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    lineHeight: '1.1',
  };

  const titleStyles = {
    fontSize: `${height * 0.44}px`,
    fontWeight: '800',
    letterSpacing: '-0.02em',
    margin: 0,
    padding: 0,
    color: tealColor,
    fontFamily: "'Outfit', 'Inter', sans-serif",
  };

  const taglineStyles = {
    fontSize: `${height * 0.18}px`,
    fontWeight: '600',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: tagColor,
    margin: `${height * 0.06}px 0 0 0`,
    padding: 0,
    whiteSpace: 'nowrap',
    fontFamily: "'Inter', sans-serif",
  };

  const content = (
    <div style={containerStyles} className="stunest-logo-group">
      {svgMark}
      {showText && (
        <div style={textContainerStyles}>
          <h1 style={titleStyles}>
            Stu<span style={{ color: orangeColor }}>Nest</span>
          </h1>
          {showTagline && (
            <span style={taglineStyles}>
              Student Housing Solutions
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (to) {
    return (
      <Link to={to} style={{ textDecoration: 'none', display: 'inline-block' }}>
        {content}
      </Link>
    );
  }

  return content;
}
