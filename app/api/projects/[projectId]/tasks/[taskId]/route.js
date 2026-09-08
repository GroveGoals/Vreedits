import { NextResponse } from "next/server";
import { requireUser } from "@/lib/requireUser";
import { prisma } from "@/lib/prisma";

const VALID_STATUSES = ["todo", "in_progress", "done"];

export async function PATCH(req, { params }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const task = await prisma.projectTask.findUnique({
    where: { id: params.taskId },
    include: { project: true },
  });
  if (!task || task.project.userId !== user.id || task.projectId !== params.projectId) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  const { title, status, dueDate } = await req.json().catch(() => ({}));
  const data = {};
  if (title !== undefined) data.title = title.trim();
  if (status !== undefined) {
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    data.status = status;
  }
  if (dueDate !== undefined) data.dueDate = dueDate || null;

  const updated = await prisma.projectTask.update({ where: { id: params.taskId }, data });
  return NextResponse.json({ ok: true, task: updated });
}

export async function DELETE(req, { params }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const task = await prisma.projectTask.findUnique({
    where: { id: params.taskId },
    include: { project: true },
  });
  if (!task || task.project.userId !== user.id || task.projectId !== params.projectId) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  await prisma.projectTask.delete({ where: { id: params.taskId } });
  return NextResponse.json({ ok: true });
}