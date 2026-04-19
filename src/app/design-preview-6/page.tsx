"use client";

import "./styles/fonts.css";
import "./styles/theme.css";
import VideoBackground from "./components/VideoBackground";
import NavBar from "./components/NavBar";
import HeroSection from "./components/HeroSection";

export default function DesignPreview6() {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: "100vw",
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden",
        background: "#FFFFFF",
      }}
    >
      <VideoBackground />
      <NavBar />
      <HeroSection />
    </div>
  );
}
