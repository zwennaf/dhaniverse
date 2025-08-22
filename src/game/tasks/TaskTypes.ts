export interface GameTask {
  id: string;
  title: string;
  description: string;
  active: boolean;
  completed: boolean;
  createdAt: number;
}

export interface TaskUpdate {
  id: string;
  changes: Partial<Omit<GameTask, 'id'>>;
}
