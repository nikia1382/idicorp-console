export interface Task {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskInput {
  title: string;
  description?: string;
  completed?: boolean;
}

export type TaskPatch = Partial<TaskInput>;

export type TaskFilter = 'all' | 'open' | 'done';