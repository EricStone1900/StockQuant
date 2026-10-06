import { createHash } from "node:crypto";
import { realpath, readFile, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";

const inside = (root, target) => {
  const rel = relative(root, target);
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel));
};

export async function verifyFixtureAuthorizationRef(repositoryRoot, authorizationRef, authorizationSha256) {
  if (typeof authorizationRef !== "string" || !authorizationRef.startsWith("evidence/") || authorizationRef.includes("\\")
    || authorizationRef.split("/").some((part) => part === ".." || part === "")) {
    return { ok: false, reason: "authorization reference must be a repository-relative evidence/ path" };
  }
  if (typeof authorizationSha256 !== "string" || !/^[a-f0-9]{64}$/u.test(authorizationSha256)) {
    return { ok: false, reason: "authorization reference SHA-256 is invalid" };
  }
  try {
    const root = await realpath(repositoryRoot);
    const lexicalTarget = resolve(root, authorizationRef);
    if (!inside(root, lexicalTarget)) return { ok: false, reason: "authorization reference escapes repository" };
    const target = await realpath(lexicalTarget);
    if (!inside(root, target)) return { ok: false, reason: "authorization reference escapes repository" };
    if (!(await stat(target)).isFile()) return { ok: false, reason: "authorization reference is not a repository file" };
    const actual = createHash("sha256").update(await readFile(target)).digest("hex");
    return actual === authorizationSha256
      ? { ok: true }
      : { ok: false, reason: "authorization reference SHA-256 mismatch" };
  } catch {
    return { ok: false, reason: "authorization reference is missing or unreadable" };
  }
}
