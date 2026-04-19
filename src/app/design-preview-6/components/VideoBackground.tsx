"use client";

import { useEffect, useRef, useState } from "react";

export default function VideoBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [opacity, setOpacity] = useState(1);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleCanPlay = () => {
      video.play();
      setOpacity(1);
    };
    video.addEventListener("canplay", handleCanPlay, { once: true });

    const monitor = () => {
      if (!video) return;
      const timeLeft = video.duration - video.currentTime;
      if (timeLeft <= 0.6 && timeLeft > 0) {
        setOpacity(timeLeft / 0.6);
      } else if (video.currentTime < 0.6) {
        setOpacity(Math.min(1, video.currentTime / 0.6));
      } else {
        setOpacity(1);
      }
      rafRef.current = requestAnimationFrame(monitor);
    };

    const handlePlay = () => {
      rafRef.current = requestAnimationFrame(monitor);
    };
    video.addEventListener("play", handlePlay);

    const handleEnded = () => {
      setOpacity(0);
      setTimeout(() => {
        if (video) {
          video.currentTime = 0;
          video.play();
        }
      }, 80);
    };
    video.addEventListener("ended", handleEnded);

    return () => {
      cancelAnimationFrame(rafRef.current);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("ended", handleEnded);
    };
  }, []);

  return (
    <>
      <video
        ref={videoRef}
        muted
        playsInline
        autoPlay
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: 0,
          opacity,
          transition: "opacity 0.6s ease",
        }}
      >
        <source
          src="https://res.cloudinary.com/dbc0ygwsm/video/upload/v1775487700/%E1%BA%BF_kgun7g.mp4"
          type="video/mp4"
        />
      </video>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(255,255,255,0)",
          zIndex: 1,
        }}
      />
    </>
  );
}
