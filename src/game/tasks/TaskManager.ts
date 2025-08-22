import { GameTask, TaskUpdate } from './TaskTypes';

// Simple event names for HUD integration
export const TASK_EVENTS = {
  ADDED: 'task-added',
  UPDATED: 'task-updated',
  REMOVED: 'task-removed',
  ACTIVATED: 'task-activated',
  COMPLETED: 'task-completed'
} as const;

export class TaskManager {
  private tasks: Map<string, GameTask> = new Map();

  addTask(task: Omit<GameTask, 'createdAt'>) {
    if (this.tasks.has(task.id)) return;
    const full: GameTask = { ...task, createdAt: Date.now() };
    this.tasks.set(full.id, full);
    this.dispatch(TASK_EVENTS.ADDED, { task: full });
    if (full.active) this.dispatch(TASK_EVENTS.ACTIVATED, { task: full });
  }

  updateTask(update: TaskUpdate) {
    const existing = this.tasks.get(update.id);
    if (!existing) return;
    const merged = { ...existing, ...update.changes };
    this.tasks.set(update.id, merged);
    this.dispatch(TASK_EVENTS.UPDATED, { task: merged });
    if (update.changes.active) this.dispatch(TASK_EVENTS.ACTIVATED, { task: merged });
    if (update.changes.completed) this.dispatch(TASK_EVENTS.COMPLETED, { task: merged });
  }

  completeTask(id: string) {
    this.updateTask({ id, changes: { completed: true, active: false } });
  }

  removeTask(id: string) {
    const t = this.tasks.get(id);
    if (!t) return;
    this.tasks.delete(id);
    this.dispatch(TASK_EVENTS.REMOVED, { task: t });
  }

  getActiveTasks(): GameTask[] {
    return Array.from(this.tasks.values()).filter(t => t.active && !t.completed);
  }

  getTasks(): GameTask[] { return Array.from(this.tasks.values()); }

  private dispatch(name: string, detail: any) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }
}

// Singleton export & accessor for DI flexibility
let _taskManager: TaskManager = new TaskManager();
export const getTaskManager = () => _taskManager;
export const provideTaskManager = (mgr: TaskManager) => { _taskManager = mgr; };
