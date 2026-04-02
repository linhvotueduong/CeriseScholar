"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  DoodleScientist,
  DoodleBook,
  DoodleMagnifier,
  DoodleLightbulb,
  DoodlePDF,
  DoodlePencil,
  DoodleBrain,
  DoodleChart,
  DoodleStars,
  DoodleUnderline,
  DoodleArrow,
} from "@/components/doodles/Doodles";

// Animation variants
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.15 } },
};

const float = {
  animate: {
    y: [0, -10, 0],
    transition: { duration: 3, repeat: Infinity, ease: "easeInOut" as const },
  },
};

const wiggle = {
  animate: {
    rotate: [0, -5, 5, -3, 0],
    transition: { duration: 4, repeat: Infinity, ease: "easeInOut" as const },
  },
};

const features = [
  {
    title: "PDF Viewer",
    description: "Upload and read your research PDFs right in the browser.",
    Doodle: DoodlePDF,
  },
  {
    title: "Smart Highlighting",
    description: "Select passages and they become entries in your review table.",
    Doodle: DoodlePencil,
  },
  {
    title: "Literature Review",
    description: "Auto-populated table with source, author, year, and themes.",
    Doodle: DoodleChart,
  },
  {
    title: "ScholarAsk AI",
    description: "Ask research questions. Get answers with real citations.",
    Doodle: DoodleLightbulb,
  },
  {
    title: "Text-to-Speech",
    description: "Listen to your PDFs with natural AI voices.",
    Doodle: DoodleBrain,
  },
  {
    title: "Paper Writer",
    description: "Write section-by-section with auto-imported materials.",
    Doodle: DoodleBook,
  },
];

const steps = [
  {
    num: "01",
    title: "Upload your PDF",
    desc: "Drag & drop any research paper. Scanned PDFs get OCR automatically.",
  },
  {
    num: "02",
    title: "Read & highlight",
    desc: "Toggle highlight mode and select the passages that matter most.",
  },
  {
    num: "03",
    title: "Review & export",
    desc: "Your highlights become a structured table. Add notes and export as CSV.",
  },
];

export default function DesignPreview() {
  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* ============================================ */}
      {/* FLOATING BANNER */}
      {/* ============================================ */}
      <div className="bg-[#DE3163] text-white text-center text-sm py-2 font-medium">
        Design Preview — this is a mockup, not the live site
      </div>

      {/* ============================================ */}
      {/* NAVBAR */}
      {/* ============================================ */}
      <nav className="flex items-center justify-between px-8 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <DoodleStars className="opacity-60" />
          <span className="text-2xl font-black tracking-tight">
            Cerise<span className="text-[#DE3163]">Scholar</span>
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
          <span className="hover:text-black cursor-pointer transition-colors">Home</span>
          <span className="hover:text-black cursor-pointer transition-colors">About</span>
          <span className="hover:text-black cursor-pointer transition-colors">Research Guide</span>
          <span className="hover:text-black cursor-pointer transition-colors">Workspace</span>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-5 py-2 text-sm font-medium text-gray-700 hover:text-black transition-colors">
            Log In
          </button>
          <button className="px-5 py-2.5 text-sm font-bold bg-black text-white rounded-full hover:bg-gray-800 transition-colors">
            Sign Up Free
          </button>
        </div>
      </nav>

      {/* ============================================ */}
      {/* HERO SECTION */}
      {/* ============================================ */}
      <section className="relative px-8 pt-16 pb-28 max-w-7xl mx-auto">
        {/* Floating doodles around hero */}
        <motion.div className="absolute top-8 left-8 opacity-20 hidden lg:block" {...float}>
          <DoodleBook size={100} />
        </motion.div>
        <motion.div className="absolute top-16 right-12 opacity-20 hidden lg:block" {...wiggle}>
          <DoodleMagnifier size={90} />
        </motion.div>
        <motion.div className="absolute bottom-12 left-24 opacity-15 hidden lg:block" {...wiggle}>
          <DoodleLightbulb size={70} />
        </motion.div>

        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
          {/* Left — Text */}
          <motion.div
            className="flex-1 text-center lg:text-left"
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-gray-100 rounded-full px-4 py-1.5 text-sm font-medium text-gray-600 mb-6">
              <span className="w-2 h-2 bg-[#DE3163] rounded-full" />
              Built for student researchers
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-5xl md:text-6xl lg:text-7xl font-black text-black leading-[1.1] tracking-tight">
              Read. Highlight.
              <br />
              <span className="relative inline-block">
                <span className="text-[#DE3163]">Review.</span>
                <DoodleUnderline width={250} className="absolute -bottom-2 left-0" />
              </span>
            </motion.h1>

            <motion.p variants={fadeUp} className="mt-8 text-lg md:text-xl text-gray-500 max-w-lg leading-relaxed">
              Turn your PDF reading into a structured literature review.
              Highlight a passage — it instantly becomes a searchable entry
              in your review table.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <button className="px-8 py-4 bg-[#DE3163] text-white font-bold rounded-full text-lg hover:bg-[#c4294f] transition-all hover:scale-105 shadow-lg shadow-[#DE3163]/25">
                Get Started Free
              </button>
              <button className="px-8 py-4 border-2 border-black text-black font-bold rounded-full text-lg hover:bg-black hover:text-white transition-all">
                See How It Works
              </button>
            </motion.div>
          </motion.div>

          {/* Right — Scientist doodle with card mockups */}
          <motion.div
            className="flex-1 flex justify-center relative"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="relative">
              {/* Main card background */}
              <div className="w-[340px] h-[400px] md:w-[400px] md:h-[460px] bg-gray-50 rounded-3xl border-2 border-black/10 flex items-center justify-center relative overflow-hidden">
                <DoodleScientist size={220} className="opacity-80" />

                {/* Floating mini-cards */}
                <motion.div
                  className="absolute top-6 right-6 bg-white rounded-xl p-3 shadow-lg border border-gray-100"
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  <DoodlePDF size={40} />
                </motion.div>

                <motion.div
                  className="absolute bottom-8 left-6 bg-white rounded-xl px-4 py-2 shadow-lg border border-gray-100 flex items-center gap-2"
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                >
                  <div className="w-3 h-3 bg-[#DE3163] rounded-full" />
                  <span className="text-xs font-bold text-gray-700">3 highlights saved</span>
                </motion.div>

                <motion.div
                  className="absolute top-12 left-4 bg-white rounded-xl px-3 py-2 shadow-lg border border-gray-100"
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                >
                  <span className="text-xs font-bold text-gray-500">AI ready</span>
                </motion.div>
              </div>

              {/* Decorative dots */}
              <div className="absolute -top-4 -right-4 grid grid-cols-3 gap-1.5">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-[#DE3163]/20" />
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================================ */}
      {/* FEATURES SECTION — Bold color blocks */}
      {/* ============================================ */}
      <section className="bg-black text-white py-24 px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
          >
            <motion.p variants={fadeUp} className="text-[#DE3163] font-bold text-sm uppercase tracking-widest mb-3">
              Features
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-black">
              Everything you need
              <br />
              for your research
            </motion.h2>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={stagger}
          >
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={fadeUp}
                className="group bg-white/5 backdrop-blur rounded-2xl p-8 border border-white/10 hover:border-[#DE3163]/50 hover:bg-white/10 transition-all cursor-default"
              >
                <div className="mb-5 w-16 h-16 bg-white/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <feature.Doodle size={40} className="[&_*]:stroke-white [&_rect]:fill-none [&_text]:fill-white [&_path[fill='#DE3163']]:fill-[#DE3163] [&_rect[fill='#DE3163']]:fill-[#DE3163]" />
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============================================ */}
      {/* HOW IT WORKS — Big numbered steps */}
      {/* ============================================ */}
      <section className="py-24 px-8 bg-white">
        <div className="max-w-5xl mx-auto">
          <motion.div
            className="text-center mb-20"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.p variants={fadeUp} className="text-[#DE3163] font-bold text-sm uppercase tracking-widest mb-3">
              Simple & Powerful
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-black text-black">
              How it works
            </motion.h2>
          </motion.div>

          <motion.div
            className="space-y-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                variants={fadeUp}
                className={`flex flex-col md:flex-row items-center gap-8 md:gap-16 ${i % 2 === 1 ? "md:flex-row-reverse" : ""}`}
              >
                {/* Big number */}
                <div className="shrink-0">
                  <div className="w-28 h-28 rounded-3xl bg-gray-50 border-2 border-black/5 flex items-center justify-center">
                    <span className="text-5xl font-black text-[#DE3163]">{step.num}</span>
                  </div>
                </div>
                {/* Text */}
                <div className={`text-center md:text-left ${i % 2 === 1 ? "md:text-right" : ""}`}>
                  <h3 className="text-2xl font-black text-black mb-3">{step.title}</h3>
                  <p className="text-gray-500 text-lg leading-relaxed max-w-md">{step.desc}</p>
                </div>
                {/* Arrow between steps (except last) */}
                {i < steps.length - 1 && (
                  <div className="hidden md:block">
                    <DoodleArrow className="opacity-30" />
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============================================ */}
      {/* SOCIAL PROOF / STATS */}
      {/* ============================================ */}
      <section className="py-20 px-8 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {[
              { stat: "100%", label: "Free to use", sub: "No credit card needed" },
              { stat: "5 min", label: "Setup time", sub: "Upload → Highlight → Review" },
              { stat: "AI", label: "Powered research", sub: "Citations from real papers" },
            ].map((item) => (
              <motion.div
                key={item.label}
                className="bg-white rounded-2xl p-8 border border-gray-200"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
              >
                <div className="text-4xl font-black text-[#DE3163] mb-2">{item.stat}</div>
                <div className="text-lg font-bold text-black mb-1">{item.label}</div>
                <div className="text-sm text-gray-400">{item.sub}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* CTA — Bold cerise block */}
      {/* ============================================ */}
      <section className="py-24 px-8 bg-[#DE3163] relative overflow-hidden">
        {/* Background doodles */}
        <div className="absolute top-8 left-12 opacity-10">
          <DoodleScientist size={150} className="[&_*]:stroke-white" />
        </div>
        <div className="absolute bottom-8 right-12 opacity-10">
          <DoodleBrain size={120} className="[&_*]:stroke-white" />
        </div>

        <motion.div
          className="max-w-3xl mx-auto text-center relative z-10"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
        >
          <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-black text-white mb-6">
            Start your literature
            <br />
            review today
          </motion.h2>
          <motion.p variants={fadeUp} className="text-white/80 text-lg mb-10 max-w-lg mx-auto">
            Join researchers who use Cerise Scholar to streamline their
            academic workflow. Free forever.
          </motion.p>
          <motion.div variants={fadeUp}>
            <button className="px-10 py-4 bg-white text-[#DE3163] font-bold rounded-full text-lg hover:bg-gray-100 transition-all hover:scale-105 shadow-xl">
              Create Free Account
            </button>
          </motion.div>
        </motion.div>
      </section>

      {/* ============================================ */}
      {/* FOOTER */}
      {/* ============================================ */}
      <footer className="py-12 px-8 bg-black text-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <DoodleStars className="[&_*]:stroke-[#DE3163]" />
            <span className="text-lg font-black">
              Cerise<span className="text-[#DE3163]">Scholar</span>
            </span>
          </div>
          <div className="flex gap-8 text-sm text-gray-400">
            <span className="hover:text-white cursor-pointer transition-colors">Home</span>
            <span className="hover:text-white cursor-pointer transition-colors">About</span>
            <span className="hover:text-white cursor-pointer transition-colors">Research Guide</span>
            <span className="hover:text-white cursor-pointer transition-colors">Log In</span>
            <span className="hover:text-white cursor-pointer transition-colors">Sign Up</span>
          </div>
          <p className="text-xs text-gray-600">Built for researchers, by researchers.</p>
        </div>
      </footer>
    </div>
  );
}
