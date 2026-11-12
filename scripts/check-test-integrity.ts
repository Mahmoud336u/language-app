export interface Violation {
  code: string;
  path: string;
  commit: string;
  message: string;
}

export interface IntegrityResult {
  ok: boolean;
  violations: Violation[];
  revisions: { path: string; commit: string; decision: string }[];
  commitsChecked: number;
}

export interface IntegrityOptions {
  repo: string;
  base: string;
  head: string;
}

// Importable bootstrap seam: a non-passing result, never a success placeholder.
export function inspectRepository(options: IntegrityOptions): IntegrityResult {
  void options;
  return {
    ok: false,
    violations: [{ code: 'NOT_IMPLEMENTED', path: '', commit: '', message: 'Integrity inspection is not implemented.' }],
    revisions: [],
    commitsChecked: 0
  };
}
