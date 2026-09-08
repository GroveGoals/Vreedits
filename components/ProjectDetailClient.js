"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Loader2, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";

const COLUMNS = [
  { key: "todo", label: "To Do" },
  { key: "in_progress", label: "In Progress" },
  { key: "done", label: "Done" },
];

export default function ProjectDetailClient({ projectId }) {
  const router = useRouter();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      const data = await res.json();
      if (res.ok) setProject(data.project);
      else setError(data.error || "Could not load project.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  async function handleAddTask(e) {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    setAdding(true);
    const res = await fetch(`/api/projects/${projectId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: taskTitle }),
    });
    const data = await res.json();
    setAdding(false);
    if (res.ok) {
      setProject((p) => ({ ...p, tasks: [...p.tasks, data.task] }));
      setTaskTitle("");
      setAddOpen(false);
    }
  }

  async function moveTask(taskId, status) {
    setProject((p) => ({ ...p, tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, status } : t)) }));
    await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  async function deleteTask(taskId) {
    setProject((p) => ({ ...p, tasks: p.tasks.filter((t) => t.id !== taskId) }));
    await fetch(`/api/projects/${projectId}/tasks/${taskId}`, { method: "DELETE" });
  }

  async function handleDeleteProject() {
    if (!window.confirm(`Delete "${project.name}" and all its tasks?`)) return;
    await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    router.push("/tools/business/projects");
  }

  if (loading) {
    return <div className="flex justify-center py-16" style={{ color: "var(--text-muted)" }}><Loader2 size={22} className="animate-spin" /></div>;
  }

  if (error || !project) {
    return (
      <div className="min-h-screen flex flex-col items-center px-4 pb-16">
        <div className="w-full max-w-[480px] mt-10">
          <button onClick={() => router.push("/tools/business/projects")} className="btn-text inline-flex items-center gap-1.5 mb-4">
            <ArrowLeft size={14} /> Projects
          </button>
          <div className="alert alert-error"><AlertCircle size={15} />{error || "Project not found."}</div>
        </div>
      </div>
    );
  }

  const doneCount = project.tasks.filter((t) => t.status === "done").length;

  return (
    <div className="min-h-screen flex flex-col items-center px-4 pb-16">
      <div className="w-full max-w-[480px] mt-10">
        <button onClick={() => router.push("/tools/business/projects")} className="btn-text inline-flex items-center gap-1.5 mb-4">
          <ArrowLeft size={14} /> Projects
        </button>

        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
            {project.name}
          </h1>
          <button onClick={handleDeleteProject} aria-label="Delete project" style={{ color: "var(--danger, #e55)", background: "none", border: "none" }}>
            <Trash2 size={16} />
          </button>
        </div>
        {project.description && (
          <p className="text-sm mb-2" style={{ color: "var(--text-muted)" }}>{project.description}</p>
        )}
        <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
          {doneCount} / {project.tasks.length} done
        </p>

        {!addOpen ? (
          <button onClick={() => setAddOpen(true)} className="btn-primary mb-6">
            <Plus size={14} /> Add Task
          </button>
        ) : (
          <form onSubmit={handleAddTask} className="flex gap-2 mb-6">
            <input className="input pl-3" placeholder="Task title" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} autoFocus />
            <button type="submit" disabled={adding || !taskTitle.trim()} className="btn-primary" style={{ width: "auto", padding: "0 16px" }}>
              {adding ? <Loader2 size={14} className="animate-spin" /> : "Add"}
            </button>
          </form>
        )}

        {COLUMNS.map((col) => {
          const tasks = project.tasks.filter((t) => t.status === col.key);
          return (
            <div key={col.key} className="mb-5">
              <h2 className="text-sm font-semibold mb-2" style={{ color: "var(--text-muted)" }}>
                {col.label} ({tasks.length})
              </h2>
              {tasks.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Nothing here.</p>
              ) : (
                <div className="space-y-1.5">
                  {tasks.map((task) => (
                    <div key={task.id} className="card p-2.5 flex items-center gap-2">
                      {col.key !== "done" ? (
                        <button
                          onClick={() => moveTask(task.id, col.key === "todo" ? "in_progress" : "done")}
                          aria-label="Advance task"
                          style={{ background: "none", border: "none", color: "var(--text-muted)", flexShrink: 0 }}
                        >
                          <CheckCircle2 size={16} />
                        </button>
                      ) : (
                        <CheckCircle2 size={16} style={{ color: "var(--success, #4ade80)", flexShrink: 0 }} />
                      )}
                      <span
                        className="text-sm"
                        style={{
                          flex: 1,
                          textDecoration: col.key === "done" ? "line-through" : "none",
                          color: col.key === "done" ? "var(--text-muted)" : "var(--text)",
                        }}
                      >
                        {task.title}
                      </span>
                      {col.key === "in_progress" && (
                        <button onClick={() => moveTask(task.id, "todo")} className="text-xs" style={{ color: "var(--text-muted)", background: "none", border: "none" }}>
                          ← Back
                        </button>
                      )}
                      {col.key === "done" && (
                        <button onClick={() => moveTask(task.id, "in_progress")} className="text-xs" style={{ color: "var(--text-muted)", background: "none", border: "none" }}>
                          Reopen
                        </button>
                      )}
                      <button onClick={() => deleteTask(task.id)} aria-label="Delete task" style={{ background: "none", border: "none", color: "var(--text-muted)", flexShrink: 0 }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
