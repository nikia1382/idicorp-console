import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Task, TaskFilter, TaskInput, TaskPatch } from '../models/task.model';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly api = inject(ApiService);

  list(filter: TaskFilter, query: string): Observable<Task[]> {
    const completed = filter === 'all' ? undefined : filter === 'done';
    return this.api.get<Task[]>('/api/tasks', {
      completed,
      q: query.trim() || undefined,
    });
  }

  create(input: TaskInput): Observable<Task> {
    return this.api.post<Task>('/api/tasks', input);
  }

  /** PUT همه‌ی فیلدها را می‌خواهد، پس همیشه کامل فرستاده می‌شود. */
  update(id: number, input: TaskInput): Observable<Task> {
    return this.api.put<Task>(`/api/tasks/${id}`, input);
  }

  /** برای تغییرات جزئی، مثل تغییر وضعیت. */
  patch(id: number, patch: TaskPatch): Observable<Task> {
    return this.api.patch<Task>(`/api/tasks/${id}`, patch);
  }

  remove(id: number): Observable<void> {
    return this.api.delete<void>(`/api/tasks/${id}`);
  }
}