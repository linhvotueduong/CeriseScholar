"use client";

import { useState } from "react";

const PURPLE = "#5B47C5";
const YELLOW = "#F5D547";
const SPACE_GROTESK = "'Space Grotesk', sans-serif";
const INTER = "'Inter', sans-serif";

const NAV_ITEMS = [
  { label: "Home", active: true },
  { label: "About", active: false },
  { label: "Research Guide", active: false },
  { label: "Workspace", active: false },
];

export default function NavBar() {
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [signUpHovered, setSignUpHovered] = useState(false);
  const [loginHovered, setLoginHovered] = useState(false);

  return (
    <nav
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 32px",
        height: 72,
        background: YELLOW,
        zIndex: 10,
        width: "100%",
      }}
    >
      <span
        style={{
          fontFamily: SPACE_GROTESK,
          fontSize: 24,
          fontWeight: 600,
          color: PURPLE,
        }}
      >
        Cerise Scholar
      </span>

      <div
        className="nav-links"
        style={{ display: "flex", gap: 32, alignItems: "center" }}
      >
        {NAV_ITEMS.map(({ label, active }) => (
          <span
            key={label}
            onMouseEnter={() => setHoveredLink(label)}
            onMouseLeave={() => setHoveredLink(null)}
            style={{
              fontFamily: INTER,
              fontSize: 16,
              color:
                active || hoveredLink === label ? "#000000" : "#444444",
              fontWeight: active ? 500 : 400,
              cursor: "pointer",
              transition: "color 0.15s",
            }}
          >
            {label}
          </span>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <span
          onMouseEnter={() => setLoginHovered(true)}
          onMouseLeave={() => setLoginHovered(false)}
          style={{
            fontFamily: INTER,
            fontSize: 16,
            color: loginHovered ? "#000000" : "#444444",
            cursor: "pointer",
            transition: "color 0.15s",
          }}
        >
          Log In
        </span>
        <span
          onMouseEnter={() => setSignUpHovered(true)}
          onMouseLeave={() => setSignUpHovered(false)}
          style={{
            fontFamily: INTER,
            fontSize: 16,
            color: "#FFFFFF",
            background: signUpHovered ? "#4B38B3" : PURPLE,
            borderRadius: 9999,
            padding: "8px 20px",
            cursor: "pointer",
            fontWeight: 500,
            transition: "background 0.15s, transform 0.15s",
            transform: signUpHovered ? "scale(1.03)" : "scale(1)",
            display: "inline-block",
          }}
        >
          Sign Up Free
        </span>
      </div>
    </nav>
  );
}
