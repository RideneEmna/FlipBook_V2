import { CURRENT_SCHEMA_VERSION, type Project } from '../types/flipbook';

/** Upgrades any older project (no schemaVersion = legacy v1) to the current shape. */
export function migrateProject(raw: any): Project {
  const version: number = raw?.schemaVersion ?? 1;
  if (version > CURRENT_SCHEMA_VERSION) {
    throw new Error(`This book was made with a newer version (schema ${version}).`);
  }
  const project = { ...raw };
  // if (version < 2) { ...convert v1 -> v2... }
  project.schemaVersion = CURRENT_SCHEMA_VERSION;
  return project as Project;
}
