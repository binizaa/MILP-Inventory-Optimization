// Reusable inline SVG icon set. All stroke-based, currentColor.

const Icon = ({ name, size = 18, strokeWidth = 1.75, style }) => {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style,
  };
  switch (name) {
    case "home":
      return (
        <svg {...props}><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>
      );
    case "book":
      return (
        <svg {...props}><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M8 7h8M8 10h6"/></svg>
      );
    case "box":
      return (
        <svg {...props}><path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/></svg>
      );
    case "users":
      return (
        <svg {...props}><circle cx="9" cy="8" r="3.2"/><path d="M2.5 20c.6-3 3.3-5 6.5-5s5.9 2 6.5 5"/><circle cx="17" cy="9" r="2.6"/><path d="M21.5 19c-.3-2.1-1.9-3.6-4-4"/></svg>
      );
    case "cart":
      return (
        <svg {...props}><path d="M3 4h2l2.3 11.3a2 2 0 0 0 2 1.7h7.4a2 2 0 0 0 2-1.6L20 8H6"/><circle cx="10" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/></svg>
      );
    case "store":
      return (
        <svg {...props}><path d="M4 9l1.5-5h13L20 9"/><path d="M4 9h16v1.5a2.5 2.5 0 0 1-5 0 2.5 2.5 0 0 1-5 0 2.5 2.5 0 0 1-5 0V9z"/><path d="M5 12.5V20h14v-7.5"/><path d="M10 20v-4h4v4"/></svg>
      );
    case "plus":
      return <svg {...props}><path d="M12 5v14M5 12h14"/></svg>;
    case "minus":
      return <svg {...props}><path d="M5 12h14"/></svg>;
    case "x":
      return <svg {...props}><path d="M6 6l12 12M18 6 6 18"/></svg>;
    case "save":
      return <svg {...props}><path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4"/><path d="M8 20v-6h8v6"/></svg>;
    case "trash":
      return <svg {...props}><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/></svg>;
    case "chev-right":
      return <svg {...props}><path d="M9 6l6 6-6 6"/></svg>;
    case "chev-down":
      return <svg {...props}><path d="M6 9l6 6 6-6"/></svg>;
    case "check":
      return <svg {...props}><path d="M4 12l5 5 11-12"/></svg>;
    case "calendar":
      return <svg {...props}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>;
    case "search":
      return <svg {...props}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
    case "snowflake":
      return (
        <svg {...props}><path d="M12 2v20M3 7l9 5 9-5M3 17l9-5 9 5M5 5l14 14M19 5 5 19"/></svg>
      );
    case "fridge":
      return (
        <svg {...props}><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M5 10h14"/><path d="M8 6v2M8 13v3"/></svg>
      );
    case "warehouse":
      return (
        <svg {...props}><path d="M3 21V9l9-5 9 5v12"/><path d="M7 21v-7h10v7"/><path d="M7 17h10"/></svg>
      );
    case "spark":
      return (
        <svg {...props}><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></svg>
      );
    case "scale":
      return <svg {...props}><path d="M12 3v18M5 7h14"/><path d="M5 7 2 14a4 4 0 0 0 8 0L5 7zM19 7l-3 7a4 4 0 0 0 8 0L19 7z" transform="scale(0.7) translate(5 3)"/></svg>;
    default:
      return null;
  }
};

window.Icon = Icon;
