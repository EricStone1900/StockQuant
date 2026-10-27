import { spawnSync } from "node:child_process";

/** Remove only image tags owned by a registered isolated Compose project. */
export function removeIsolatedProjectImages(project, run = spawnSync) {
  if (typeof project !== "string" || !/^sq-v(?:11-stack|12-e2e|13-web|14-stack|15-stack|21-stack)-[a-f0-9]{20}$/u.test(project)) {
    return { status: 2, error: "invalid isolated project name", removed: [] };
  }

  const filter = `reference=${project}-*`;
  const listed = run("docker", ["image", "ls", "--format", "{{.Repository}}:{{.Tag}}", "--filter", filter], { encoding: "utf8" });
  if (listed.status !== 0) return { status: listed.status ?? 1, error: listed.stderr || "could not list project images", removed: [] };

  const references = listed.stdout.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
  if (references.some((reference) => !reference.startsWith(`${project}-`))) {
    return { status: 1, error: "image filter returned a tag outside the isolated project", removed: [] };
  }
  if (references.length > 0) {
    const removed = run("docker", ["image", "rm", ...references], { encoding: "utf8" });
    if (removed.status !== 0) return { status: removed.status ?? 1, error: removed.stderr || "could not remove project image tags", removed: [] };
  }

  const remaining = run("docker", ["image", "ls", "-q", "--filter", filter], { encoding: "utf8" });
  if (remaining.status !== 0 || remaining.stdout.trim()) {
    return { status: 1, error: remaining.stderr || "project image tags remain after removal", removed: [] };
  }
  return { status: 0, removed: references };
}
