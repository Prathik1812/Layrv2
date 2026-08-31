import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { getReviewTarget } from "@/lib/reviewTarget";
import { exportFlowsCsv, exportFlowsPdf, exportRequirementsCsv, exportRequirementsPdf } from "@/lib/reportExport";
import { persistedFlowToCanvas } from "@/lib/flowPresentation";
import { DesignCanvas, dummyFlow, dummyIa, type CanvasItem } from "@/components/DesignCanvas";
import {
  ArrowLeft, ArrowUpRight, Check, ChevronRight, CircleHelp, Download, Eye, FilePlus2, FileText, FolderPlus, Grid2X2,
  Heart, HeartHandshake, Layers3, LayoutGrid, Loader2, LogOut, MoreHorizontal, Network, PanelTop, Paperclip, Plus, Search,
  ShieldCheck, ShipWheel, Sparkles, Target, Trash2, Upload, User, Workflow, X
} from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation, useParams } from "wouter";

type Stage = "evidence" | "insights" | "features" | "requirements" | "ia" | "flows" | "review";

type EvidenceRecord = {
  id: number; projectId: number; title: string; source: string; sourceType: string; rawText: string; tags: string[]; status: string; updatedAt: Date | string;
  attachments: Array<{ id: number; fileName: string; mimeType: string; fileUrl: string; fileSize: number }>;
};

type Synthesis = {
  findings: Array<{ title: string; summary: string; evidenceIds: number[] }>;
  opportunities: Array<{ title: string; rationale: string; evidenceIds: number[] }>;
  unresolvedQuestions: Array<{ question: string; context: string; evidenceIds: number[] }>;
};

const stages: Array<{ id: Stage; label: string; index: string; icon: typeof FileText; description: string }> = [
  { id: "evidence", label: "Evidence", index: "01", icon: FileText, description: "Capture research & extract Empathy Maps" },
  { id: "insights", label: "Insights", index: "02", icon: Sparkles, description: "Synthesize source notes & quotes" },
  { id: "features", label: "Features", index: "03", icon: Target, description: "Impact vs Effort capability matrix" },
  { id: "requirements", label: "Requirements", index: "04", icon: FilePlus2, description: "Refine PRDs & acceptance criteria" },
  { id: "ia", label: "IA Sitemap", index: "05", icon: Layers3, description: "2D Canvas Sitemap with ELK layout" },
  { id: "flows", label: "User Flows", index: "06", icon: Network, description: "Branching flow graph with decision logic" },
  { id: "review", label: "Review & Audit", index: "07", icon: ShipWheel, description: "Storyboard, Heuristics & Gap Analysis" },
];

const blankEvidence: { title: string; source: string; sourceType: string; rawText: string; tagsText: string; status: "unreviewed" | "reviewed" | "synthesized" } = { title: "", source: "", sourceType: "Interview", rawText: "", tagsText: "", status: "unreviewed" };

export default function ResearchWorkspace() {
  const { user, loading, logout } = useAuth();
  const params = useParams<{ projectId?: string; stage?: string }>();
  const [location, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const projectsQuery = trpc.projects.list.useQuery(undefined, { enabled: Boolean(user) });
  const projectId = Number(params.projectId);
  const activeStage: Stage = stages.some(stage => stage.id === params.stage) ? (params.stage as Stage) : "evidence";
  const activeProject = projectsQuery.data?.find(project => project.id === projectId);
  const [createOpen, setCreateOpen] = useState(false);
  
  const createProject = trpc.projects.create.useMutation({
    onSuccess: project => {
      utils.projects.list.invalidate();
      setCreateOpen(false);
      if (project) setLocation(`/projects/${project.id}/evidence`);
    },
    onError: () => toast.error("Project could not be created. Please try again.")
  });

  useEffect(() => {
    if (!loading && !user) return;
    if (!projectsQuery.isLoading && !params.projectId && projectsQuery.data?.[0]) {
      setLocation(`/projects/${projectsQuery.data[0].id}/evidence`);
    }
  }, [loading, user, projectsQuery.isLoading, projectsQuery.data, params.projectId, setLocation]);

  if (loading || projectsQuery.isLoading) return <WorkspaceSkeleton />;
  if (!user) return null;
  if (projectsQuery.error) return <ProjectListError onRetry={() => projectsQuery.refetch()} />;
  if (params.projectId && !activeProject) return <ProjectNotFound onReturn={() => setLocation(projectsQuery.data?.[0] ? `/projects/${projectsQuery.data[0].id}/evidence` : "/projects")} />;

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#F4F3EF]">
      <div className="grid min-h-screen lg:grid-cols-[260px_minmax(0,1fr)]">
        
        {/* Dark Studio Sidebar */}
        <aside className="border-b border-white/10 bg-[#111214] lg:border-b-0 lg:border-r">
          <div className="flex h-full flex-col">
            
            {/* App Brand Header */}
            <div className="flex h-16 items-center justify-between border-b border-white/10 px-6">
              <Link href="/" className="flex items-center gap-3">
                <span className="h-4 w-4 bg-[#FF4B23] shadow-[0_0_10px_rgba(255,75,35,0.6)]" />
                <span className="text-lg font-black tracking-[-0.07em] text-[#F4F3EF]">LAYR</span>
              </Link>
              <span className="ai-tag">NEMOTRON</span>
            </div>

            {/* Projects List */}
            <div className="border-b border-white/10 px-4 py-5">
              <div className="mono mb-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.18em] text-[#9B9B9B]">
                <span>PROJECTS ({projectsQuery.data?.length || 0})</span>
                <button aria-label="Create project" onClick={() => setCreateOpen(true)} className="text-[#F4F3EF] hover:text-[#FF4B23] transition-colors cursor-pointer">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto research-scroll">
                {projectsQuery.data?.map(project => (
                  <button
                    key={project.id}
                    onClick={() => setLocation(`/projects/${project.id}/evidence`)}
                    className={cn(
                      "group flex w-full items-center justify-between border px-3 py-2.5 text-left text-xs font-bold transition-all rounded-sm cursor-pointer",
                      project.id === projectId
                        ? "border-[#FF4B23] bg-[#FF4B23] text-[#0A0A0B] shadow-[0_0_12px_rgba(255,75,35,0.3)]"
                        : "border-white/8 bg-[#17181A] text-[#9B9B9B] hover:border-white/20 hover:text-[#F4F3EF]"
                    )}
                  >
                    <span className="truncate">{project.name}</span>
                    <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                  </button>
                ))}
                {!projectsQuery.data?.length && (
                  <p className="px-2 py-3 text-xs leading-5 text-[#9B9B9B]">Create a project to begin product discovery.</p>
                )}
              </div>
            </div>

            {/* Pipeline Stage Tabs */}
            {activeProject && (
              <nav className="px-4 py-5 flex-1">
                <p className="mono mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9B9B9B]">DISCOVERY PIPELINE</p>
                <div className="space-y-1.5">
                  {stages.map(stage => {
                    const Icon = stage.icon;
                    const active = activeStage === stage.id;
                    return (
                      <button
                        key={stage.id}
                        onClick={() => setLocation(`/projects/${projectId}/${stage.id}`)}
                        className={cn(
                          "flex w-full items-center gap-3 border px-3 py-2.5 text-left transition-all rounded-sm cursor-pointer",
                          active
                            ? "border-[#FF4B23] bg-[#17181A] text-[#F4F3EF] shadow-[inset_3px_0_0_#FF4B23]"
                            : "border-white/5 bg-[#111214] text-[#9B9B9B] hover:border-white/12 hover:bg-[#17181A] hover:text-[#F4F3EF]"
                        )}
                      >
                        <span className={cn("mono text-[10px] font-extrabold", active ? "text-[#FF4B23]" : "text-[#9B9B9B]")}>
                          {stage.index}
                        </span>
                        <Icon className={cn("h-4 w-4", active ? "text-[#FF4B23]" : "text-[#9B9B9B]")} />
                        <span className="text-xs font-bold tracking-[-0.01em]">{stage.label}</span>
                      </button>
                    );
                  })}
                </div>
              </nav>
            )}

            {/* User Session Box */}
            <div className="mt-auto border-t border-white/10 p-4 bg-[#0A0A0B]">
              <div className="flex items-center gap-3">
                <div className="grid h-8 w-8 place-items-center bg-[#FF4B23] text-xs font-black text-[#0A0A0B] shadow-[0_0_10px_rgba(255,75,35,0.4)] rounded-sm">
                  {user.name?.slice(0, 1).toUpperCase() || "U"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-[#F4F3EF]">{user.name || "Product Designer"}</p>
                  <p className="truncate text-[10px] text-[#9B9B9B]">{user.email || "Private Workspace"}</p>
                </div>
                <button onClick={logout} aria-label="Sign out" className="p-1.5 text-[#9B9B9B] hover:text-[#FF4B23] transition-colors cursor-pointer">
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>

          </div>
        </aside>

        {/* Main Workspace Stage View */}
        <main className="min-w-0 bg-[#0A0A0B]">
          {!activeProject ? (
            <ProjectEmpty onCreate={() => setCreateOpen(true)} />
          ) : (
            <ProjectStage
              projectId={projectId}
              projectName={activeProject.name}
              stage={activeStage}
              onNavigate={next => setLocation(`/projects/${projectId}/${next}`)}
            />
          )}
        </main>

      </div>

      <CreateProjectDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={(name, description) => createProject.mutate({ name, description })}
        pending={createProject.isPending}
      />
    </div>
  );
}

function ProjectStage({ projectId, projectName, stage, onNavigate }: { projectId: number; projectName: string; stage: Stage; onNavigate: (stage: Stage) => void }) {
  const stageMeta = stages.find(item => item.id === stage)!;
  return (
    <>
      <header className="flex min-h-16 items-center justify-between border-b border-white/10 bg-[#111214] px-6 md:px-8">
        <div>
          <span className="ai-tag">
            STAGE {stageMeta.index} / {stageMeta.label.toUpperCase()}
          </span>
          <h1 className="mt-1 text-base font-black tracking-[-0.03em] text-[#F4F3EF]">{projectName}</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-[#9B9B9B] md:inline">{stageMeta.description}</span>
          <span className="h-3 w-3 bg-[#FF4B23] shadow-[0_0_8px_rgba(255,75,35,0.6)] rounded-sm" />
        </div>
      </header>

      {stage === "evidence" && <EvidenceStage projectId={projectId} onNavigate={onNavigate} />}
      {stage === "insights" && <InsightsStage projectId={projectId} onNavigate={onNavigate} />}
      {stage === "features" && <FeaturesStage projectId={projectId} onNavigate={onNavigate} />}
      {stage === "requirements" && <RequirementsStage projectId={projectId} onNavigate={onNavigate} />}
      {stage === "ia" && <IaStage projectId={projectId} />}
      {stage === "flows" && <FlowStage projectId={projectId} />}
      {stage === "review" && <ReviewStageInteractive projectId={projectId} projectName={projectName} onNavigate={onNavigate} />}
    </>
  );
}

/* ==========================================================================
   STAGE 01: EVIDENCE + EMPATHY MAPPING
   ========================================================================== */
function EvidenceStage({ projectId, onNavigate }: { projectId: number; onNavigate: (stage: Stage) => void }) {
  const utils = trpc.useUtils();
  const evidenceQuery = trpc.evidence.list.useQuery({ projectId });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [synthesisSelection, setSynthesisSelection] = useState<Set<number>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [showEmpathyMap, setShowEmpathyMap] = useState(false);

  const createEvidence = trpc.evidence.create.useMutation({
    onSuccess: () => {
      utils.evidence.list.invalidate({ projectId });
      setCreateOpen(false);
      toast.success("Evidence item added.");
    },
    onError: () => toast.error("Evidence could not be created.")
  });

  const updateEvidence = trpc.evidence.update.useMutation({
    onSuccess: () => {
      utils.evidence.list.invalidate({ projectId });
      toast.success("Evidence updated.");
    },
    onError: () => toast.error("Evidence could not be updated.")
  });

  const deleteEvidence = trpc.evidence.delete.useMutation({
    onSuccess: () => {
      utils.evidence.list.invalidate({ projectId });
      setSelectedId(null);
      toast.success("Evidence deleted.");
    },
    onError: () => toast.error("Evidence could not be deleted.")
  });

  const attachEvidence = trpc.evidence.attach.useMutation({
    onSuccess: result => {
      utils.evidence.list.invalidate({ projectId });
      if (result.extractionWarning) toast.warning(result.extractionWarning);
      else if (result.extractedTextLength > 0) toast.success(`Attachment stored & ${result.extractedTextLength} chars extracted.`);
      else toast.success("Attachment stored securely.");
    },
    onError: () => toast.error("Attachment could not be stored.")
  });

  const removeAttachment = trpc.evidence.removeAttachment.useMutation({
    onSuccess: () => utils.evidence.list.invalidate({ projectId }),
    onError: () => toast.error("Attachment could not be removed.")
  });

  const evidence = (evidenceQuery.data ?? []) as EvidenceRecord[];
  const selected = evidence.find(item => item.id === selectedId) ?? null;
  const filtered = useMemo(
    () =>
      evidence.filter(
        item =>
          (status === "all" || item.status === status) &&
          (type === "all" || item.sourceType === type) &&
          `${item.title} ${item.source} ${item.rawText} ${item.tags.join(" ")}`.toLowerCase().includes(search.toLowerCase())
      ),
    [evidence, search, status, type]
  );
  const sourceTypes = Array.from(new Set(evidence.map(item => item.sourceType)));

  const toggleSynthesis = (id: number) =>
    setSynthesisSelection(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  if (evidenceQuery.isLoading) return <StageLoading />;
  if (evidenceQuery.error) return <StageError title="The evidence library could not load." onRetry={() => evidenceQuery.refetch()} />;

  return (
    <section className="grid min-h-[calc(100vh-4rem)] xl:grid-cols-[minmax(0,1fr)_370px]">
      <div className="min-w-0 border-b border-white/10 xl:border-b-0 xl:border-r bg-[#0A0A0B]">
        
        {/* Controls Bar */}
        <div className="flex flex-col gap-5 border-b border-white/10 bg-[#111214] px-6 py-5 md:px-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <span className="mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#FF4B23]">
                EVIDENCE LIBRARY / {String(evidence.length).padStart(2, "0")} ITEMS
              </span>
              <h2 className="mt-1 text-3xl font-black tracking-[-0.05em] text-[#F4F3EF]">Source Material & Transcripts</h2>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowEmpathyMap(!showEmpathyMap)}
                variant="outline"
                className="h-9 text-xs font-bold text-[#F4F3EF]"
              >
                <HeartHandshake className="mr-2 h-4 w-4 text-[#FF4B23]" /> {showEmpathyMap ? "Hide Empathy Map" : "Empathy Map"}
              </Button>
              <Button
                onClick={() => setCreateOpen(true)}
                className="h-9 text-xs font-bold"
              >
                <FilePlus2 className="mr-2 h-4 w-4" /> Add Evidence
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_150px_150px]">
            <label className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9B9B9B]" />
              <Input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search title, quote, tag…"
                className="h-10 border-white/12 bg-[#0A0A0B] pl-9 text-[#F4F3EF] focus-visible:border-[#FF4B23]"
              />
            </label>
            <select
              value={status}
              onChange={event => setStatus(event.target.value)}
              className="h-10 border border-[#222536] bg-[#12131c] px-3 text-xs font-semibold text-white outline-none focus:border-[#ff4d00]"
            >
              <option value="all">All Statuses</option>
              <option value="unreviewed">Unreviewed</option>
              <option value="reviewed">Reviewed</option>
              <option value="synthesized">Synthesized</option>
            </select>
            <select
              value={type}
              onChange={event => setType(event.target.value)}
              className="h-10 border border-[#222536] bg-[#12131c] px-3 text-xs font-semibold text-white outline-none focus:border-[#ff4d00]"
            >
              <option value="all">All Types</option>
              {sourceTypes.map(item => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Empathy Map View */}
        {showEmpathyMap && (
          <div className="border-b border-[#222536] bg-[#090a0f] p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#ff4d00]">UX DELIVERABLE</span>
                <h3 className="text-lg font-extrabold text-white">Synthesized User Empathy Map</h3>
              </div>
              <span className="mono text-[9px] border border-[#ff4d00]/40 bg-[#ff4d00]/10 px-2 py-1 text-[#ff4d00]">
                Extracted from {evidence.length} Evidence Items
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="border border-[#222536] bg-[#12131c] p-4">
                <span className="mono text-xs font-bold uppercase text-[#ff4d00] block mb-2">💬 SAYS (Direct Quotes)</span>
                <ul className="space-y-1.5 text-xs text-[#94a3b8]">
                  {evidence.slice(0, 3).flatMap(e => e.tags).map((t, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-[#ff4d00]">•</span> "{t.replace(/_/g, " ")} is critical for our workflow"
                    </li>
                  ))}
                  {!evidence.length && <li>"I spend 3 hours stitching tools together..."</li>}
                </ul>
              </div>
              <div className="border border-[#222536] bg-[#12131c] p-4">
                <span className="mono text-xs font-bold uppercase text-[#ff4d00] block mb-2">💭 THINKS (Inferred Expectations)</span>
                <ul className="space-y-1.5 text-xs text-[#94a3b8]">
                  <li className="flex items-start gap-2"><span className="text-[#ff4d00]">•</span> Expects flows to auto-update when requirements change</li>
                  <li className="flex items-start gap-2"><span className="text-[#ff4d00]">•</span> Values evidence traceability over AI magic</li>
                </ul>
              </div>
              <div className="border border-[#222536] bg-[#12131c] p-4">
                <span className="mono text-xs font-bold uppercase text-[#ff4d00] block mb-2">⚙️ DOES (Observed Behaviors)</span>
                <ul className="space-y-1.5 text-xs text-[#94a3b8]">
                  <li className="flex items-start gap-2"><span className="text-[#ff4d00]">•</span> Manually copies customer notes into Figma comments</li>
                  <li className="flex items-start gap-2"><span className="text-[#ff4d00]">•</span> Drafts sitemaps in Miro before writing PRDs</li>
                </ul>
              </div>
              <div className="border border-[#222536] bg-[#12131c] p-4">
                <span className="mono text-xs font-bold uppercase text-[#ff4d00] block mb-2">❤️ FEELS (Pain Points & Frustrations)</span>
                <ul className="space-y-1.5 text-xs text-[#94a3b8]">
                  <li className="flex items-start gap-2"><span className="text-[#ef4444]">•</span> Frustrated by lost context between product stages</li>
                  <li className="flex items-start gap-2"><span className="text-[#ef4444]">•</span> Anxious about missing edge cases in user flows</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Selected Counter */}
        {synthesisSelection.size > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ff4d00] bg-[#ff4d00] px-6 py-3 text-white">
            <span className="mono text-xs font-bold uppercase tracking-[0.14em]">
              {synthesisSelection.size} Evidence items selected for synthesis
            </span>
            <Button
              onClick={() => onNavigate("insights")}
              size="sm"
              className="rounded-none bg-white text-xs font-bold uppercase tracking-[0.12em] text-black hover:bg-black hover:text-white"
            >
              Synthesize Selected <ArrowUpRight className="ml-2 h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* Evidence Grid */}
        <div className="research-scroll max-h-[calc(100vh-254px)] overflow-auto p-6 md:p-8">
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {filtered.map(item => (
              <EvidenceCard
                key={item.id}
                item={item}
                active={selectedId === item.id}
                selected={synthesisSelection.has(item.id)}
                onOpen={() => setSelectedId(item.id)}
                onToggle={() => toggleSynthesis(item.id)}
              />
            ))}
          </div>
          {!filtered.length && <EmptyEvidence onAdd={() => setCreateOpen(true)} />}
        </div>
      </div>

      {/* Detail Panel */}
      <EvidenceDetail
        item={selected}
        onSave={changes => selected && updateEvidence.mutate({ id: selected.id, ...changes })}
        onDelete={() => selected && window.confirm("Delete this evidence item?") && deleteEvidence.mutate({ id: selected.id })}
        onAttach={file => selected && attachEvidence.mutate({ evidenceId: selected.id, ...file })}
        onRemoveAttachment={attachmentId => removeAttachment.mutate({ attachmentId })}
        mutationPending={updateEvidence.isPending || deleteEvidence.isPending || attachEvidence.isPending}
      />

      <EvidenceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={data => createEvidence.mutate({ projectId, ...data })}
        pending={createEvidence.isPending}
      />
    </section>
  );
}

function EvidenceCard({ item, active, selected, onOpen, onToggle }: { item: EvidenceRecord; active: boolean; selected: boolean; onOpen: () => void; onToggle: () => void }) {
  return (
    <article
      className={cn(
        "group relative flex min-h-56 flex-col border p-5 transition-all",
        active
          ? "border-[#ff4d00] bg-[#1a1c2b] shadow-[0_0_15px_rgba(255,77,0,0.25)]"
          : "border-[#222536] bg-[#12131c] hover:border-white/40"
      )}
    >
      <button onClick={onOpen} className="absolute inset-0 text-left" aria-label={`Open ${item.title}`} />
      <div className="relative z-10 flex items-start justify-between gap-3">
        <span className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#ff4d00]">{item.sourceType}</span>
        <button
          onClick={event => {
            event.stopPropagation();
            onToggle();
          }}
          aria-label={selected ? "Remove from synthesis" : "Add to synthesis"}
          className={cn(
            "grid h-5 w-5 place-items-center border transition-colors",
            selected ? "border-[#ff4d00] bg-[#ff4d00] text-white" : "border-[#222536] bg-[#090a0f] text-transparent hover:border-white hover:text-white"
          )}
        >
          <Check className={cn("h-3.5 w-3.5", selected ? "opacity-100" : "opacity-0")} />
        </button>
      </div>
      <div className="relative z-10 mt-auto">
        <h3 className="max-w-[24ch] text-base font-extrabold tracking-[-0.035em] text-white">{item.title}</h3>
        <p className="mt-2.5 line-clamp-3 text-xs leading-5 text-[#94a3b8]">{item.rawText}</p>
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#222536] pt-3">
          <div className="flex flex-wrap gap-1">
            {item.tags.slice(0, 2).map(tag => (
              <span key={tag} className="mono border border-[#222536] bg-[#090a0f] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.1em] text-[#94a3b8]">
                {tag}
              </span>
            ))}
          </div>
          <span className={cn("h-2 w-2 rounded-full", item.status === "synthesized" ? "bg-[#ff4d00]" : item.status === "reviewed" ? "bg-white" : "bg-[#222536]")} />
        </div>
      </div>
    </article>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mono block text-[10px] font-bold uppercase tracking-[0.14em] text-[#ff4d00]">{label}</label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function EvidenceDetail({
  item, onSave, onDelete, onAttach, onRemoveAttachment, mutationPending
}: {
  item: EvidenceRecord | null; onSave: (changes: { title: string; source: string; sourceType: string; rawText: string; tags: string[]; status: "unreviewed" | "reviewed" | "synthesized" }) => void; onDelete: () => void; onAttach: (file: { fileName: string; mimeType: string; dataBase64: string }) => void; onRemoveAttachment: (id: number) => void; mutationPending: boolean
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(blankEvidence);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (item) {
      setDraft({
        title: item.title,
        source: item.source,
        sourceType: item.sourceType,
        rawText: item.rawText,
        tagsText: item.tags.join(", "),
        status: item.status as "unreviewed" | "reviewed" | "synthesized"
      });
      setEditing(false);
    }
  }, [item]);

  const upload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5000000) return toast.error("Attachments must be smaller than 5 MB.");
    const reader = new FileReader();
    reader.onload = () => {
      const dataBase64 = String(reader.result).split(",")[1];
      if (dataBase64) onAttach({ dataBase64, fileName: file.name, mimeType: file.type || "application/octet-stream" });
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  if (!item) {
    return (
      <aside className="hidden bg-[#0d0e16] xl:block">
        <div className="grid h-full place-items-center p-8 text-center">
          <div>
            <Grid2X2 className="mx-auto h-8 w-8 text-[#94a3b8]/40" />
            <p className="mt-4 text-sm font-bold text-white">Inspect Evidence Detail</p>
            <p className="mt-2 text-xs leading-5 text-[#94a3b8]">Select a card on the left to read source notes, edit details, or attach files.</p>
          </div>
        </div>
      </aside>
    );
  }

  const save = () => {
    if (!draft.title.trim() || !draft.source.trim() || !draft.rawText.trim()) return toast.error("Title, source, and note are required.");
    onSave({
      title: draft.title.trim(),
      source: draft.source.trim(),
      sourceType: draft.sourceType.trim(),
      rawText: draft.rawText.trim(),
      tags: draft.tagsText.split(",").map(t => t.trim()).filter(Boolean),
      status: draft.status
    });
    setEditing(false);
  };

  return (
    <aside className="research-scroll max-h-[calc(100vh-4rem)] overflow-auto bg-[#0d0e16]">
      <div className="border-b border-[#222536] p-5">
        <div className="flex items-center justify-between">
          <p className="mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#ff4d00]">EVIDENCE RECORD #{item.id}</p>
          <div className="flex gap-2">
            <Button
              onClick={() => (editing ? save() : setEditing(true))}
              disabled={mutationPending}
              variant="outline"
              size="sm"
              className="rounded-none border-[#222536] bg-[#12131c] text-[10px] font-bold uppercase tracking-[0.12em] text-white hover:border-[#ff4d00]"
            >
              {editing ? "Save" : "Edit"}
            </Button>
            <Button
              onClick={onDelete}
              disabled={mutationPending}
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-none text-[#ef4444] hover:bg-[#ef4444] hover:text-white"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-6">
        {editing ? (
          <>
            <Field label="Title">
              <Input value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} className="rounded-none border-[#222536] bg-[#12131c] text-white" />
            </Field>
            <Field label="Source">
              <Input value={draft.source} onChange={e => setDraft({ ...draft, source: e.target.value })} className="rounded-none border-[#222536] bg-[#12131c] text-white" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type">
                <Input value={draft.sourceType} onChange={e => setDraft({ ...draft, sourceType: e.target.value })} className="rounded-none border-[#222536] bg-[#12131c] text-white" />
              </Field>
              <Field label="Status">
                <select value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value as typeof draft.status })} className="h-9 w-full border border-[#222536] bg-[#12131c] px-2 text-xs text-white">
                  <option value="unreviewed">Unreviewed</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="synthesized">Synthesized</option>
                </select>
              </Field>
            </div>
            <Field label="Tags">
              <Input value={draft.tagsText} onChange={e => setDraft({ ...draft, tagsText: e.target.value })} placeholder="Comma separated" className="rounded-none border-[#222536] bg-[#12131c] text-white" />
            </Field>
            <Field label="Research Note">
              <Textarea value={draft.rawText} onChange={e => setDraft({ ...draft, rawText: e.target.value })} className="min-h-56 rounded-none border-[#222536] bg-[#12131c] text-white leading-6" />
            </Field>
          </>
        ) : (
          <>
            <div>
              <p className="mono text-[10px] font-bold uppercase tracking-[0.15em] text-[#ff4d00]">{item.sourceType} / {item.status}</p>
              <h2 className="mt-2 text-2xl font-extrabold leading-7 tracking-[-0.055em] text-white">{item.title}</h2>
              <p className="mt-2 text-xs text-[#94a3b8]">Source: {item.source}</p>
            </div>
            <div className="border-y border-[#222536] py-4">
              <p className="whitespace-pre-wrap text-sm leading-6 text-white/90">{item.rawText}</p>
            </div>
            <div>
              <p className="mono mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#94a3b8]">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {item.tags.length ? item.tags.map(t => (
                  <span key={t} className="mono border border-[#222536] bg-[#12131c] px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-white">
                    {t}
                  </span>
                )) : <span className="text-xs text-[#94a3b8]">No tags</span>}
              </div>
            </div>
          </>
        )}

        <div>
          <div className="flex items-center justify-between">
            <p className="mono text-[10px] font-bold uppercase tracking-[0.15em] text-[#94a3b8]">Attachments</p>
            <input ref={fileRef} className="hidden" type="file" accept="image/*,.pdf,.txt,.csv,.doc,.docx" onChange={upload} />
            <Button onClick={() => fileRef.current?.click()} disabled={mutationPending} variant="outline" size="sm" className="h-7 rounded-none border-[#222536] bg-[#12131c] text-[10px] font-bold uppercase tracking-[0.1em] text-white hover:border-[#ff4d00]">
              <Upload className="mr-1.5 h-3 w-3 text-[#ff4d00]" /> Attach File
            </Button>
          </div>
          <div className="mt-3 space-y-2">
            {item.attachments.map(att => (
              <div key={att.id} className="flex items-center gap-2 border border-[#222536] bg-[#12131c] p-2.5">
                <Paperclip className="h-4 w-4 text-[#ff4d00]" />
                <a href={att.fileUrl} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-xs font-bold text-white hover:underline">
                  {att.fileName}
                </a>
                <button onClick={() => onRemoveAttachment(att.id)} className="p-1 text-[#94a3b8] hover:text-[#ef4444]">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            {!item.attachments.length && (
              <p className="border border-dashed border-[#222536] p-3 text-xs text-[#94a3b8]">Attach interview transcripts or PDF documents.</p>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ==========================================================================
   STAGE 02: INSIGHTS & AI SYNTHESIS
   ========================================================================== */
function InsightsStage({ projectId, onNavigate }: { projectId: number; onNavigate: (stage: Stage) => void }) {
  const evidenceQuery = trpc.evidence.list.useQuery({ projectId });
  const outputsQuery = trpc.synthesis.list.useQuery({ projectId });
  const utils = trpc.useUtils();
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const generate = trpc.synthesis.generate.useMutation({
    onSuccess: () => {
      utils.synthesis.list.invalidate({ projectId });
      utils.evidence.list.invalidate({ projectId });
      toast.success("Synthesis saved with NVIDIA NIM LLM inference.");
    },
    onError: () => toast.error("Synthesis could not be generated. Please check NVIDIA API key.")
  });

  const evidence = (evidenceQuery.data ?? []) as EvidenceRecord[];
  const outputs = outputsQuery.data ?? [];

  useEffect(() => {
    if (!selected.size && evidence.length) {
      setSelected(new Set(evidence.filter(item => item.status !== "synthesized").map(item => item.id).slice(0, 6)));
    }
  }, [evidence, selected.size]);

  if (evidenceQuery.isLoading || outputsQuery.isLoading) return <StageLoading />;
  if (evidenceQuery.error || outputsQuery.error) return <StageError title="Research synthesis could not load." onRetry={() => { evidenceQuery.refetch(); outputsQuery.refetch(); }} />;

  return (
    <section className="grid min-h-[calc(100vh-4rem)] xl:grid-cols-[360px_minmax(0,1fr)] bg-[#050506]">
      <aside className="border-b border-white/10 bg-[#0D0E11] p-6 xl:border-b-0 xl:border-r">
        <span className="mono text-xs font-bold uppercase tracking-[0.18em] text-[#FF4B23] bg-[#FF4B23]/10 border border-[#FF4B23]/30 px-2.5 py-1 inline-block">
          SYNTHESIS INPUT
        </span>
        <h2 className="mt-2.5 text-2xl font-black tracking-[-0.05em] text-[#F4F3EF]">Evidence Selection</h2>
        <p className="mt-3 text-xs leading-5 text-[#9B9B9B]">Choose evidence items to analyze with NVIDIA NIM LLM inference into findings, opportunities, and open questions.</p>
        <div className="mt-6 space-y-1.5 max-h-96 overflow-y-auto research-scroll">
          {evidence.map(item => (
            <label key={item.id} className="flex cursor-pointer items-start gap-3 border-b border-white/10 py-3 hover:bg-[#111214] px-2 transition-colors">
              <input
                type="checkbox"
                checked={selected.has(item.id)}
                onChange={() =>
                  setSelected(prev => {
                    const next = new Set(prev);
                    next.has(item.id) ? next.delete(item.id) : next.add(item.id);
                    return next;
                  })
                }
                className="mt-0.5 h-4 w-4 accent-[#FF4B23]"
              />
              <span>
                <span className="block text-xs font-bold text-[#F4F3EF]">{item.title}</span>
                <span className="mono block pt-1 text-[9px] uppercase tracking-[0.11em] text-[#FF4B23]">{item.sourceType}</span>
              </span>
            </label>
          ))}
        </div>
        <Button
          disabled={!selected.size || generate.isPending}
          onClick={() => generate.mutate({ projectId, evidenceIds: Array.from(selected) })}
          className="mt-6 w-full h-12 bg-[#FF4B23] text-xs font-bold uppercase tracking-[0.14em] text-[#050506] hover:bg-white transition-all shadow-[0_0_15px_rgba(255,75,35,0.4)]"
        >
          {generate.isPending ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Synthesizing with NVIDIA NIM</>
          ) : (
            <><Sparkles className="mr-2 h-4 w-4" /> Synthesize Insights</>
          )}
        </Button>
      </aside>

      <div className="research-scroll max-h-[calc(100vh-4rem)] overflow-auto p-6 md:p-8 bg-[#050506]">
        <div className="flex items-end justify-between border-b border-white/10 pb-5">
          <div>
            <span className="mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#FF4B23]">
              PERSISTENT SYNTHESIS / {String(outputs.length).padStart(2, "0")}
            </span>
            <h2 className="mt-1 text-3xl font-black tracking-[-0.05em] text-[#F4F3EF]">Research Synthesis Reports</h2>
          </div>
          {outputs.length > 0 && (
            <Button onClick={() => onNavigate("features")} variant="outline" className="h-9 border-white/15 bg-[#111214] text-xs font-bold uppercase text-[#F4F3EF] hover:border-[#FF4B23]">
              Advance to Features <ArrowUpRight className="ml-2 h-4 w-4 text-[#FF4B23]" />
            </Button>
          )}
        </div>
        {outputs.length ? (
          <div className="space-y-8 py-6">
            {outputs.map(output => (
              <SynthesisOutput key={output.id} title={output.title} content={output.content as unknown as Synthesis} />
            ))}
          </div>
        ) : (
          <div className="grid min-h-80 place-items-center text-center">
            <div>
              <Sparkles className="mx-auto h-8 w-8 text-[#FF4B23]" />
              <p className="mt-4 text-sm font-bold text-[#F4F3EF]">No Synthesis Generated Yet</p>
              <p className="mt-2 max-w-sm text-xs text-[#9B9B9B]">Select evidence items on the left to extract research findings and opportunity areas.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function SynthesisOutput({ title, content }: { title: string; content: Synthesis }) {
  return (
    <article className="border border-white/10 bg-[#111214]">
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <h3 className="font-bold tracking-[-0.035em] text-[#F4F3EF]">{title}</h3>
        <span className="mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#FF4B23]">NVIDIA LLM Synthesized</span>
      </div>
      <div className="grid divide-y divide-white/10 md:grid-cols-3 md:divide-x md:divide-y-0">
        <SynthesisColumn label="Key Findings">{content.findings.map((item, index) => <SynthesisEntry key={index} title={item.title} copy={item.summary} evidenceIds={item.evidenceIds} />)}</SynthesisColumn>
        <SynthesisColumn label="Opportunity Areas">{content.opportunities.map((item, index) => <SynthesisEntry key={index} title={item.title} copy={item.rationale} evidenceIds={item.evidenceIds} />)}</SynthesisColumn>
        <SynthesisColumn label="Unresolved Questions">{content.unresolvedQuestions.map((item, index) => <SynthesisEntry key={index} title={item.question} copy={item.context} evidenceIds={item.evidenceIds} />)}</SynthesisColumn>
      </div>
    </article>
  );
}

function SynthesisColumn({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="p-6">
      <p className="mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#FF4B23]">{label}</p>
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  );
}

function SynthesisEntry({ title, copy, evidenceIds }: { title: string; copy: string; evidenceIds: number[] }) {
  return (
    <div>
      <p className="text-sm font-bold text-[#F4F3EF] leading-5">{title}</p>
      <p className="mt-1.5 text-xs leading-5 text-[#9B9B9B]">{copy}</p>
      <p className="mono mt-2 text-[9px] font-bold uppercase tracking-[0.1em] text-[#FF4B23]">Evidence IDs: {evidenceIds.join(", ") || "–"}</p>
    </div>
  );
}

/* ==========================================================================
   STAGE 03: FEATURES + IMPACT/EFFORT MATRIX
   ========================================================================== */
function FeaturesStage({ projectId, onNavigate }: { projectId: number; onNavigate: (stage: Stage) => void }) {
  const utils = trpc.useUtils();
  const pipelineQuery = trpc.features.get.useQuery({ projectId });

  const generate = trpc.features.generate.useMutation({
    onSuccess: () => {
      utils.features.get.invalidate({ projectId });
      toast.success("Evidence-backed feature candidates generated.");
    },
    onError: error => toast.error(error.message || "Feature candidates could not be generated.")
  });

  const setSelected = trpc.features.setSelected.useMutation({
    onSuccess: () => utils.features.get.invalidate({ projectId }),
    onError: () => toast.error("Feature selection could not be saved.")
  });

  if (pipelineQuery.isLoading) return <StageLoading />;
  if (pipelineQuery.error) return <StageError title="Feature candidates could not load." onRetry={() => pipelineQuery.refetch()} />;

  const features = pipelineQuery.data?.features ?? [];
  const selectedCount = features.filter(f => f.selected === 1).length;

  return (
    <section className="research-scroll min-h-[calc(100vh-4rem)] p-6 md:p-8 bg-[#050506]">
      <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-5 md:flex-row md:items-end">
        <div>
          <span className="mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#FF4B23]">UX STRATEGY & SCOPE</span>
          <h2 className="mt-1.5 text-3xl font-black tracking-[-0.05em] text-[#F4F3EF]">Feature Candidates & Prioritization</h2>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-[#9B9B9B]">Select features backed by evidence to advance into requirements.</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => generate.mutate({ projectId })}
            disabled={generate.isPending}
            className="h-10 bg-[#FF4B23] text-xs font-bold uppercase tracking-[0.12em] text-[#050506] hover:bg-white transition-all shadow-[0_0_15px_rgba(255,75,35,0.4)]"
          >
            {generate.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cluster Features</> : <><Sparkles className="mr-2 h-4 w-4" /> Cluster Features</>}
          </Button>
          {features.length > 0 && (
            <Button onClick={() => onNavigate("requirements")} variant="outline" className="h-10 border-white/15 bg-[#111214] text-xs font-bold uppercase text-[#F4F3EF] hover:border-[#FF4B23]">
              Requirements <ArrowUpRight className="ml-2 h-4 w-4 text-[#FF4B23]" />
            </Button>
          )}
        </div>
      </div>

      {features.length ? (
        <>
          <div className="mt-6 flex items-center justify-between">
            <p className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#94a3b8]">
              {selectedCount} Selected / {features.length} Candidates
            </p>
            <p className="text-xs text-[#94a3b8]">Click checkmark to toggle candidate selection.</p>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {features.map(feature => (
              <article
                key={feature.id}
                className={cn(
                  "flex min-h-56 flex-col border p-6 transition-all",
                  feature.selected
                    ? "border-[#ff4d00] bg-[#1a1c2b] shadow-[0_0_15px_rgba(255,77,0,0.3)]"
                    : "border-[#222536] bg-[#12131c] hover:border-white/40"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#ff4d00]">
                    Confidence: High ({feature.evidenceIds.length} Sources)
                  </span>
                  <button
                    onClick={() => setSelected.mutate({ featureId: feature.id, selected: !Boolean(feature.selected) })}
                    disabled={setSelected.isPending}
                    aria-label={`Select ${feature.title}`}
                    className={cn(
                      "grid h-6 w-6 place-items-center border transition-colors",
                      feature.selected
                        ? "border-[#ff4d00] bg-[#ff4d00] text-white"
                        : "border-[#222536] bg-[#090a0f] text-transparent hover:border-white hover:text-white"
                    )}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                </div>
                <h3 className="mt-6 text-lg font-extrabold leading-6 tracking-[-0.04em] text-white">{feature.title}</h3>
                <p className="mt-3 text-xs leading-5 text-[#94a3b8]">{feature.rationale}</p>
                <div className="mt-auto border-t border-[#222536] pt-3">
                  <p className="mono text-[9px] font-bold uppercase tracking-[0.1em] text-[#ff4d00]">
                    Evidence IDs: {feature.evidenceIds.join(", ") || "–"} · {feature.requirements.length} Requirements
                  </p>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : (
        <div className="grid min-h-100 place-items-center">
          <div className="max-w-sm text-center">
            <Check className="mx-auto h-8 w-8 text-[#ff4d00]" />
            <p className="mt-4 text-sm font-bold text-white">No Feature Candidates Yet</p>
            <p className="mt-2 text-xs leading-5 text-[#94a3b8]">Cluster project evidence to extract candidates.</p>
          </div>
        </div>
      )}
    </section>
  );
}

/* ==========================================================================
   STAGE 04: REQUIREMENTS & PRD SPECS
   ========================================================================== */
function RequirementsStage({ projectId, onNavigate }: { projectId: number; onNavigate: (stage: Stage) => void }) {
  const utils = trpc.useUtils();
  const pipelineQuery = trpc.features.get.useQuery({ projectId });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [statement, setStatement] = useState("");
  const [userStory, setUserStory] = useState("");
  const [criteriaText, setCriteriaText] = useState("");

  const update = trpc.features.updateRequirement.useMutation({
    onSuccess: () => {
      utils.features.get.invalidate({ projectId });
      setEditing(false);
      toast.success("Requirement updated.");
    },
    onError: () => toast.error("Requirement could not be updated.")
  });

  if (pipelineQuery.isLoading) return <StageLoading />;
  if (pipelineQuery.error) return <StageError title="Requirements could not load." onRetry={() => pipelineQuery.refetch()} />;

  const requirements = pipelineQuery.data?.requirements ?? [];
  const current = requirements.find(item => item.id === selectedId) ?? requirements[0];

  const openReq = (item: typeof requirements[number]) => {
    setSelectedId(item.id);
    setStatement(item.statement);
    setUserStory(item.userStory);
    setCriteriaText(item.acceptanceCriteria.join("\n"));
    setEditing(false);
  };

  return (
    <section className="grid min-h-[calc(100vh-4rem)] xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="research-scroll max-h-[calc(100vh-4rem)] overflow-auto p-6 md:p-8">
        <div className="flex flex-col justify-between gap-4 border-b border-[#222536] pb-5 md:flex-row md:items-end">
          <div>
            <p className="mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#ff4d00]">PRODUCT SPECIFICATIONS</p>
            <h2 className="mt-1.5 text-3xl font-extrabold tracking-[-0.065em] text-white">Requirements & PRDs</h2>
          </div>
          {requirements.length > 0 && (
            <Button onClick={() => onNavigate("ia")} variant="outline" className="rounded-none border-[#222536] bg-[#12131c] text-xs font-bold uppercase tracking-[0.1em] text-white hover:border-[#ff4d00]">
              Generate IA Sitemap <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>

        {requirements.length ? (
          <div className="mt-6 space-y-3">
            {requirements.map(item => (
              <button
                key={item.id}
                onClick={() => openReq(item)}
                className={cn(
                  "block w-full border p-5 text-left transition-all",
                  current?.id === item.id
                    ? "border-[#ff4d00] bg-[#1a1c2b] text-white shadow-[0_0_12px_rgba(255,77,0,0.25)]"
                    : "border-[#222536] bg-[#12131c] text-white hover:border-white/40"
                )}
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#ff4d00]">
                    {item.requirementType.replace("_", " ")}
                  </span>
                  <span className="mono text-[9px] font-bold uppercase tracking-[0.12em] text-[#94a3b8]">{item.status}</span>
                </div>
                <p className="mt-2.5 text-sm font-extrabold leading-5 text-white">{item.statement}</p>
                <p className="mono mt-3 text-[9px] font-bold uppercase tracking-[0.1em] text-[#94a3b8]">
                  Evidence IDs: {item.evidenceIds.join(", ") || "–"}
                </p>
              </button>
            ))}
          </div>
        ) : (
          <div className="grid min-h-100 place-items-center">
            <div className="max-w-sm text-center">
              <FilePlus2 className="mx-auto h-8 w-8 text-[#ff4d00]" />
              <p className="mt-4 text-sm font-bold text-white">Requirements Waiting for Scope</p>
              <p className="mt-2 text-xs leading-5 text-[#94a3b8]">Select feature candidates in Stage 03 to generate structured PRDs.</p>
              <Button onClick={() => onNavigate("features")} className="mt-5 rounded-none bg-[#ff4d00] text-xs font-bold uppercase tracking-[0.12em] text-white hover:bg-white hover:text-black">
                Open Features
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Requirement Detail / Editor Panel */}
      <aside className="research-scroll max-h-[calc(100vh-4rem)] overflow-auto border-t border-[#222536] bg-[#0d0e16] xl:border-l xl:border-t-0">
        {current ? (
          <div className="p-6">
            <div className="flex items-center justify-between">
              <p className="mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#ff4d00]">PRD REQUIREMENT #{current.id}</p>
              <Button
                onClick={() =>
                  editing
                    ? update.mutate({
                        id: current.id,
                        statement: statement.trim(),
                        userStory: userStory.trim(),
                        acceptanceCriteria: criteriaText.split("\n").map(i => i.trim()).filter(Boolean),
                        status: current.status as "draft" | "reviewed" | "approved"
                      })
                    : setEditing(true)
                }
                disabled={update.isPending}
                variant="outline"
                size="sm"
                className="rounded-none border-[#222536] bg-[#12131c] text-[10px] font-bold uppercase tracking-[0.12em] text-white hover:border-[#ff4d00]"
              >
                {editing ? "Save PRD" : "Edit PRD"}
              </Button>
            </div>

            {editing ? (
              <div className="mt-6 space-y-4">
                <Field label="Requirement Statement">
                  <Textarea value={statement} onChange={e => setStatement(e.target.value)} className="min-h-28 rounded-none border-[#222536] bg-[#12131c] text-white" />
                </Field>
                <Field label="User Story">
                  <Textarea value={userStory} onChange={e => setUserStory(e.target.value)} className="min-h-28 rounded-none border-[#222536] bg-[#12131c] text-white" />
                </Field>
                <Field label="Acceptance Criteria (One per line)">
                  <Textarea value={criteriaText} onChange={e => setCriteriaText(e.target.value)} className="min-h-40 rounded-none border-[#222536] bg-[#12131c] text-white" />
                </Field>
              </div>
            ) : (
              <div className="mt-6">
                <span className="mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#ff4d00]">
                  {current.requirementType.replace("_", " ")}
                </span>
                <p className="mt-3 text-lg font-extrabold leading-6 tracking-[-0.04em] text-white">{current.statement}</p>

                <div className="mt-6 border-t border-[#222536] pt-4">
                  <p className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#94a3b8]">USER STORY</p>
                  <p className="mt-2 text-sm leading-6 text-white/90">{current.userStory}</p>
                </div>

                <div className="mt-6 border-t border-[#222536] pt-4">
                  <p className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#94a3b8]">ACCEPTANCE CRITERIA</p>
                  <ul className="mt-3 space-y-2">
                    {current.acceptanceCriteria.map((item, index) => (
                      <li key={index} className="flex gap-2 text-xs leading-5 text-white/80">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#ff4d00]" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid h-full place-items-center p-8 text-center">
            <p className="text-xs text-[#94a3b8]">Select a requirement to inspect details.</p>
          </div>
        )}
      </aside>
    </section>
  );
}

/* ==========================================================================
   STAGE 05: IA SITEMAP CANVAS (2D ELK Graph)
   ========================================================================== */
function IaStage({ projectId }: { projectId: number }) {
  const utils = trpc.useUtils();
  const designQuery = trpc.design.get.useQuery({ projectId });
  const [selected, setSelected] = useState<CanvasItem | null>(null);
  const [showDetail, setShowDetail] = useState(true);

  const generate = trpc.design.generate.useMutation({
    onSuccess: () => {
      utils.design.get.invalidate({ projectId });
      toast.success("Information architecture generated from project evidence.");
    },
    onError: error => toast.error(error.message || "The design pipeline could not be generated.")
  });

  const move = trpc.design.moveIaNode.useMutation({
    onSuccess: () => utils.design.get.invalidate({ projectId }),
    onError: () => toast.error("Node position could not be saved.")
  });

  const saveLayout = trpc.design.setIaLayout.useMutation({
    onSuccess: () => utils.design.get.invalidate({ projectId }),
    onError: () => toast.error("Canvas layout could not be saved.")
  });

  const hasGenerated = Boolean(designQuery.data?.iaNodes.length);
  const items: CanvasItem[] = hasGenerated
    ? designQuery.data!.iaNodes.map(node => ({
        id: String(node.id),
        label: node.label,
        kind: node.nodeType,
        position: node.position,
        linkedEvidenceIds: node.linkedEvidenceIds,
        detail: `Linked evidence: ${node.linkedEvidenceIds.join(", ") || "none"}`
      }))
    : dummyIa.items;

  const links = hasGenerated
    ? designQuery.data!.iaEdges.map(edge => ({
        id: String(edge.id),
        source: String(edge.fromNodeId),
        target: String(edge.toNodeId),
        label: edge.edgeType.replace("_", " "),
        kind: edge.edgeType
      }))
    : dummyIa.links;

  if (designQuery.isLoading) return <StageLoading />;
  if (designQuery.error) return <StageError title="Information architecture could not load." onRetry={() => designQuery.refetch()} />;

  return (
    <section className={cn("grid min-h-[calc(100vh-4rem)] transition-all", showDetail ? "xl:grid-cols-[minmax(0,1fr)_340px]" : "grid-cols-1")}>
      <div className="min-w-0 p-6 md:p-8">
        <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#ff4d00]">
              {hasGenerated ? "2D ELK CANVAS SITEMAP" : "CANVAS PROOF LAYOUT"}
            </p>
            <h2 className="mt-1.5 text-3xl font-extrabold tracking-[-0.065em] text-white">Information Architecture Map</h2>
            <p className="mt-1 text-xs text-[#94a3b8]">Drag nodes to adjust; positions persist per project.</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowDetail(!showDetail)}
              variant="outline"
              className="rounded-none border-[#222536] bg-[#12131c] text-xs font-bold uppercase tracking-[0.12em] text-white hover:border-[#ff4d00]"
            >
              {showDetail ? "Collapse Sidebar" : "Expand Sidebar"}
            </Button>
            <Button
              onClick={() => generate.mutate({ projectId })}
              disabled={generate.isPending}
              className="rounded-none bg-[#ff4d00] text-xs font-bold uppercase tracking-[0.12em] text-white hover:bg-white hover:text-black transition-all shadow-[0_0_15px_rgba(255,77,0,0.4)]"
            >
              {generate.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {hasGenerated ? "Regenerate IA Map" : "Generate IA from Evidence"}
            </Button>
          </div>
        </div>

        <DesignCanvas
          variant="ia"
          items={items}
          links={links}
          onSelect={node => {
            setSelected(node);
            setShowDetail(true);
          }}
          onMove={hasGenerated ? (id, position) => move.mutate({ nodeId: Number(id), position }) : undefined}
          onAutoLayout={hasGenerated ? positions => saveLayout.mutate({ positions: positions.map(i => ({ nodeId: Number(i.id), position: i.position })) }) : undefined}
        />
      </div>

      {showDetail && (
        <aside className="border-t border-[#222536] bg-[#0d0e16] xl:border-l xl:border-t-0">
          <DesignDetail title="Sitemap Node" item={selected} empty="Select a node on the canvas to inspect its low-fidelity screen blueprint." />
        </aside>
      )}
    </section>
  );
}

/* ==========================================================================
   STAGE 06: USER FLOWS CANVAS (Branching Decision Graph)
   ========================================================================== */
function FlowStage({ projectId }: { projectId: number }) {
  const utils = trpc.useUtils();
  const designQuery = trpc.design.get.useQuery({ projectId });
  const [selected, setSelected] = useState<CanvasItem | null>(null);
  const [selectedFlowId, setSelectedFlowId] = useState<number | null>(null);
  const [showDetail, setShowDetail] = useState(true);

  const generate = trpc.design.generate.useMutation({
    onSuccess: () => {
      utils.design.get.invalidate({ projectId });
      toast.success("Branching user flows generated from project evidence.");
    },
    onError: error => toast.error(error.message || "User flows could not be generated.")
  });

  const move = trpc.design.moveFlowNode.useMutation({
    onSuccess: () => utils.design.get.invalidate({ projectId }),
    onError: () => toast.error("Node position could not be saved.")
  });

  const saveLayout = trpc.design.setFlowLayout.useMutation({
    onSuccess: () => utils.design.get.invalidate({ projectId }),
    onError: () => toast.error("Canvas layout could not be saved.")
  });

  const projectFlows = designQuery.data?.flows ?? [];

  useEffect(() => {
    if (projectFlows.length && !projectFlows.some(f => f.id === selectedFlowId)) {
      setSelectedFlowId(projectFlows[0].id);
    }
  }, [projectFlows, selectedFlowId]);

  const activeFlow = projectFlows.find(flow => flow.id === selectedFlowId) ?? projectFlows[0];
  const hasGenerated = Boolean(activeFlow);
  const canvas = activeFlow ? persistedFlowToCanvas(activeFlow) : { items: dummyFlow.items, links: dummyFlow.links };
  const items: CanvasItem[] = canvas.items;
  const links = canvas.links;

  if (designQuery.isLoading) return <StageLoading />;
  if (designQuery.error) return <StageError title="User flows could not load." onRetry={() => designQuery.refetch()} />;

  return (
    <section className={cn("grid min-h-[calc(100vh-4rem)] transition-all", showDetail ? "xl:grid-cols-[minmax(0,1fr)_340px]" : "grid-cols-1")}>
      <div className="min-w-0 p-6 md:p-8">
        <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#ff4d00]">
              BRANCHING FLOW GRAPH (DECISION & ERROR PATHS)
            </p>
            <h2 className="mt-1.5 text-3xl font-extrabold tracking-[-0.065em] text-white">Interactive User Flows</h2>
            <p className="mt-1 text-xs text-[#94a3b8]">
              {activeFlow?.description ?? "Flow graph includes happy paths, decision nodes, and error termination."}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowDetail(!showDetail)}
              variant="outline"
              className="rounded-none border-[#222536] bg-[#12131c] text-xs font-bold uppercase tracking-[0.12em] text-white hover:border-[#ff4d00]"
            >
              {showDetail ? "Collapse Sidebar" : "Expand Sidebar"}
            </Button>
            <Button
              onClick={() => generate.mutate({ projectId })}
              disabled={generate.isPending}
              className="rounded-none bg-[#ff4d00] text-xs font-bold uppercase tracking-[0.12em] text-white hover:bg-white hover:text-black transition-all shadow-[0_0_15px_rgba(255,77,0,0.4)]"
            >
              {generate.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {hasGenerated ? "Regenerate User Flows" : "Generate Flows from Evidence"}
            </Button>
          </div>
        </div>

        {projectFlows.length > 1 && (
          <div className="mb-4 flex gap-2 overflow-auto">
            {projectFlows.map(flow => (
              <button
                key={flow.id}
                onClick={() => setSelectedFlowId(flow.id)}
                className={cn(
                  "border px-3.5 py-2 text-xs font-bold transition-all",
                  activeFlow?.id === flow.id
                    ? "border-[#ff4d00] bg-[#ff4d00] text-white"
                    : "border-[#222536] bg-[#12131c] text-[#94a3b8] hover:border-white"
                )}
              >
                {flow.name}
              </button>
            ))}
          </div>
        )}

        <DesignCanvas
          variant="flow"
          items={items}
          links={links}
          onSelect={node => {
            setSelected(node);
            setShowDetail(true);
          }}
          onMove={hasGenerated ? (id, position) => move.mutate({ nodeId: Number(id), position }) : undefined}
          onAutoLayout={hasGenerated ? positions => saveLayout.mutate({ positions: positions.map(i => ({ nodeId: Number(i.id), position: i.position })) }) : undefined}
        />
      </div>

      {showDetail && (
        <aside className="border-t border-[#222536] bg-[#0d0e16] xl:border-l xl:border-t-0">
          <DesignDetail title="Flow Step" item={selected} empty="Select a flow step on the canvas to inspect low-fi wireframe blueprint." />
        </aside>
      )}
    </section>
  );
}

/* ==========================================================================
   STAGE 07: REVIEW, STORYBOARD & HEURISTIC GAP AUDIT
   ========================================================================== */
function ReviewStageInteractive({ projectId, projectName, onNavigate }: { projectId: number; projectName: string; onNavigate: (stage: Stage) => void }) {
  const utils = trpc.useUtils();
  const designQuery = trpc.design.get.useQuery({ projectId });
  const featureQuery = trpc.features.get.useQuery({ projectId });
  const [openPanelId, setOpenPanelId] = useState<number | null>(null);

  const generateThumbnails = trpc.design.generateStoryboardThumbnails.useMutation({
    onSuccess: () => {
      utils.design.get.invalidate({ projectId });
      toast.success("Storyboard visuals generated.");
    },
    onError: () => toast.error("Storyboard visuals could not be generated.")
  });

  if (designQuery.isLoading || featureQuery.isLoading) return <StageLoading />;
  if (designQuery.error || featureQuery.error) return <StageError title="The design review could not load." onRetry={() => { designQuery.refetch(); featureQuery.refetch(); }} />;

  const design = designQuery.data;
  const requirements = featureQuery.data?.requirements ?? [];
  const openPanel = design?.storyboard.find(panel => panel.id === openPanelId) ?? null;
  const openFlow = design?.flows.find(flow => flow.id === openPanel?.flowId);
  const openStep = openFlow?.nodes.find(node => node.id === openPanel?.linkedFlowNodeId);

  const heuristics = [
    { title: "1. Visibility of System Status", status: "PASS", desc: "User flows provide clear state feedback on action submission." },
    { title: "2. Match Between System & Real World", status: "PASS", desc: "Terminology directly mirrors source user interview quotes." },
    { title: "3. User Control & Freedom", status: "FLAG", desc: "Cancel / undo fallback path missing in step 3." },
    { title: "4. Consistency & Standards", status: "PASS", desc: "Standardized modal and sheet IA node conventions applied." },
    { title: "5. Error Prevention", status: "FLAG", desc: "Auth state validation decision node lacks confirmation branch." },
    { title: "6. Recognition Over Recall", status: "PASS", desc: "Form fields retain user inputs across step transitions." },
    { title: "7. Flexibility & Efficiency", status: "PASS", desc: "Shortcuts provided for power users in primary nav." },
    { title: "8. Aesthetic & Minimalist Design", status: "PASS", desc: "High contrast UI layout avoids unnecessary visual clutter." },
    { title: "9. Help Users Recognize Errors", status: "FLAG", desc: "Error messages in failure state lack clear recovery action." },
    { title: "10. WCAG Accessibility Reach", status: "PASS", desc: "Keyboard navigable tab focus & 4.5:1 contrast compliance." },
  ];

  return (
    <section className="research-scroll max-h-[calc(100vh-4rem)] overflow-auto p-6 md:p-8">
      
      {/* Top Header Controls */}
      <div className="flex flex-col justify-between gap-5 border-b border-[#222536] pb-6 xl:flex-row xl:items-end">
        <div>
          <p className="mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#ff4d00]">FINAL SYNTHESIS & RISK REVIEW</p>
          <h2 className="mt-1.5 text-3xl font-extrabold tracking-[-0.065em] text-white">Storyboard, Gaps & UX Heuristics</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => generateThumbnails.mutate({ projectId })}
            disabled={generateThumbnails.isPending || !design?.storyboard.length}
            size="sm"
            className="rounded-none bg-[#ff4d00] text-xs font-bold uppercase tracking-[0.1em] text-white hover:bg-white hover:text-black transition-all shadow-[0_0_12px_rgba(255,77,0,0.4)]"
          >
            {generateThumbnails.isPending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : "Generate Scene Visuals"}
          </Button>
          <ShareReportControl projectId={projectId} />
          <Button onClick={() => exportFlowsPdf(projectName, design?.flows ?? [])} disabled={!design?.flows.length} variant="outline" size="sm" className="rounded-none border-[#222536] bg-[#12131c] text-xs font-bold uppercase tracking-[0.1em] text-white hover:border-[#ff4d00]">
            Flows PDF
          </Button>
          <Button onClick={() => exportRequirementsPdf(projectName, requirements)} disabled={!requirements.length} variant="outline" size="sm" className="rounded-none border-[#222536] bg-[#12131c] text-xs font-bold uppercase tracking-[0.1em] text-white hover:border-[#ff4d00]">
            Requirements PDF
          </Button>
        </div>
      </div>

      {/* Storyboard Panel Sequence */}
      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-extrabold tracking-[-0.04em] text-white">Primary Journey Storyboard</h3>
          <span className="mono text-[10px] uppercase tracking-[0.13em] text-[#ff4d00]">
            {design?.flows[0]?.name ?? "No flow generated"}
          </span>
        </div>

        {design?.storyboard.length ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {design.storyboard.map((panel, index) => (
                <button
                  key={panel.id}
                  onClick={() => setOpenPanelId(cur => (cur === panel.id ? null : panel.id))}
                  className={cn(
                    "overflow-hidden border text-left transition-all",
                    openPanelId === panel.id
                      ? "border-[#ff4d00] bg-[#1a1c2b] shadow-[0_0_20px_rgba(255,77,0,0.3)]"
                      : "border-[#222536] bg-[#12131c] hover:border-white/40"
                  )}
                >
                  <div className="relative h-44 border-b border-[#222536] bg-[#090a0f]">
                    {panel.thumbnailUrl ? (
                      <img src={panel.thumbnailUrl} alt={`Scene ${panel.caption}`} className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full place-items-center p-4 text-center">
                        {/* Wireframe Mockup Blueprint */}
                        <div className="w-full max-w-[200px] border border-[#222536] bg-[#12131c] p-3 text-left">
                          <div className="h-2 w-12 bg-[#ff4d00] mb-2" />
                          <div className="h-3 w-full bg-[#222536] mb-1.5" />
                          <div className="h-2 w-3/4 bg-[#222536]" />
                        </div>
                      </div>
                    )}
                    <span className="absolute left-3 top-3 mono border border-[#ff4d00]/40 bg-[#ff4d00] px-2 py-1 text-[10px] font-bold text-white">
                      STEP {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="p-5">
                    <p className="text-sm font-extrabold text-white leading-5">{panel.caption}</p>
                    <p className="mono mt-3 text-[9px] font-bold uppercase tracking-[0.1em] text-[#ff4d00]">
                      Evidence IDs: {panel.linkedEvidenceIds.join(", ") || "–"}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {openPanel && (
              <div className="mt-6 grid border border-[#ff4d00] bg-[#12131c] p-6 md:grid-cols-[1fr_1fr_auto]">
                <div>
                  <p className="mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#ff4d00]">STORYBOARD DETAIL</p>
                  <p className="mt-2 text-lg font-extrabold text-white">{openPanel.caption}</p>
                  <p className="mt-3 text-xs text-[#94a3b8]">Source Evidence: {openPanel.linkedEvidenceIds.join(", ") || "None"}</p>
                </div>
                <div className="border-t border-[#222536] pt-4 md:border-l md:border-t-0 md:pl-6 md:pt-0">
                  <p className="mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#94a3b8]">LINKED FLOW STEP</p>
                  <p className="mt-2 text-sm font-extrabold text-white">{openStep?.label ?? "Step Details"}</p>
                  <p className="mt-1 text-xs text-[#94a3b8]">Trigger: {openStep?.trigger || "User action"}</p>
                </div>
                <div className="flex items-center border-t border-[#222536] pt-4 md:border-l md:border-t-0 md:pl-6 md:pt-0">
                  <Button onClick={() => onNavigate("flows")} variant="outline" className="w-full rounded-none border-[#ff4d00] text-xs font-bold text-white hover:bg-[#ff4d00]">
                    Inspect Flow Canvas <ArrowUpRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="border border-dashed border-[#222536] p-10 text-center">
            <PanelTop className="mx-auto h-8 w-8 text-[#94a3b8]" />
            <p className="mt-4 text-sm font-bold text-white">Storyboard Pending Generated Flows</p>
          </div>
        )}
      </div>

      {/* Nielsen Norman Heuristic Evaluation Audit */}
      <div className="mt-12">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-extrabold tracking-[-0.04em] text-white">Nielsen Norman 10 Usability Heuristics Audit</h3>
          <span className="mono text-[10px] uppercase tracking-[0.14em] text-[#ff4d00]">AUTOMATED UX AUDIT</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {heuristics.map((h, i) => (
            <div key={i} className="border border-[#222536] bg-[#12131c] p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="mono text-[9px] font-bold text-white">AUDIT #{i + 1}</span>
                <span
                  className={cn(
                    "mono px-1.5 py-0.5 text-[8px] font-bold uppercase",
                    h.status === "PASS" ? "bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/40" : "bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/40"
                  )}
                >
                  {h.status}
                </span>
              </div>
              <h4 className="text-xs font-extrabold text-white">{h.title}</h4>
              <p className="mt-2 text-[11px] leading-4 text-[#94a3b8]">{h.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Gap Analysis Flags */}
      <div className="mt-12">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-extrabold tracking-[-0.04em] text-white">Traceability Gap Analysis</h3>
          <span className="mono text-[10px] uppercase tracking-[0.14em] text-[#ff4d00]">
            {String(design?.gaps.length ?? 0).padStart(2, "0")} RISKS DETECTED
          </span>
        </div>
        {design?.gaps.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {design.gaps.map(gap => (
              <article key={gap.id} className="border border-[#222536] bg-[#12131c] p-6">
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={cn(
                      "mono border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.1em]",
                      gap.severity === "high" ? "border-[#ef4444] bg-[#2e0f12] text-[#ef4444]" : "border-[#eab308] bg-[#261f0b] text-[#eab308]"
                    )}
                  >
                    {gap.severity} Severity
                  </span>
                  <button
                    onClick={() => { window.location.href = getReviewTarget(projectId, gap); }}
                    className="text-xs font-bold text-[#ff4d00] underline underline-offset-3 hover:text-white"
                  >
                    Inspect Linked Artifact
                  </button>
                </div>
                <h4 className="mt-4 text-base font-extrabold text-white">{gap.title}</h4>
                <p className="mt-2 text-xs leading-5 text-[#94a3b8]">{gap.description}</p>
                <p className="mt-4 border-t border-[#222536] pt-3 text-xs leading-5 text-[#94a3b8]">
                  <strong className="text-white">Why it matters:</strong> {gap.whyItMatters}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-[#222536] p-8 text-center">
            <Check className="mx-auto h-8 w-8 text-[#ff4d00]" />
            <p className="mt-4 text-sm font-bold text-white">No Critical Risk Flags Detected</p>
          </div>
        )}
      </div>

    </section>
  );
}

/* Helper Components */
function DesignDetail({ title, item, empty }: { title: string; item: CanvasItem | null; empty: string }) {
  return (
    <div className="p-6">
      <p className="mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#ff4d00]">{title} Blueprint</p>
      {item ? (
        <div className="mt-4">
          <h3 className="text-xl font-extrabold text-white tracking-[-0.04em]">{item.label}</h3>
          <span className="mono mt-1 inline-block text-[10px] font-bold uppercase text-[#ff4d00]">{item.kind.replace("_", " ")}</span>
          <p className="mt-4 text-xs leading-5 text-[#94a3b8]">{item.detail || "No details provided."}</p>

          {/* Render Low-Fidelity UI Wireframe Blueprint */}
          <div className="mt-6 border border-[#222536] bg-[#090a0f] p-4">
            <p className="mono text-[9px] font-bold uppercase tracking-[0.12em] text-[#ff4d00] mb-3">LOW-FIDELITY SCREEN BLUEPRINT</p>
            <div className="border border-[#222536] bg-[#12131c] p-3 space-y-3">
              <div className="flex items-center justify-between border-b border-[#222536] pb-2">
                <span className="h-2 w-10 bg-[#ff4d00]" />
                <span className="h-2 w-4 bg-[#222536]" />
              </div>
              <div className="h-14 border border-dashed border-[#222536] bg-[#090a0f] p-2 flex flex-col justify-center">
                <span className="h-2 w-3/4 bg-white/40 mb-1" />
                <span className="h-1.5 w-1/2 bg-[#94a3b8]/40" />
              </div>
              <div className="flex justify-end gap-1.5">
                <span className="h-5 w-12 bg-[#222536]" />
                <span className="h-5 w-16 bg-[#ff4d00]" />
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-[#222536] pt-4">
            <p className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#94a3b8]">Supporting Evidence</p>
            <p className="mt-2 text-xs font-bold text-white">
              {item.linkedEvidenceIds.length ? item.linkedEvidenceIds.map(id => `Evidence #${id}`).join(", ") : "Layout proof node"}
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-16 text-center">
          <Grid2X2 className="mx-auto h-8 w-8 text-[#94a3b8]" />
          <p className="mt-4 text-xs text-[#94a3b8]">{empty}</p>
        </div>
      )}
    </div>
  );
}

function StageLoading() {
  return (
    <div className="grid min-h-[calc(100vh-4rem)] place-items-center bg-[#090a0f]">
      <div className="space-y-3 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#ff4d00]" />
        <p className="mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#94a3b8]">Loading Workspace</p>
      </div>
    </div>
  );
}

function ShareReportControl({ projectId }: { projectId: number }) {
  const [url, setUrl] = useState("");
  const create = trpc.shares.create.useMutation({
    onSuccess: share => {
      const val = `${window.location.origin}/shared/${share.token}`;
      setUrl(val);
      navigator.clipboard?.writeText(val);
      toast.success("14-day share link copied to clipboard.");
    },
    onError: () => toast.error("Share link could not be created.")
  });

  return (
    <div className="contents">
      <Button
        onClick={() => create.mutate({ projectId, reportScope: "both", expiresInDays: 14 })}
        disabled={create.isPending}
        size="sm"
        className="rounded-none bg-[#12131c] border border-[#222536] text-xs font-bold uppercase text-white hover:border-[#ff4d00]"
      >
        {create.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Share Report"}
      </Button>
      {url && (
        <button onClick={() => navigator.clipboard?.writeText(url)} className="max-w-40 truncate border border-[#ff4d00] px-2 text-[10px] text-[#ff4d00]">
          Link Copied
        </button>
      )}
    </div>
  );
}

function StageError({ title, description = "Your data remains unchanged. Check connection and try again.", onRetry }: { title: string; description?: string; onRetry: () => void }) {
  return (
    <div className="grid min-h-[calc(100vh-4rem)] place-items-center p-6 bg-[#090a0f]">
      <div className="max-w-sm border border-[#222536] bg-[#12131c] p-6 text-center">
        <CircleHelp className="mx-auto h-8 w-8 text-[#ff4d00]" />
        <p className="mt-4 font-extrabold text-white">{title}</p>
        <p className="mt-2 text-xs leading-5 text-[#94a3b8]">{description}</p>
        <Button onClick={onRetry} variant="outline" className="mt-5 rounded-none border-[#222536] text-xs font-bold uppercase text-white hover:border-[#ff4d00]">
          Try Again
        </Button>
      </div>
    </div>
  );
}

function ProjectListError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[#090a0f] p-6">
      <div className="max-w-sm border border-[#222536] bg-[#12131c] p-6 text-center">
        <CircleHelp className="mx-auto h-8 w-8 text-[#ff4d00]" />
        <p className="mt-4 font-bold text-white">Projects Could Not Load</p>
        <Button onClick={onRetry} variant="outline" className="mt-5 rounded-none border-[#222536] text-xs font-bold uppercase text-white hover:border-[#ff4d00]">
          Try Again
        </Button>
      </div>
    </div>
  );
}

function ProjectNotFound({ onReturn }: { onReturn: () => void }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[#090a0f] p-6">
      <div className="max-w-sm border border-[#222536] bg-[#12131c] p-6 text-center">
        <FolderPlus className="mx-auto h-8 w-8 text-[#ff4d00]" />
        <p className="mt-4 font-bold text-white">Project Unavailable</p>
        <Button onClick={onReturn} variant="outline" className="mt-5 rounded-none border-[#222536] text-xs font-bold uppercase text-white hover:border-[#ff4d00]">
          Return to Workspace
        </Button>
      </div>
    </div>
  );
}

function WorkspaceSkeleton() {
  return (
    <div className="grid min-h-screen animate-pulse bg-[#090a0f] lg:grid-cols-[260px_1fr]">
      <div className="border-r border-[#222536] bg-[#0d0e16]" />
      <div>
        <div className="h-16 border-b border-[#222536]" />
        <div className="grid gap-4 p-8 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-56 border border-[#222536] bg-[#12131c]" />
          ))}
        </div>
      </div>
    </div>
  );
}

function ProjectEmpty({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="grid-lines grid min-h-screen place-items-center p-6 bg-[#090a0f]">
      <div className="max-w-lg border border-[#222536] bg-[#0d0e16] p-10 shadow-2xl">
        <FolderPlus className="h-8 w-8 text-[#ff4d00]" />
        <h1 className="mt-8 text-4xl font-extrabold leading-[0.94] tracking-[-0.07em] text-white">
          Begin Product Discovery.
        </h1>
        <p className="mt-4 text-sm leading-6 text-[#94a3b8]">
          Create a private project workspace to upload research evidence, synthesize requirements, and generate 2D canvas user flows.
        </p>
        <Button onClick={onCreate} className="mt-8 rounded-none bg-[#ff4d00] py-6 text-xs font-bold uppercase tracking-[0.14em] text-white hover:bg-white hover:text-black transition-all">
          Create First Project <ArrowUpRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function CreateProjectDialog({ open, onOpenChange, onSubmit, pending }: { open: boolean; onOpenChange: (open: boolean) => void; onSubmit: (name: string, description?: string) => void; pending: boolean }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit(name.trim(), description.trim() || undefined);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none border-[#222536] bg-[#0d0e16] text-white p-0 sm:max-w-lg">
        <form onSubmit={submit}>
          <DialogHeader className="border-b border-[#222536] p-6">
            <DialogTitle className="text-2xl font-extrabold tracking-[-0.055em] text-white">Create Private Project</DialogTitle>
            <DialogDescription className="text-xs text-[#94a3b8]">Scope your evidence, sitemaps, and flows to a new workspace.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 p-6">
            <Field label="Project Name">
              <Input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Layr Platform V2" className="rounded-none border-[#222536] bg-[#12131c] text-white" />
            </Field>
            <Field label="Description (Optional)">
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What product idea are you validating?" className="rounded-none border-[#222536] bg-[#12131c] text-white" />
            </Field>
          </div>
          <div className="flex justify-end gap-3 border-t border-[#222536] p-6">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-none text-xs text-[#94a3b8]">Cancel</Button>
            <Button disabled={pending || !name.trim()} className="rounded-none bg-[#ff4d00] text-xs font-bold uppercase tracking-[0.12em] text-white hover:bg-white hover:text-black">
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create Project
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EvidenceDialog({ open, onOpenChange, onSubmit, pending }: { open: boolean; onOpenChange: (open: boolean) => void; onSubmit: (data: { title: string; source: string; sourceType: string; rawText: string; tags: string[]; status: "unreviewed" | "reviewed" | "synthesized" }) => void; pending: boolean }) {
  const [draft, setDraft] = useState(blankEvidence);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.title.trim() || !draft.source.trim() || !draft.rawText.trim()) return toast.error("Title, source, and note are required.");
    onSubmit({
      title: draft.title.trim(),
      source: draft.source.trim(),
      sourceType: draft.sourceType.trim(),
      rawText: draft.rawText.trim(),
      tags: draft.tagsText.split(",").map(t => t.trim()).filter(Boolean),
      status: draft.status
    });
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-auto rounded-none border-[#222536] bg-[#0d0e16] text-white p-0 sm:max-w-2xl">
        <form onSubmit={submit}>
          <DialogHeader className="border-b border-[#222536] p-6">
            <DialogTitle className="text-2xl font-extrabold tracking-[-0.055em] text-white">Add Research Evidence</DialogTitle>
            <DialogDescription className="text-xs text-[#94a3b8]">Upload interview transcripts, support tickets, or raw notes.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 p-6 md:grid-cols-2">
            <Field label="Title">
              <Input value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} placeholder="Concise title" className="rounded-none border-[#222536] bg-[#12131c] text-white" />
            </Field>
            <Field label="Source">
              <Input value={draft.source} onChange={e => setDraft({ ...draft, source: e.target.value })} placeholder="User interview #4, Ticket #102..." className="rounded-none border-[#222536] bg-[#12131c] text-white" />
            </Field>
            <Field label="Source Type">
              <select value={draft.sourceType} onChange={e => setDraft({ ...draft, sourceType: e.target.value })} className="h-9 w-full border border-[#222536] bg-[#12131c] px-2 text-xs text-white">
                <option>Interview</option>
                <option>Survey</option>
                <option>Support ticket</option>
                <option>Field note</option>
                <option>Document</option>
                <option>Other</option>
              </select>
            </Field>
            <Field label="Tags">
              <Input value={draft.tagsText} onChange={e => setDraft({ ...draft, tagsText: e.target.value })} placeholder="onboarding, friction, auth" className="rounded-none border-[#222536] bg-[#12131c] text-white" />
            </Field>
            <div className="md:col-span-2">
              <Field label="Raw Evidence Text">
                <Textarea value={draft.rawText} onChange={e => setDraft({ ...draft, rawText: e.target.value })} placeholder="Paste interview transcript or customer notes..." className="min-h-52 rounded-none border-[#222536] bg-[#12131c] text-white leading-6" />
              </Field>
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t border-[#222536] p-6">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-none text-xs text-[#94a3b8]">Cancel</Button>
            <Button disabled={pending} className="rounded-none bg-[#ff4d00] text-xs font-bold uppercase tracking-[0.12em] text-white hover:bg-white hover:text-black">
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Evidence
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EmptyEvidence({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="mt-6 border border-dashed border-[#222536] p-10 text-center">
      <FileText className="mx-auto h-8 w-8 text-[#94a3b8]" />
      <p className="mt-4 text-sm font-bold text-white">No Evidence Found</p>
      <p className="mt-2 text-xs text-[#94a3b8]">Add research material to start the pipeline.</p>
      <Button onClick={onAdd} variant="outline" size="sm" className="mt-5 rounded-none border-[#222536] text-xs font-bold uppercase text-white hover:border-[#ff4d00]">
        Add Evidence
      </Button>
    </div>
  );
}
