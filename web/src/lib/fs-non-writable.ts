/** True when the error likely means we cannot persist under `data/` (e.g. Vercel serverless). */
export function isNonWritableFilesystemError(err: unknown): boolean {
  const e = err as NodeJS.ErrnoException;
  const code = e?.code;
  return (
    code === "EROFS" ||
    code === "EACCES" ||
    code === "EPERM" ||
    code === "ENOTSUP"
  );
}

/** Shown when Admin actions need to write JSON under `data/` but the host filesystem is read-only. */
export const READ_ONLY_FILESYSTEM_USER_MESSAGE =
  "This deployment cannot save data (read-only filesystem). Run the app locally to use restore, add works, and other features that write files.";
