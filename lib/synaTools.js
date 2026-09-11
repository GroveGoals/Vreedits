import { prisma } from "./prisma"; // adjust to your actual import

// Declares what Gemini is allowed to call, and how
export const SYNA_TOOLS = [
  {
    name: "getUserNotes",
    description: "Get the current user's saved Notes.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "getUserAssignments",
    description: "Get the current user's Assignments.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "createNote",
    description: "Create a new Note for the current user.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        content: { type: "string" },
      },
      required: ["content"],
    },
  },
];

export async function executeSynaTool(userId, name, args) {
  const perms = await getUserSynaPermissions(userId); // you'd implement this

  switch (name) {
    case "getUserNotes":
      if (!perms.notes) throw new Error("User hasn't granted Syna access to Notes.");
      return prisma.note.findMany({ where: { userId } });

    case "getUserAssignments":
      if (!perms.assignments) throw new Error("User hasn't granted Syna access to Assignments.");
      return prisma.assignment.findMany({ where: { userId } });

    case "createNote":
      if (!perms.notesWrite) throw new Error("User hasn't granted Syna write access to Notes.");
      return prisma.note.create({ data: { userId, title: args.title || "Untitled", content: args.content } });

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}