import { readdir } from "node:fs/promises";

export async function listClientGenerators(scriptsDirectory) {
  return (await readdir(scriptsDirectory))
    .filter((name) => /^generate-.+-client\.mjs$/u.test(name))
    .sort();
}

export function validateGeneratorRegistration(generators, generateCommand, checkCommand) {
  const generateMissing = [];
  const checkMissing = [];
  for (const generator of generators) {
    if (!generateCommand.includes(`scripts/${generator}`)) generateMissing.push(generator);
    if (!checkCommand.split("&&").some((part) => part.includes(`scripts/${generator} --check`))) checkMissing.push(generator);
  }
  return { generateMissing, checkMissing };
}
