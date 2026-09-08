import { NextResponse } from "next/server";
import { requireUser } from "@/lib/requireUser";
import { prisma } from "@/lib/prisma";

export async function POST(req, { params }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const project = await prisma.project.findUnique({ where: { id: params.projectId } });
  if (!project || project.userId !== user.id) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const { title, dueDate } = await req.json().catch(() => ({}));
  if (!title?.trim()) {
    return NextResponse.json({ error: "Task title is required." }, { status: 400 });
  }

  const task = await prisma.projectTask.create({
    data: { projectId: params.projectId, title: title.trim(), dueDate: dueDate || null },
  });

  return NextResponse.json({ ok: true, task });
}