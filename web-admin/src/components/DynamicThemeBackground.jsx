import React from 'react';

/**
 * DynamicThemeBackground Component
 * - Light Mode: Lined paper notebook pattern (linear-gradient)
 * - Dark Mode: Animated Midnight Sky (twinkling stars, shooting meteors & glowing crescent moon)
 */
export default function DynamicThemeBackground({ themeMode }) {
  if (themeMode === 'light') {
    return <div className="global-bg-light" aria-hidden="true" />;
  }

  return (
    <div className="uiverse-midnight-sky" aria-hidden="true">
      <div className="sky-canvas">
        <div className="stars stars-1" />
        <div className="stars stars-2" />
        <div className="stars stars-3" />
        <div className="meteor m1" />
        <div className="meteor m2" />
        <div className="meteor m3" />
        <div className="moon" />
      </div>
    </div>
  );
}
