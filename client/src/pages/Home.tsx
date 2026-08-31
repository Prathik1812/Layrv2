import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, FileText, Network, ShieldCheck, Sparkles, Layers, Terminal } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"evidence" | "sitemap" | "flows">("evidence");

  useEffect(() => {
    if (user) setLocation("/projects");
  }, [user, setLocation]);

  return (
    <div className="min-h-screen bg-[#050506] text-[#F4F3EF] selection:bg-[#FF4B23] selection:text-[#050506] antialiased">
      
      {/* MONOLITH HEADER BAR */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#050506]/95 backdrop-blur-md px-6 md:px-12 py-5">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setLocation("/")}>
              <div className="h-4 w-4 bg-[#FF4B23]" />
              <span className="text-xl font-black tracking-[-0.07em] text-[#F4F3EF]">LAYR</span>
            </div>
            <div className="hidden lg:flex items-center gap-8 text-xs mono text-[#9B9B9B] border-l border-white/10 pl-8">
              <a href="#pipeline" className="hover:text-[#FF4B23] transition-colors">01 // PIPELINE</a>
              <a href="#canvas" className="hover:text-[#FF4B23] transition-colors">02 // CANVAS</a>
              <a href="#provenance" className="hover:text-[#FF4B23] transition-colors">03 // PROVENANCE</a>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button
              onClick={() => setLocation("/login")}
              variant="outline"
              className="h-10 text-xs font-bold text-[#F4F3EF] border-white/15 bg-[#111214] hover:bg-white/10"
            >
              Sign In
            </Button>
            <Button
              onClick={() => setLocation("/signup")}
              className="h-10 text-xs font-bold bg-[#FF4B23] text-[#050506] hover:bg-[#FF5D38]"
            >
              Start Project <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* HERO SECTION — ART-DIRECTED MONOLITHIC TYPOGRAPHY */}
      <section className="relative border-b border-white/10 px-6 md:px-12 pt-20 pb-24 overflow-hidden">
        
        {/* Underlay Grid hairlines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:6rem_6rem] pointer-events-none" />

        <div className="mx-auto max-w-[1600px] relative z-10 space-y-12">
          
          <div className="flex items-center gap-4">
            <span className="mono text-xs font-bold uppercase tracking-[0.22em] text-[#FF4B23] bg-[#FF4B23]/10 border border-[#FF4B23]/30 px-3 py-1.5 inline-block">
              [ LAYR STUDIO CORE 2.0 ]
            </span>
            <span className="hidden md:inline-block mono text-xs text-[#9B9B9B]">
              EVIDENCE-DRIVEN PRODUCT DISCOVERY ENGINE
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="text-6xl sm:text-8xl md:text-9xl font-black uppercase tracking-[-0.07em] leading-[0.88] text-[#F4F3EF] max-w-7xl">
              RAW EVIDENCE.
            </h1>
            <h1 className="text-6xl sm:text-8xl md:text-9xl font-black uppercase tracking-[-0.07em] leading-[0.88] text-[#FF4B23] max-w-7xl">
              SHIPPABLE SYSTEM.
            </h1>
          </div>

          <div className="grid lg:grid-cols-[1fr_400px] gap-12 items-end pt-6 border-t border-white/10">
            <p className="text-xl md:text-2xl font-medium leading-relaxed text-[#9B9B9B] max-w-3xl">
              Layr turns customer interviews, notes, and transcripts directly into 2D sitemaps, branching user flows, and PRD specifications with continuous, 100% verifiable trace paths.
            </p>

            <div className="flex flex-col gap-3">
              <Button
                onClick={() => setLocation("/signup")}
                className="h-14 text-base font-bold bg-[#FF4B23] text-[#050506] hover:bg-[#FF5D38] justify-between px-6"
              >
                <span>OPEN DISCOVERY WORKSPACE</span>
                <ArrowRight className="h-5 w-5" />
              </Button>
              <span className="mono text-[10px] text-[#9B9B9B] tracking-[0.14em] text-center">
                NO CREDIT CARD REQUIRED // FULL TRACEABILITY INCLUDED
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* FULL-BLEED ORANGE SIGNAL STRIP */}
      <section className="bg-[#FF4B23] text-[#050506] py-5 px-6 md:px-12 border-b border-[#050506]">
        <div className="mx-auto max-w-[1600px] flex flex-wrap items-center justify-between gap-6 mono text-xs font-black uppercase tracking-[0.2em]">
          <span>01 / TRANSCRIPT EXTRACTION</span>
          <span>02 / EMPATHY MATRIX</span>
          <span>03 / FEATURE PRIORITY</span>
          <span>04 / AUTOMATED PRD</span>
          <span>05 / 2D SITEMAP GRAPH</span>
          <span>06 / BRANCHING FLOWS</span>
          <span>07 / HEURISTIC AUDIT</span>
        </div>
      </section>

      {/* SPATIAL INTERACTIVE STUDIO CANVAS PREVIEW */}
      <section id="canvas" className="py-24 px-6 md:px-12 border-b border-white/10 bg-[#0D0E11]">
        <div className="mx-auto max-w-[1600px] space-y-12">
          
          <div className="flex flex-col md:flex-row justify-between md:items-end gap-6 border-b border-white/10 pb-8">
            <div>
              <span className="mono text-xs font-bold uppercase tracking-[0.2em] text-[#FF4B23]">
                02 // INTERACTIVE DISCOVERY WORKSPACE
              </span>
              <h2 className="text-4xl md:text-6xl font-black uppercase tracking-[-0.05em] text-[#F4F3EF] mt-2">
                Unified Spatial Canvas
              </h2>
            </div>

            <div className="flex items-center gap-2 bg-[#050506] border border-white/10 p-1">
              {(["evidence", "sitemap", "flows"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] transition-all ${
                    activeTab === tab ? "bg-[#FF4B23] text-[#050506]" : "text-[#9B9B9B] hover:text-[#F4F3EF]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Canvas Display Frame */}
          <div className="border border-white/12 bg-[#050506] min-h-[550px] p-8 relative flex flex-col justify-between overflow-hidden">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-4 text-xs mono text-[#9B9B9B]">
              <span className="flex items-center gap-2 text-[#FF4B23]">
                <Terminal className="h-4 w-4" /> LIVE DISCOVERY STREAM: PROJECT_01
              </span>
              <span>CANVAS MODE: {activeTab.toUpperCase()}</span>
            </div>

            {activeTab === "evidence" && (
              <div className="grid md:grid-cols-3 gap-6 py-8">
                <div className="border border-white/10 bg-[#111214] p-6 space-y-3">
                  <span className="mono text-[10px] font-bold text-[#FF4B23]">RAW SOURCE #01</span>
                  <h4 className="text-base font-bold text-[#F4F3EF]">User Interview Transcript</h4>
                  <p className="text-xs text-[#9B9B9B] leading-6">"I spend 3 hours a day manually matching customer pain points to Jira tickets..."</p>
                </div>
                <div className="border border-white/10 bg-[#111214] p-6 space-y-3">
                  <span className="mono text-[10px] font-bold text-[#FF4B23]">EXTRACTED INSIGHT</span>
                  <h4 className="text-base font-bold text-[#F4F3EF]">Empathy Map Fragment</h4>
                  <p className="text-xs text-[#9B9B9B] leading-6">FEELS: Frustrated by context loss between product research and engineering handoff.</p>
                </div>
                <div className="border border-white/10 bg-[#111214] p-6 space-y-3">
                  <span className="mono text-[10px] font-bold text-[#FF4B23]">REQUIREMENT SPEC</span>
                  <h4 className="text-base font-bold text-[#F4F3EF]">REQ-01: Bidirectional Trace</h4>
                  <p className="text-xs text-[#9B9B9B] leading-6">System must maintain explicit trace links from source evidence to flow nodes.</p>
                </div>
              </div>
            )}

            {activeTab === "sitemap" && (
              <div className="py-12 text-center space-y-6">
                <Network className="mx-auto h-12 w-12 text-[#FF4B23]" />
                <h3 className="text-2xl font-bold text-[#F4F3EF]">Interactive 2D ELK Sitemap Canvas</h3>
                <p className="text-xs text-[#9B9B9B] max-w-lg mx-auto leading-6">
                  Automatically lays out product hierarchy, page routes, and structural parent-child relationships using spatial algorithms.
                </p>
              </div>
            )}

            {activeTab === "flows" && (
              <div className="py-12 text-center space-y-6">
                <Layers className="mx-auto h-12 w-12 text-[#FF4B23]" />
                <h3 className="text-2xl font-bold text-[#F4F3EF]">Branching Decision Flow Map</h3>
                <p className="text-xs text-[#9B9B9B] max-w-lg mx-auto leading-6">
                  Generates primary user journeys, decision nodes, and error recovery branches directly from synthesized requirements.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-white/10 pt-4 text-xs mono text-[#9B9B9B]">
              <span>PROVENANCE VERIFIED</span>
              <span className="text-[#FF4B23]">100% TRACEABLE TO RAW EVIDENCE</span>
            </div>
          </div>
        </div>
      </section>

      {/* DRAMATIC FULL-BLEED OFF-WHITE EDITORIAL SECTION */}
      <section className="bg-[#F1F0EC] text-[#050506] py-28 px-6 md:px-12 border-b border-[#050506]">
        <div className="mx-auto max-w-[1600px] space-y-20">
          
          <div className="space-y-4">
            <span className="mono text-xs font-black uppercase tracking-[0.22em] text-[#FF4B23] bg-[#FF4B23]/10 px-3 py-1 inline-block">
              THE LAYR DISCOVERY ARCHITECTURE
            </span>
            <h2 className="text-5xl sm:text-7xl md:text-8xl font-black uppercase tracking-[-0.06em] leading-none">
              FOUR MONOLITHIC STAGES.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="border-t-2 border-[#050506] pt-6 space-y-4">
              <span className="text-6xl font-black text-[#FF4B23] block">01</span>
              <h3 className="text-2xl font-black uppercase tracking-[-0.04em]">EVIDENCE SYNTHESIS</h3>
              <p className="text-sm text-[#050506]/75 leading-7 font-medium">
                Ingest customer interview notes, CSV feedback, and documents. Extract pain points and empathy tags without losing source text context.
              </p>
            </div>

            <div className="border-t-2 border-[#050506] pt-6 space-y-4">
              <span className="text-6xl font-black text-[#FF4B23] block">02</span>
              <h3 className="text-2xl font-black uppercase tracking-[-0.04em]">STRATEGY MATRIX</h3>
              <p className="text-sm text-[#050506]/75 leading-7 font-medium">
                Prioritize candidate features on an Impact vs. Effort matrix backed by evidence confidence scores and user story specs.
              </p>
            </div>

            <div className="border-t-2 border-[#050506] pt-6 space-y-4">
              <span className="text-6xl font-black text-[#FF4B23] block">03</span>
              <h3 className="text-2xl font-black uppercase tracking-[-0.04em]">2D SPATIAL CANVASES</h3>
              <p className="text-sm text-[#050506]/75 leading-7 font-medium">
                Automatically render 2D ELK sitemap graphs and decision flow diagrams directly from structured acceptance criteria.
              </p>
            </div>

            <div className="border-t-2 border-[#050506] pt-6 space-y-4">
              <span className="text-6xl font-black text-[#FF4B23] block">04</span>
              <h3 className="text-2xl font-black uppercase tracking-[-0.04em]">HEURISTIC AUDIT</h3>
              <p className="text-sm text-[#050506]/75 leading-7 font-medium">
                Verify generated wireframes and user flows against Nielsen Norman 10 Usability Heuristics and WCAG accessibility standards.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* MONOLITH CTA BAND */}
      <section className="bg-[#FF4B23] text-[#050506] py-24 px-6 md:px-12 text-center space-y-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <h2 className="text-5xl md:text-7xl font-black uppercase tracking-[-0.06em] leading-none">
            START YOUR DISCOVERY PROJECT.
          </h2>
          <p className="text-lg md:text-xl font-bold max-w-2xl mx-auto">
            Transform customer research into shippable user flows and PRD specifications in minutes.
          </p>
          <div className="pt-4">
            <Button
              onClick={() => setLocation("/signup")}
              className="h-16 px-10 text-lg font-black bg-[#050506] text-[#F4F3EF] hover:bg-white hover:text-[#050506] transition-all"
            >
              LAUNCH LAYR WORKSPACE <ArrowRight className="ml-3 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10 bg-[#050506] py-12 px-6 md:px-12 text-xs mono text-[#9B9B9B]">
        <div className="mx-auto max-w-[1600px] flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 bg-[#FF4B23]" />
            <span className="font-bold text-[#F4F3EF]">LAYR DISCOVERY PLATFORM</span>
          </div>
          <span>© 2026 LAYR SYSTEM. ALL RIGHTS RESERVED.</span>
        </div>
      </footer>
    </div>
  );
}
