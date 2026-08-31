import { trpc } from "@/lib/trpc";
import { Check, FileText, Loader2, Network } from "lucide-react";
import { useParams } from "wouter";

export default function SharedReport() {
  const params = useParams<{ token: string }>();
  const reportQuery = trpc.shares.get.useQuery({ token: params.token ?? "" }, { enabled: Boolean(params.token), retry: false });

  if (reportQuery.isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#0A0A0B] text-[#F4F3EF]">
        <div className="text-center space-y-3">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#FF4B23]" />
          <p className="mono text-[10px] uppercase tracking-[0.18em] text-[#9B9B9B]">Loading shared report...</p>
        </div>
      </main>
    );
  }

  if (reportQuery.error || !reportQuery.data) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#0A0A0B] p-5 text-[#F4F3EF]">
        <div className="max-w-sm border border-white/10 bg-[#111214] p-8 text-center space-y-4">
          <Network className="mx-auto h-6 w-6 text-[#FF4B23]" />
          <h1 className="text-2xl font-black tracking-[-0.05em] text-[#F4F3EF]">Report Unavailable</h1>
          <p className="text-xs leading-6 text-[#9B9B9B]">The share link may have expired or been revoked by its owner.</p>
        </div>
      </main>
    );
  }

  const report = reportQuery.data;

  return (
    <main className="min-h-screen bg-[#F1F0EC] text-[#0A0A0B] antialiased">
      <header className="flex items-center justify-between border-b border-[#0A0A0B]/12 px-8 py-5 md:px-12 bg-white/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="h-4 w-4 bg-[#FF4B23]" />
          <span className="font-black text-xl tracking-[-0.06em] text-[#0A0A0B]">LAYR</span>
        </div>
        <span className="mono text-[10px] uppercase tracking-[0.18em] text-[#0A0A0B]/60 border border-[#0A0A0B]/15 px-2.5 py-1">
          READ-ONLY DISCOVERY SPEC
        </span>
      </header>

      <section className="mx-auto max-w-5xl px-8 py-12 md:py-16 space-y-16">
        <div className="space-y-4">
          <span className="mono text-xs font-black uppercase tracking-[0.2em] text-[#FF4B23] bg-[#FF4B23]/10 px-3 py-1 inline-block">
            EVIDENCE-DRIVEN SPECIFICATION
          </span>
          <h1 className="text-4xl md:text-7xl font-black uppercase tracking-[-0.06em] leading-none text-[#0A0A0B]">
            {report.project.name}
          </h1>
          <p className="max-w-2xl text-base leading-7 text-[#0A0A0B]/75 font-medium">
            {report.project.description || "Shared user flows and requirement specifications generated in Layr."}
          </p>
          <p className="mono text-[10px] uppercase tracking-[0.14em] text-[#0A0A0B]/50 pt-2">
            {report.expiresAt ? `Available until ${new Date(report.expiresAt).toLocaleDateString()}` : "Available until revoked"}
          </p>
        </div>

        {report.flows.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center gap-3 border-b-2 border-[#0A0A0B] pb-3">
              <Network className="h-5 w-5 text-[#FF4B23]" />
              <h2 className="text-2xl font-black tracking-[-0.05em] uppercase text-[#0A0A0B]">Branching User Flows</h2>
            </div>
            <div className="space-y-6">
              {report.flows.map(flow => (
                <article key={flow.id} className="border border-[#0A0A0B]/15 bg-white p-6 md:p-8 space-y-6">
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold tracking-[-0.04em] text-[#0A0A0B]">{flow.name}</h3>
                    <p className="text-xs text-[#0A0A0B]/70 leading-6">{flow.description}</p>
                  </div>
                  <ol className="grid gap-3 md:grid-cols-2">
                    {flow.nodes.map((node, index) => (
                      <li key={node.id} className="border border-[#0A0A0B]/10 bg-[#F1F0EC]/50 p-4 text-xs space-y-2">
                        <span className="mono text-[10px] font-bold text-[#FF4B23] block">
                          {String(index + 1).padStart(2, "0")} / {node.nodeType.toUpperCase()}
                        </span>
                        <p className="font-bold text-[#0A0A0B]">{node.label}</p>
                        {node.trigger && <p className="text-[#0A0A0B]/60 text-[11px]">{node.trigger}</p>}
                      </li>
                    ))}
                  </ol>
                </article>
              ))}
            </div>
          </section>
        )}

        {report.requirements.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center gap-3 border-b-2 border-[#0A0A0B] pb-3">
              <FileText className="h-5 w-5 text-[#FF4B23]" />
              <h2 className="text-2xl font-black tracking-[-0.05em] uppercase text-[#0A0A0B]">Requirements & PRD</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {report.requirements.map((requirement, index) => (
                <article key={requirement.id} className="border border-[#0A0A0B]/15 bg-white p-6 space-y-4">
                  <span className="mono text-[10px] font-extrabold text-[#FF4B23] block">
                    REQ {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="font-bold text-[#0A0A0B] text-base leading-6">{requirement.statement}</h3>
                  <p className="text-xs leading-6 text-[#0A0A0B]/70">{requirement.userStory}</p>
                  <ul className="space-y-2 text-xs text-[#0A0A0B]/80 pt-2 border-t border-[#0A0A0B]/10">
                    {requirement.acceptanceCriteria.map(item => (
                      <li key={item} className="flex gap-2 items-start">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FF4B23]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
