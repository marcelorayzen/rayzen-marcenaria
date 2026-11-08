import {
  type ProjectSnapshot,
  validateProjectSnapshot,
} from "./projectDomain";

export interface ProjectRecord {
  id: string;
  title: string;
  createdAt: string;
  archivedAt?: string;
}

export interface RestoreRevisionInput {
  projectId: string;
  sourceRevisionId: string;
  newRevisionId: string;
  restoredAt: string;
}

/**
 * Small local repository used to prove revision semantics before choosing a
 * persistence adapter. Every public read and write clones its value, so a
 * caller cannot mutate an already-saved revision by retaining a reference.
 */
export class InMemoryProjectRepository {
  private readonly projects = new Map<string, ProjectRecord>();
  private readonly revisions = new Map<string, ProjectSnapshot[]>();

  createProject(project: ProjectRecord): void {
    requireText(project.id, "O projeto precisa de identificador.");
    requireText(project.title, "O projeto precisa de título.");
    requireValidDate(project.createdAt, "O projeto precisa de data de criação válida.");
    if (this.projects.has(project.id)) {
      throw new Error("Já existe um projeto com este identificador.");
    }

    this.projects.set(project.id, clone(project));
    this.revisions.set(project.id, []);
  }

  saveRevision(snapshot: ProjectSnapshot): void {
    const issues = validateProjectSnapshot(snapshot);
    if (issues.length > 0) {
      throw new Error(issues.map((issue) => `${issue.path}: ${issue.message}`).join(" "));
    }

    const storedRevisions = this.revisions.get(snapshot.project.id);
    if (storedRevisions === undefined) {
      throw new Error("O projeto da revisão não existe.");
    }

    const expectedNumber = storedRevisions.length + 1;
    if (snapshot.revision.number !== expectedNumber) {
      throw new Error(`A próxima revisão precisa ser R${expectedNumber}.`);
    }
    if (storedRevisions.some((revision) => revision.revision.id === snapshot.revision.id)) {
      throw new Error("Já existe uma revisão com este identificador.");
    }

    storedRevisions.push(clone(snapshot));
  }

  getProject(projectId: string): ProjectRecord | null {
    const project = this.projects.get(projectId);
    return project === undefined ? null : clone(project);
  }

  listRevisions(projectId: string): ProjectSnapshot[] {
    return (this.revisions.get(projectId) ?? []).map((revision) => clone(revision));
  }

  restoreRevision(input: RestoreRevisionInput): ProjectSnapshot {
    const revisions = this.revisions.get(input.projectId);
    if (revisions === undefined) {
      throw new Error("O projeto da revisão não existe.");
    }
    requireText(input.newRevisionId, "A nova revisão precisa de identificador.");
    requireValidDate(input.restoredAt, "A restauração precisa de data válida.");

    const source = revisions.find(
      (revision) => revision.revision.id === input.sourceRevisionId,
    );
    if (source === undefined) {
      throw new Error("A revisão de origem não existe neste projeto.");
    }

    const restored = clone(source);
    restored.revision = {
      id: input.newRevisionId,
      number: revisions.length + 1,
      createdAt: input.restoredAt,
      baseRevisionId: source.revision.id,
    };
    this.saveRevision(restored);
    return clone(restored);
  }
}

function requireText(value: string, message: string) {
  if (value.trim().length === 0) {
    throw new Error(message);
  }
}

function requireValidDate(value: string, message: string) {
  if (Number.isNaN(Date.parse(value))) {
    throw new Error(message);
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
