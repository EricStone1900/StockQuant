export function paperVerificationCommand(args = []) {
  if (args.length > 0 && !(args.length === 1 && (args[0] === "--help" || args[0] === "-h"))) {
    throw new Error("usage: pnpm verify:paper [--help]");
  }
  return args.length ? null : ["pnpm", ["test:e2e", "--", "--stage", "V1.3"]];
}
