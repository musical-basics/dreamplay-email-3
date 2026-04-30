import { z } from "zod";

export const workspaceSchema = z.enum([
  "dreamplay_marketing",
  "dreamplay_support",
  "musicalbasics",
  "crossover",
  "concert_marketing",
]);

export type Workspace = z.infer<typeof workspaceSchema>;

export const workspaces = workspaceSchema.options;

export function audienceForWorkspace(workspace: Workspace) {
  switch (workspace) {
    case "musicalbasics":
      return "musicalbasics";
    case "concert_marketing":
      return "concert_marketing";
    case "crossover":
      return "both";
    case "dreamplay_marketing":
    case "dreamplay_support":
    default:
      return "dreamplay";
  }
}
