import "@xyflow/react/dist/style.css";
import ELK from "elkjs/lib/elk.bundled.js";
import {
  Background,
  applyNodeChanges,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  type ReactFlowInstance,
  type Edge,
  type Node,
  type NodeChange,
  type NodeProps,
} from "@xyflow/react";
import { ExternalLink, Layers, PanelTop, Route, Workflow } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export type CanvasItem = {
  id: string;
  label: string;
  kind: string;
  position: { x: number; y: number };
  linkedEvidenceIds: number[];
  detail?: string;
};
export type CanvasLink = { id: string; source: string; target: string; label: string; kind: string };

const elk = new ELK();
const geometry = { ia: { width: 172, height: 66 }, flow: { width: 188, height: 104 } };

async function autoLayout(items: CanvasItem[], links: CanvasLink[], variant: "ia" | "flow") {
  const size = geometry[variant];
  const graph = await elk.layout({
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
      "elk.spacing.nodeNode": variant === "flow" ? "42" : "70",
      "elk.layered.spacing.nodeNodeBetweenLayers": variant === "flow" ? "54" : "120",
      "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
    },
    children: items.map(item => ({ id: item.id, width: size.width, height: size.height })),
    edges: links.map(link => ({ id: link.id, sources: [link.source], targets: [link.target] })),
  });
  return items.map(item => {
    const laidOut = graph.children?.find(child => child.id === item.id);
    return { ...item, position: { x: laidOut?.x ?? item.position.x, y: laidOut?.y ?? item.position.y } };
  });
}

function IaNode({ data }: NodeProps<Node<{ label: string; kind: string; evidence: number[] }>>) {
  const icon = data.kind === "modal" ? <PanelTop className="h-3.5 w-3.5" /> : data.kind === "sheet" ? <Layers className="h-3.5 w-3.5" /> : data.kind === "external_link" ? <ExternalLink className="h-3.5 w-3.5" /> : <Route className="h-3.5 w-3.5" />;
  const root = data.label.toLowerCase().includes("home") || data.label.toLowerCase().includes("entry");
  return <div className={`min-w-44 rounded-none border px-3.5 py-3 shadow-[4px_4px_0_#000000] ${root ? "border-[#ff4d00] bg-[#ff4d00] text-white" : "border-[#2d3045] bg-[#12131d] text-white"}`}><Handle type="target" position={Position.Left} className="!h-2.5 !w-2.5 !border-[#ff4d00] !bg-[#090a0f]" /><div className="flex items-center gap-2"><span className={root ? "text-white" : "text-[#ff4d00]"}>{icon}</span><span className="text-xs font-extrabold tracking-[-0.02em]">{data.label}</span></div><p className={`mono mt-1.5 text-[8px] uppercase tracking-[0.12em] ${root ? "text-white/80" : "text-[#94a3b8]"}`}>{data.kind.replace("_", " ")} · E{data.evidence.join(",") || "–"}</p><Handle type="source" position={Position.Right} className="!h-2.5 !w-2.5 !border-black !bg-[#ff4d00]" /></div>;
}

function FlowNode({ data }: NodeProps<Node<{ label: string; kind: string; evidence: number[] }>>) {
  const type = data.kind;
  const end = type === "end_success" || type === "end_failure";
  const decision = type === "decision";
  const colors = end ? (type === "end_success" ? "border-[#22c55e] bg-[#0b2818] text-white" : "border-[#ef4444] bg-[#2e0f12] text-white") : type === "screen" ? "border-[#3b82f6] bg-[#12172f] text-white" : type === "start" ? "border-[#ff4d00] bg-[#ff4d00] text-white font-extrabold" : "border-[#2d3045] bg-[#141522] text-white";
  if (decision) return <div className="relative h-[108px] w-[108px] rotate-45 border-2 border-[#eab308] bg-[#261f0b] text-white shadow-[4px_4px_0_#000000]"><Handle type="target" position={Position.Left} className="!-left-1 !top-1/2 !h-2.5 !w-2.5 !border-[#eab308] !bg-[#090a0f]" /><div className="absolute inset-2 grid -rotate-45 place-items-center text-center"><span className="line-clamp-3 text-[10px] font-extrabold leading-3 text-white">{data.label}</span><span className="mono mt-1 text-[7px] text-[#eab308]">E{data.evidence.join(",") || "–"}</span></div><Handle type="source" position={Position.Right} className="!-right-1 !top-1/2 !h-2.5 !w-2.5 !border-black !bg-[#ff4d00]" /></div>;
  return <div className={`min-w-[184px] rounded-none border px-3.5 py-3 shadow-[4px_4px_0_#000000] ${colors}`}><Handle type="target" position={Position.Left} className="!h-2.5 !w-2.5 !border-[#ff4d00] !bg-[#090a0f]" /><div className="flex items-center gap-2"><Workflow className="h-3.5 w-3.5 text-[#ff4d00]" /><span className="text-xs font-bold tracking-[-0.02em]">{data.label}</span></div><p className="mono mt-1.5 text-[8px] uppercase tracking-[0.12em] text-[#94a3b8]">{type.replace("_", " ")} · E{data.evidence.join(",") || "–"}</p><Handle type="source" position={Position.Right} className="!h-2.5 !w-2.5 !border-black !bg-[#ff4d00]" /></div>;
}

const nodeTypes = { iaNode: IaNode, flowNode: FlowNode };

export function DesignCanvas({ variant, items, links, onSelect, onMove, onAutoLayout }: { variant: "ia" | "flow"; items: CanvasItem[]; links: CanvasLink[]; onSelect: (item: CanvasItem) => void; onMove?: (id: string, position: { x: number; y: number }) => void; onAutoLayout?: (positions: Array<{ id: string; position: { x: number; y: number } }>) => void }) {
  const layoutSignature = `${variant}:${items.map(item => `${item.id}:${item.position.x}:${item.position.y}`).join("|")}:${links.map(link => link.id).join("|")}`;
  const autoLaidOut = useRef(new Set<string>());
  const flowApi = useRef<ReactFlowInstance | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const edges = useMemo<Edge[]>(() => links.map(link => ({ id: link.id, source: link.source, target: link.target, label: link.label, type: "smoothstep", animated: false, labelStyle: { fill: "#ffffff", fontSize: 10, fontFamily: "DM Mono, monospace", fontWeight: 600 }, labelBgStyle: { fill: "#12131d", fillOpacity: 0.95 }, style: { stroke: link.kind === "primary_nav" ? "#ffffff" : link.kind === "secondary_nav" ? "#ff4d00" : "#64748b", strokeWidth: link.kind === "primary_nav" ? 2 : 1.5, strokeDasharray: link.kind === "contextual" ? "5 4" : undefined } })), [links]);

  useEffect(() => {
    let active = true;
    const zeroPositionCount = items.filter(item => item.position.x === 0 && item.position.y === 0).length;
    const needsLayout = items.length > 0 && zeroPositionCount > items.length / 2;
    const apply = (source: CanvasItem[]) => setNodes(source.map(item => ({ id: item.id, type: variant === "ia" ? "iaNode" : "flowNode", position: item.position, data: { label: item.label, kind: item.kind, evidence: item.linkedEvidenceIds } })));
    if (needsLayout && !autoLaidOut.current.has(layoutSignature)) {
      autoLaidOut.current.add(layoutSignature);
      autoLayout(items, links, variant).then(laidOut => {
        if (!active) return;
        apply(laidOut);
        onAutoLayout?.(laidOut.map(item => ({ id: item.id, position: item.position })));
      });
    } else apply(items);
    return () => { active = false; };
  }, [items, links, variant, layoutSignature, onAutoLayout]);

  const flowKey = `${variant}:${items.map(item => item.id).join("|")}`;
  useEffect(() => { const frame = requestAnimationFrame(() => flowApi.current?.fitView({ padding: variant === "flow" ? 0.08 : 0.18, maxZoom: variant === "flow" ? 1.05 : 1 })); return () => cancelAnimationFrame(frame); }, [flowKey, variant]);
  return <div className="h-[calc(100vh-10.5rem)] min-h-145 w-full border border-[#222536] bg-[#0b0c12]"><ReactFlow key={flowKey} nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.18, maxZoom: 1 }} minZoom={0.25} maxZoom={1.5} onInit={instance => { flowApi.current = instance; }} onNodesChange={(changes: NodeChange[]) => setNodes(current => applyNodeChanges(changes, current))} onNodeClick={(_, node) => { const original = items.find(item => item.id === node.id); if (original) onSelect(original); }} onNodeDragStop={(_, node) => onMove?.(node.id, node.position)}><Background gap={24} size={1.5} color="#222536" /><Controls showInteractive={false} className="!rounded-none !border !border-[#222536] !bg-[#12131d] !shadow-none font-mono text-white" /><MiniMap className="!border !border-[#222536] !bg-[#0b0c12]" nodeColor={node => node.type === "iaNode" ? "#ff4d00" : "#3b82f6"} /></ReactFlow></div>;
}

export const dummyIa: { items: CanvasItem[]; links: CanvasLink[] } = {
  items: [
    { id: "ia_home", label: "Home", kind: "page", position: { x: 0, y: 0 }, linkedEvidenceIds: [], detail: "Central entry point" },
    { id: "ia_product", label: "Product", kind: "page", position: { x: 0, y: 0 }, linkedEvidenceIds: [], detail: "Primary product section" },
    { id: "ia_account", label: "Account", kind: "page", position: { x: 0, y: 0 }, linkedEvidenceIds: [], detail: "Account management" },
    { id: "ia_settings", label: "Settings", kind: "page", position: { x: 0, y: 0 }, linkedEvidenceIds: [], detail: "Preferences and settings" },
    { id: "ia_feature", label: "Feature detail", kind: "page", position: { x: 0, y: 0 }, linkedEvidenceIds: [], detail: "Nested product page" },
    { id: "ia_billing", label: "Billing sheet", kind: "sheet", position: { x: 0, y: 0 }, linkedEvidenceIds: [], detail: "Nested account sheet" },
    { id: "ia_help", label: "Help center", kind: "external_link", position: { x: 0, y: 0 }, linkedEvidenceIds: [], detail: "External support destination" },
  ],
  links: [
    { id: "ia-e1", source: "ia_home", target: "ia_product", label: "primary", kind: "primary_nav" }, { id: "ia-e2", source: "ia_home", target: "ia_account", label: "primary", kind: "primary_nav" }, { id: "ia-e3", source: "ia_home", target: "ia_settings", label: "primary", kind: "primary_nav" }, { id: "ia-e4", source: "ia_product", target: "ia_feature", label: "context", kind: "contextual" }, { id: "ia-e5", source: "ia_account", target: "ia_billing", label: "secondary", kind: "secondary_nav" }, { id: "ia-e6", source: "ia_settings", target: "ia_help", label: "help", kind: "contextual" },
  ],
};

export const dummyFlow: { items: CanvasItem[]; links: CanvasLink[] } = {
  items: [
    { id: "fl_start", label: "Start", kind: "start", position: { x: 0, y: 0 }, linkedEvidenceIds: [], detail: "Entry" }, { id: "fl_open", label: "Open sign-up", kind: "action", position: { x: 0, y: 0 }, linkedEvidenceIds: [], detail: "User action" }, { id: "fl_auth", label: "Authenticated?", kind: "decision", position: { x: 0, y: 0 }, linkedEvidenceIds: [], detail: "Conditional branch" }, { id: "fl_dashboard", label: "Workspace", kind: "screen", position: { x: 0, y: 0 }, linkedEvidenceIds: [], detail: "Shared screen" }, { id: "fl_error", label: "Show error", kind: "screen", position: { x: 0, y: 0 }, linkedEvidenceIds: [], detail: "Failure route" }, { id: "fl_success", label: "Complete", kind: "end_success", position: { x: 0, y: 0 }, linkedEvidenceIds: [], detail: "Success" }, { id: "fl_failure", label: "Exit safely", kind: "end_failure", position: { x: 0, y: 0 }, linkedEvidenceIds: [], detail: "Failure end" },
  ],
  links: [
    { id: "fl-e1", source: "fl_start", target: "fl_open", label: "", kind: "path" }, { id: "fl-e2", source: "fl_open", target: "fl_auth", label: "submit", kind: "path" }, { id: "fl-e3", source: "fl_auth", target: "fl_dashboard", label: "if authenticated", kind: "path" }, { id: "fl-e4", source: "fl_auth", target: "fl_error", label: "if rejected", kind: "path" }, { id: "fl-e5", source: "fl_error", target: "fl_failure", label: "on retry failure", kind: "path" }, { id: "fl-e6", source: "fl_dashboard", target: "fl_success", label: "finish", kind: "path" },
  ],
};
