"use server";

import { revalidatePath } from "next/cache";

import { runLacunaAiFlowIngest } from "@/lib/ai/run-ai-flow-ingest";
import {
  isNonWritableFilesystemError,
  READ_ONLY_FILESYSTEM_USER_MESSAGE,
} from "@/lib/fs-non-writable";
import {
  clearLacunaAiFlow,
  pruneLacunaAiFlowForDeletedWork,
  restoreAiFlowFromStarter,
} from "@/lib/lacuna-ai-flow";
import {
  appendWork,
  clearAllWorks,
  deleteWorkById,
  getWorks,
  restoreWorksFromStarter,
  updateWorkById,
  type WorkExcerpt,
} from "@/lib/works";

export type CreateWorkState = { error?: string; success?: boolean };

export type UpdateWorkResult =
  | { success: true }
  | { success: false; error: string };

const MAX_EXCERPTS = 200;
const MAX_EXCERPT_CHARS = 32_000;
const MAX_SOURCE_LANG_CHARS = 32;

function excerptListErrorMessage(excerpts: WorkExcerpt[]): string | null {
  if (!Array.isArray(excerpts)) {
    return "Invalid excerpts payload.";
  }
  if (excerpts.length > MAX_EXCERPTS) {
    return `At most ${MAX_EXCERPTS} excerpts allowed.`;
  }
  for (const e of excerpts) {
    if (
      !e ||
      typeof e !== "object" ||
      typeof e.id !== "string" ||
      e.id.length === 0 ||
      typeof e.text !== "string" ||
      e.text.length > MAX_EXCERPT_CHARS
    ) {
      return "Invalid excerpt entry.";
    }
    const sl = (e as { sourceLang?: unknown }).sourceLang;
    if (
      sl !== undefined &&
      sl !== null &&
      (typeof sl !== "string" || sl.length > MAX_SOURCE_LANG_CHARS)
    ) {
      return "Invalid excerpt source language.";
    }
  }
  return null;
}

export async function createWork(
  title: string,
  author: string,
  excerpts: WorkExcerpt[],
): Promise<CreateWorkState> {
  const t = title.trim();
  const a = author.trim();
  if (!t) return { error: "Title is required." };
  if (!a) return { error: "Author is required." };

  const excerptErr = excerptListErrorMessage(excerpts);
  if (excerptErr) return { error: excerptErr };

  try {
    await appendWork({ title: t, author: a, excerpts });
  } catch (e) {
    if (isNonWritableFilesystemError(e)) {
      return { error: READ_ONLY_FILESYSTEM_USER_MESSAGE };
    }
    throw e;
  }
  revalidatePath("/admin");
  revalidatePath("/");
  return { success: true };
}

export async function updateWork(
  id: string,
  title: string,
  author: string,
  excerpts: WorkExcerpt[],
): Promise<UpdateWorkResult> {
  const t = title.trim();
  const a = author.trim();
  if (!t) return { success: false, error: "Title is required." };
  if (!a) return { success: false, error: "Author is required." };

  const excerptErr = excerptListErrorMessage(excerpts);
  if (excerptErr) return { success: false, error: excerptErr };

  let work;
  try {
    work = await updateWorkById(id, { title: t, author: a, excerpts });
  } catch (e) {
    if (isNonWritableFilesystemError(e)) {
      return { success: false, error: READ_ONLY_FILESYSTEM_USER_MESSAGE };
    }
    throw e;
  }
  if (!work) return { success: false, error: "Work not found." };

  revalidatePath("/admin");
  revalidatePath("/");
  return { success: true };
}

export type DeleteWorkResult =
  | { success: true }
  | { success: false; error: string };

export async function deleteWork(id: string): Promise<DeleteWorkResult> {
  const trimmed = String(id ?? "").trim();
  if (!trimmed) return { success: false, error: "Invalid work id." };

  const works = await getWorks();
  if (!works.some((w) => w.id === trimmed)) {
    return { success: false, error: "Work not found." };
  }

  try {
    await pruneLacunaAiFlowForDeletedWork(trimmed);
    const removed = await deleteWorkById(trimmed);
    if (!removed) return { success: false, error: "Work not found." };
  } catch (e) {
    if (isNonWritableFilesystemError(e)) {
      return { success: false, error: READ_ONLY_FILESYSTEM_USER_MESSAGE };
    }
    throw e;
  }

  revalidatePath("/admin");
  revalidatePath("/");
  return { success: true };
}

const WIPE_CONFIRM_PHRASE = "DELETE";

export type WipeLibraryResult =
  | { success: true }
  | { success: false; error: string };

export async function wipeAllLibraryData(
  confirmation: string,
): Promise<WipeLibraryResult> {
  if (confirmation.trim() !== WIPE_CONFIRM_PHRASE) {
    return {
      success: false,
      error: `Type ${WIPE_CONFIRM_PHRASE} to confirm.`,
    };
  }

  try {
    await clearAllWorks();
    await clearLacunaAiFlow();
  } catch (e) {
    if (isNonWritableFilesystemError(e)) {
      return { success: false, error: READ_ONLY_FILESYSTEM_USER_MESSAGE };
    }
    throw e;
  }
  revalidatePath("/admin");
  revalidatePath("/");
  return { success: true };
}

const RESTORE_CONFIRM_PHRASE = "RESTORE";

export type RestoreStarterResult =
  | { success: true }
  | { success: false; error: string };

export async function restoreStarterLibrary(
  confirmation: string,
): Promise<RestoreStarterResult> {
  if (confirmation.trim() !== RESTORE_CONFIRM_PHRASE) {
    return {
      success: false,
      error: `Type ${RESTORE_CONFIRM_PHRASE} to confirm.`,
    };
  }

  const result = await restoreWorksFromStarter();
  if (!result.ok) return { success: false, error: result.error };

  const flowResult = await restoreAiFlowFromStarter();
  if (!flowResult.ok) return { success: false, error: flowResult.error };

  revalidatePath("/admin");
  revalidatePath("/");
  return { success: true };
}

const CLEAR_AI_FLOW_CONFIRM_PHRASE = "CLEAR";

export type ClearAiFlowOutputResult =
  | { success: true }
  | { success: false; error: string };

export async function clearAiFlowOutput(
  confirmation: string,
): Promise<ClearAiFlowOutputResult> {
  if (confirmation.trim() !== CLEAR_AI_FLOW_CONFIRM_PHRASE) {
    return {
      success: false,
      error: `Type ${CLEAR_AI_FLOW_CONFIRM_PHRASE} to confirm.`,
    };
  }

  try {
    await clearLacunaAiFlow();
  } catch (e) {
    if (isNonWritableFilesystemError(e)) {
      return { success: false, error: READ_ONLY_FILESYSTEM_USER_MESSAGE };
    }
    throw e;
  }
  revalidatePath("/admin");
  revalidatePath("/");
  return { success: true };
}

export type RunAiFlowResult =
  | { success: true }
  | { success: false; error: string };

export async function runAiFlowIngest(): Promise<RunAiFlowResult> {
  let result;
  try {
    result = await runLacunaAiFlowIngest();
  } catch (e) {
    if (isNonWritableFilesystemError(e)) {
      return { success: false, error: READ_ONLY_FILESYSTEM_USER_MESSAGE };
    }
    throw e;
  }
  if (!result.ok) return { success: false, error: result.error };
  revalidatePath("/admin");
  revalidatePath("/");
  return { success: true };
}
