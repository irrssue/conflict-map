// SVG icons for each event type, rendered as map markers
// Each returns an SVG string that gets embedded in the marker element

const ICONS = {
  airstrike: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
    <path d="M16 4L6 18h6v10l10-14h-6V4z" fill="currentColor" stroke="rgba(0,0,0,0.5)" stroke-width="1"/>
  </svg>`,

  missile_launch: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
    <path d="M16 3l3 8h-2v10l3 4h-8l3-4V11h-2l3-8z" fill="currentColor" stroke="rgba(0,0,0,0.5)" stroke-width="1"/>
    <path d="M13 25l-1 4h2l-1-4zm6 0l-1 4h2l-1-4z" fill="currentColor" opacity="0.7"/>
  </svg>`,

  explosion: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
    <path d="M16 3l2.5 7-4-2 3 6-6-3 4 5.5-7-2 5 4.5-5 1 6 3-6 1 5 4.5-7-2 4 5.5-6-3 3 6-4-2L16 3z" fill="currentColor" stroke="rgba(0,0,0,0.5)" stroke-width="0.8"/>
  </svg>`,

  ground_operation: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
    <line x1="16" y1="4" x2="16" y2="28" stroke="currentColor" stroke-width="1.5"/>
    <line x1="4" y1="16" x2="28" y2="16" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="16" cy="16" r="3" fill="currentColor"/>
  </svg>`,

  diplomatic: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
    <rect x="8" y="8" width="16" height="16" rx="2" stroke="currentColor" stroke-width="2" fill="none"/>
    <path d="M12 16h8M16 12v8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <circle cx="16" cy="6" r="2" fill="currentColor"/>
  </svg>`,

  naval: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
    <path d="M4 20c2-2 4-2 6 0s4 2 6 0 4-2 6 0 4 2 6 0" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M8 18v-6h4l4-4v10H8z" fill="currentColor" stroke="rgba(0,0,0,0.5)" stroke-width="1"/>
    <rect x="18" y="13" width="4" height="5" fill="currentColor" opacity="0.7"/>
  </svg>`,

  cyber: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
    <rect x="6" y="8" width="20" height="14" rx="2" stroke="currentColor" stroke-width="2" fill="none"/>
    <line x1="12" y1="26" x2="20" y2="26" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <line x1="16" y1="22" x2="16" y2="26" stroke="currentColor" stroke-width="1.5"/>
    <path d="M13 13l2 2-2 2M17 13l2 2-2 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  other: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
    <circle cx="16" cy="16" r="4" fill="currentColor"/>
  </svg>`,
};

export default ICONS;
