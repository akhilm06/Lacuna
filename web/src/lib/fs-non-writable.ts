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
