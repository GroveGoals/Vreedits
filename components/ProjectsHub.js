"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Loader2, FolderKanban, AlertCircle } from "lucide-react";

export default function ProjectsHub() {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      if (res.ok) setProjects(data.projects || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError("");
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) { setError(data.error || "Could not create project."); return; }
    router.push(`/tools/business/projects/${data.project.id}`);
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-4 pb-16">
      <div className="w-full max-w-[480px] mt-10">
        <Link href="/tools/business" className="btn-text inline-flex items-center gap-1.5 mb-4">
          <ArrowLeft size={14} /> Business
        </Link>

        <div className="flex items-center gap-2 mb-1">
          <FolderKanban size={18} style={{ color: "var(--accent)" }} />
          <h1 className="text-xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
            Projects
          </h1>
        </div>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          Track tasks from To Do to Done.
        </p>

        {!createOpen ? (
          <button onClick={() => setCreateOpen(true)} className="btn-primary mb-6">
            <Plus size={14} /> New Project
          </button>
        ) : (
          <form onSubmit={handleCreate} className="card p-4 space-y-2 mb-6">
            {error && <div className="alert alert-error"><AlertCircle size={14} />{error}</div>}
            <input className="input pl-3" placeholder="Project name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            <input className="input pl-3" placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
            <div className="flex gap-2">
              <button className="btn-primary" type="submit" disabled={creating || !name.trim()}>
                {creating ? <Loader2 size={14} className="animate-spin" /> : "Create"}
              </button>
              <button type="button" onClick={() => setCreateOpen(false)} className="btn-primary" style={{ background: "var(--surface-2)", color: "var(--text)" }}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="flex justify-center py-10" style={{ color: "var(--text-muted)" }}>
            <Loader2 size={22} className="animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <p className="text-sm text-center" style={{ color: "var(--text-muted)" }}>
            No projects yet — create one above.
          </p>
        ) : (
          <div className="space-y-2">
            {projects.map((project) => (
              <Link key={project.id} href={`/tools/business/projects/${project.id}`} className="card p-3 flex items-center gap-3">
                <FolderKanban size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="text-sm font-semibold">{project.name}</div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {project._count?.tasks ?? 0} task{project._count?.tasks === 1 ? "" : "s"}
                    {project.status !== "active" ? ` · ${project.status}` : ""}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
