import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, ChevronRight, FileText, GitBranch, Layers, Search, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export default function Home() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"evidence" | "sitemap" | "flows">("evidence");

  useEffect(() => {
    if (user) setLocation("/projects");
  }, [user, setLocation]);

  const capabilities = [
    { name: "User Research & File Import", cat: "01 / EVIDENCE" },
    { name: "Says, Thinks, Does, Feels Matrix", cat: "02 / SYNTHESIS" },
    { name: "Impact vs. Effort Feature Prioritization", cat: "03 / STRATEGY" },
    { name: "Automated PRD & Acceptance Criteria", cat: "04 / REQUIREMENTS" },
    { name: "Interactive 2D ELK Sitemap Graph", cat: "05 / ARCHITECTURE" },
    { name: "Branching Decision & Error Flow Graphs", cat: "06 / USER FLOWS" },
    { name: "Nielsen Norman 10 Heuristics Audit", cat: "07 / EVALUATION" },
    { name: "WCAG Accessibility Gap Identification", cat: "08 / ACCESSIBILITY" },
  ];

  return (
    <div className="min-h-screen bg-[#0B0C0E] text-[#F4F4F2] selection:bg-[#FF4A24] selection:text-[#0B0C0E] antialiased">
      
      {/* Studio Header Bar */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0B0C0E]/90 backdrop-blur-md px-8 py-4">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5">
              <div className="h-4 w-4 bg-[#FF4A24]" />
              <span className="text-lg font-black tracking-[-0.06em] text-[#F4F4F2]">LAYR</span>
            </div>
            <div className="hidden md:flex items-center gap-6 text-xs mono text-[#A5A7AA] border-l border-white/10 pl-6">
              <a href="#pipeline" className="hover:text-[#F4F4F2] transition-colors">PIPELINE</a>
              <a href="#canvas" className="hover:text-[#F4F4F2] transition-colors">CANVAS</a>
              <a href="#provenance" className="hover:text-[#F4F4F2] transition-colors">PROVENANCE</a>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button
              onClick={() => setLocation("/login")}
              variant="outline"
              className="h-9 rounded border border-white/12 bg-transparent px-4 text-xs font-bold text-[#F4F4F2] hover:border-white/30 hover:bg-white/5 transition-all"
            >
              Sign In
            </Button>
            <Button
              onClick={() => setLocation("/signup")}
              className="h-9 rounded bg-[#FF4A24] px-5 text-xs font-bold text-[#0B0C0E] hover:bg-[#FF5C38] transition-all shadow-[0_0_15px_rgba(255,74,36,0.35)]"
            >
              Start project <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-[1440px] px-8 py-16 md:py-24 space-y-32">
        
        {/* HERO SECTION — Studio Editorial Composition */}
        <section className="grid lg:grid-cols-[1.1fr_0.9fr] gap-16 items-start">
          
          <div className="space-y-10">
            <div className="space-y-4">
              <span className="mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#FF4A24]">
                AI PRODUCT DISCOVERY PLATFORM
              </span>

              <h1 className="text-5xl md:text-7xl lg:text-8xl font-black uppercase tracking-[-0.06em] leading-[0.92] text-[#F4F4F2]">
                RAW EVIDENCE TO SHIPPABLE PRODUCT.
              </h1>
            </div>

            <p className="max-w-xl text-lg md:text-xl font-normal leading-8 text-[#A5A7AA]">
              Layr eliminates fragmented tools by executing customer research, requirements, 2D sitemaps, and branching user flows in one continuous, traceable AI workspace.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Button
                onClick={() => setLocation("/signup")}
                className="h-12 rounded bg-[#FF4A24] px-8 text-sm font-bold text-[#0B0C0E] hover:bg-[#FF5C38] transition-all shadow-[0_0_20px_rgba(255,74,36,0.4)]"
              >
                Start project <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                onClick={() => setLocation("/login")}
                variant="outline"
                className="h-12 rounded border border-white/12 bg-[#111317] px-7 text-sm font-semibold text-[#F4F4F2] hover:border-white/30"
              >
                Sign in to workspace
              </Button>
            </div>

            {/* Giant Metric Anchors */}
            <div className="pt-10 border-t border-white/10 grid grid-cols-3 gap-8">
              <div>
                <span className="mono text-4xl md:text-6xl font-black text-[#FF4A24] block">07</span>
                <span className="mono text-[10px] uppercase tracking-[0.16em] text-[#A5A7AA] block mt-1">Integrated Stages</span>
              </div>
              <div>
                <span className="mono text-4xl md:text-6xl font-black text-[#F4F4F2] block">11+</span>
                <span className="mono text-[10px] uppercase tracking-[0.16em] text-[#A5A7AA] block mt-1">Parsed Formats</span>
              </div>
              <div>
                <span className="mono text-4xl md:text-6xl font-black text-[#F4F4F2] block">100%</span>
                <span className="mono text-[10px] uppercase tracking-[0.16em] text-[#A5A7AA] block mt-1">Source Traceability</span>
              </div>
            </div>
          </div>

          {/* Interactive Studio Preview Component (Real Product Visual UI) */}
          <div className="border border-white/12 bg-[#111317] rounded-lg overflow-hidden shadow-2xl space-y-0">
            
            {/* Window Top Bar */}
            <div className="flex items-center justify-between border-b border-white/10 bg-[#17191D] px-4 py-3 text-xs mono text-[#A5A7AA]">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#FF4A24]" />
                <span className="font-bold text-[#F4F4F2]">LAYR STUDIO CANVAS</span>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <button 
                  onClick={() => setActiveTab("evidence")} 
                  className={`px-2 py-1 rounded transition-colors ${activeTab === "evidence" ? "bg-[#FF4A24] text-[#0B0C0E] font-bold" : "hover:text-[#F4F4F2]"}`}
                >
                  EVIDENCE
                </button>
                <button 
                  onClick={() => setActiveTab("sitemap")} 
                  className={`px-2 py-1 rounded transition-colors ${activeTab === "sitemap" ? "bg-[#FF4A24] text-[#0B0C0E] font-bold" : "hover:text-[#F4F4F2]"}`}
                >
                  2D SITEMAP
                </button>
                <button 
                  onClick={() => setActiveTab("flows")} 
                  className={`px-2 py-1 rounded transition-colors ${activeTab === "flows" ? "bg-[#FF4A24] text-[#0B0C0E] font-bold" : "hover:text-[#F4F4F2]"}`}
                >
                  USER FLOWS
                </button>
              </div>
            </div>

            {/* Simulated Live Product Screen */}
            <div className="p-6 min-h-[380px] bg-[#0B0C0E] space-y-6">
              {activeTab === "evidence" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs mono border-b border-white/10 pb-3">
                    <span className="text-[#A5A7AA]">ATTACHED EVIDENCE FILES</span>
                    <span className="text-[#FF4A24] font-bold">3 SOURCES LINKED</span>
                  </div>
                  <div className="space-y-2">
                    <div className="border border-white/10 bg-[#111317] p-3 rounded flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-[#FF4A24]" />
                        <span className="font-medium text-[#F4F4F2]">user_interview_transcript_q3.docx</span>
                      </div>
                      <span className="mono text-[10px] text-[#A5A7AA]">EXTRACTED 8 PAIN POINTS</span>
                    </div>
                    <div className="border border-white/10 bg-[#111317] p-3 rounded flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-[#FF4A24]" />
                        <span className="font-medium text-[#F4F4F2]">customer_support_logs.pdf</span>
                      </div>
                      <span className="mono text-[10px] text-[#A5A7AA]">EXTRACTED 14 FEEDBACK ITEMS</span>
                    </div>
                  </div>
                  <div className="border border-[#FF4A24]/30 bg-[#FF4A24]/10 p-3 rounded text-xs leading-5 text-[#F4F4F2]">
                    <span className="mono font-bold text-[#FF4A24] block mb-1">AI TRACEABLE SYNTHESIS</span>
                    "Users report high cognitive friction when navigating nested setting menus without breadcrumbs."
                  </div>
                </div>
              )}

              {activeTab === "sitemap" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs mono border-b border-white/10 pb-3">
                    <span className="text-[#A5A7AA]">2D ELK IA GRAPH ENGINE</span>
                    <span className="text-[#FF4A24] font-bold">100% CANVAS WIDTH</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 pt-2">
                    <div className="border border-[#FF4A24] bg-[#111317] p-3 rounded text-center space-y-1">
                      <span className="mono text-[10px] text-[#FF4A24] block font-bold">ROOT SCREEN</span>
                      <span className="text-xs font-bold text-[#F4F4F2] block">Dashboard Home</span>
                    </div>
                    <div className="border border-white/12 bg-[#111317] p-3 rounded text-center space-y-1">
                      <span className="mono text-[10px] text-[#A5A7AA] block">CHILD SCREEN</span>
                      <span className="text-xs font-bold text-[#F4F4F2] block">Evidence Hub</span>
                    </div>
                    <div className="border border-white/12 bg-[#111317] p-3 rounded text-center space-y-1">
                      <span className="mono text-[10px] text-[#A5A7AA] block">CHILD SCREEN</span>
                      <span className="text-xs font-bold text-[#F4F4F2] block">Sitemap Graph</span>
                    </div>
                  </div>
                  <div className="p-3 border border-white/8 bg-[#17191D] text-center text-xs mono text-[#A5A7AA]">
                    ← Interactive ELK Graph Canvas with floating sidebars →
                  </div>
                </div>
              )}

              {activeTab === "flows" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs mono border-b border-white/10 pb-3">
                    <span className="text-[#A5A7AA]">BRANCHING USER DECISION GRAPH</span>
                    <span className="text-[#FF4A24] font-bold">ERROR BRANCHES CHECKED</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="p-3 border border-white/10 bg-[#111317] rounded flex items-center justify-between">
                      <span className="font-bold text-[#F4F4F2]">1. User clicks "Synthesize Evidence"</span>
                      <span className="mono text-[10px] text-[#FF4A24]">TRIGGER NODE</span>
                    </div>
                    <div className="p-3 border border-white/10 bg-[#111317] rounded flex items-center justify-between pl-6 border-l-2 border-l-[#FF4A24]">
                      <span className="font-medium text-[#A5A7AA]">2. Check authentication token & project permission</span>
                      <span className="mono text-[10px] text-[#A5A7AA]">DECISION NODE</span>
                    </div>
                    <div className="p-3 border border-white/10 bg-[#111317] rounded flex items-center justify-between pl-10">
                      <span className="font-bold text-[#F4F4F2]">3. Render Empathy Map & Key Findings</span>
                      <span className="mono text-[10px] text-[#FF4A24]">SUCCESS STATE</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>

        </section>


        {/* SECTION: 07-STAGE WORKFLOW (Studio Minimal Layout) */}
        <section id="pipeline" className="space-y-16 border-t border-white/10 pt-20">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <span className="mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#FF4A24]">
                CONTINUOUS EXECUTION
              </span>
              <h2 className="text-3xl md:text-5xl font-black tracking-[-0.05em] text-[#F4F4F2]">
                7 Integrated Stages of Product Discovery
              </h2>
            </div>
            <p className="text-sm text-[#A5A7AA] max-w-md leading-6">
              Each stage produces verified design artifacts without leaving the workspace.
            </p>
          </div>

          <div className="border border-white/10 bg-[#111317] divide-y divide-white/10">
            {[
              { num: "01", title: "Evidence Hub", detail: "Multi-format file ingestion (.pdf, .docx, .pptx, .csv, .txt) with AI pain-point tagging.", tag: "INPUT" },
              { num: "02", title: "Insights & Empathy Maps", detail: "Synthesize Says, Thinks, Does, Feels directly linked to raw interview quotes.", tag: "SYNTHESIS" },
              { num: "03", title: "Feature Candidate Matrix", detail: "Impact vs. Effort feature prioritization with evidence confidence scores.", tag: "STRATEGY" },
              { num: "04", title: "PRD Requirements", detail: "Generate detailed PRD user stories, acceptance criteria, and technical constraints.", tag: "SPECIFICATION" },
              { num: "05", title: "Information Architecture", detail: "Interactive 2D ELK sitemap graph canvas with 100% full-width sidebar collapse.", tag: "ARCHITECTURE" },
              { num: "06", title: "Branching User Flows", detail: "Interactive step-by-step decision graphs showing success paths & error states.", tag: "FLOWS" },
              { num: "07", title: "Heuristics & Gap Audit", detail: "Automated Nielsen Norman 10 Usability Heuristics & WCAG accessibility reach audit.", tag: "EVALUATION" },
            ].map((stage) => (
              <div key={stage.num} className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-white/[0.02] transition-colors group">
                <div className="flex items-start md:items-center gap-6">
                  <span className="mono text-2xl md:text-4xl font-black text-[#FF4A24]">{stage.num}</span>
                  <div>
                    <h3 className="text-lg md:text-xl font-bold text-[#F4F4F2] group-hover:text-[#FF4A24] transition-colors">
                      {stage.title}
                    </h3>
                    <p className="text-xs md:text-sm text-[#A5A7AA] mt-1 max-w-xl">
                      {stage.detail}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="mono text-[10px] uppercase tracking-[0.16em] text-[#A5A7AA] border border-white/10 px-3 py-1 bg-[#0B0C0E]">
                    {stage.tag}
                  </span>
                </div>
              </div>
            ))}
          </div>

        </section>


        {/* SECTION: EDITORIAL HIGH-CONTRAST MONOCHROME STATEMENT */}
        <section id="provenance" className="bg-[#F4F4F2] text-[#0B0C0E] p-12 md:p-24 rounded space-y-8">
          <div className="max-w-4xl space-y-6">
            <span className="mono text-xs font-black uppercase tracking-[0.25em] text-[#FF4A24] bg-[#FF4A24]/10 px-3.5 py-1.5 inline-block">
              SOURCE PROVENANCE
            </span>

            <h2 className="text-4xl md:text-7xl font-black uppercase tracking-[-0.05em] leading-[0.94] text-[#0B0C0E]">
              Reasoning that never loses its source.
            </h2>

            <p className="text-lg md:text-xl font-normal leading-8 text-neutral-800 max-w-3xl">
              In typical product workflows, context is lost between research notes, PRD documents, sitemaps, and design screens. Layr preserves bidirectional links from every node back to original customer evidence.
            </p>
          </div>
        </section>


        {/* SECTION: WARM RED-ORANGE ACCENT CALLOUT */}
        <section className="bg-[#FF4A24] text-[#0B0C0E] p-12 md:p-20 shadow-[0_0_50px_rgba(255,74,36,0.35)] space-y-8">
          <div className="max-w-4xl space-y-6">
            <span className="mono text-xs font-black uppercase tracking-[0.25em] bg-[#0B0C0E] text-[#F4F4F2] px-3.5 py-1.5 inline-block">
              NVIDIA NEMOTRON 3.5 AI ENGINE
            </span>

            <h2 className="text-4xl md:text-6xl font-black tracking-[-0.06em] leading-[0.96] uppercase text-[#0B0C0E]">
              BUILD PRODUCT SPECIFICATIONS IN ONE CONTINUOUS WORKSPACE.
            </h2>

            <div className="pt-2">
              <Button
                onClick={() => setLocation("/signup")}
                className="h-12 rounded bg-[#0B0C0E] px-8 text-sm font-bold text-[#F4F4F2] hover:bg-white hover:text-[#0B0C0E] transition-all shadow-xl"
              >
                Start project <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>


        {/* SECTION: CAPABILITIES MANIFEST (High-Density List) */}
        <section className="space-y-12 border-t border-white/10 pt-20">
          <div className="space-y-3">
            <span className="mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#FF4A24]">
              CAPABILITIES MANIFEST
            </span>
            <h2 className="text-3xl md:text-5xl font-black tracking-[-0.05em] text-[#F4F4F2]">
              UX & Product Discovery Engine
            </h2>
          </div>

          <div className="border border-white/10 bg-[#111317] p-8 md:p-12 grid md:grid-cols-2 gap-6">
            {capabilities.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between border-b border-white/8 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-1.5 w-1.5 bg-[#FF4A24]" />
                  <span className="text-sm font-bold text-[#F4F4F2]">{item.name}</span>
                </div>
                <span className="mono text-[10px] text-[#A5A7AA]">{item.cat}</span>
              </div>
            ))}
          </div>
        </section>


        {/* Studio Footer */}
        <footer className="border-t border-white/10 pt-10 pb-16 flex flex-col md:flex-row items-center justify-between text-xs text-[#A5A7AA] gap-6">
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 bg-[#FF4A24]" />
            <span className="font-black text-[#F4F4F2] text-sm">LAYR</span>
            <span>© 2026 Layr AI Product Discovery</span>
          </div>

          <div className="mono text-[10px] uppercase tracking-[0.18em] text-[#A5A7AA] flex gap-8">
            <span>NVIDIA NIM REASONING</span>
            <span>SUPABASE POSTGRES</span>
            <span>2D ELK GRAPH</span>
          </div>
        </footer>

      </main>
    </div>
  );
}
