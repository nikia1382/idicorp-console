import { Component, HostListener, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AbstractControl, FormBuilder, FormControl, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, of, Subject, switchMap, tap } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { TaskService } from '../../core/services/task.service';
import { Task, TaskFilter, TaskInput } from '../../core/models/task.model';
import { AppError } from '../../core/utils/http-error';
/** عنوانی که فقط فاصله دارد، مثل خالی، نامعتبر است. */
function notBlank(control: AbstractControl): ValidationErrors | null {
  const value = (control.value ?? '') as string;
  return value.trim().length > 0 ? null : { required: true };
}
@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './tasks.component.html',
  styleUrl: './tasks.component.css',
})
export class TasksComponent {
  readonly auth = inject(AuthService);
  private readonly tasksService = inject(TaskService);
  private readonly fb = inject(FormBuilder);

  // ───── فهرست و فیلتر ─────
  readonly search = new FormControl('', { nonNullable: true });
  readonly filter = signal<TaskFilter>('all');
  readonly tasks = signal<Task[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);

  readonly filterOptions: { value: TaskFilter; label: string }[] = [
    { value: 'all', label: 'همه' },
    { value: 'open', label: 'در انتظار' },
    { value: 'done', label: 'انجام‌شده' },
  ];

  // ───── دیالوگ ایجاد و ویرایش ─────
  readonly dialogOpen = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    title: ['', [notBlank, Validators.maxLength(120)]],
    description: ['', [Validators.maxLength(2000)]],
    completed: [false],
  });

  // ───── تأیید حذف ─────
  readonly pendingDelete = signal<Task | null>(null);
  readonly deleting = signal(false);

  // هر بار بارگذاری جدید، درخواست قبلی را لغو می‌کند
  private readonly reload = new Subject<void>();

  constructor() {
    this.reload
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set(null);
        }),
        switchMap(() =>
          this.tasksService.list(this.filter(), this.search.value).pipe(
            catchError((e: AppError) => {
              this.error.set(e.message);
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((tasks) => {
        if (tasks) {
          this.tasks.set(tasks);
        }
        this.loading.set(false);
      });

    this.search.valueChanges
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe(() => this.reload.next());

    this.reload.next();
  }

  // ───── فیلتر و بارگذاری ─────

  setFilter(value: TaskFilter): void {
    this.filter.set(value);
    this.reload.next();
  }

  retry(): void {
    this.reload.next();
  }

  // ───── ایجاد و ویرایش ─────

  openCreate(): void {
    this.form.reset({ title: '', description: '', completed: false });
    this.editingId.set(null);
    this.formError.set(null);
    this.dialogOpen.set(true);
  }

  openEdit(task: Task): void {
    this.form.reset({
      title: task.title,
      description: task.description ?? '',
      completed: task.completed,
    });
    this.editingId.set(task.id);
    this.formError.set(null);
    this.dialogOpen.set(true);
  }

  closeDialog(): void {
    // وقتی ذخیره در حال انجام است، بستن دیالوگ ممنوع است
    if (this.saving()) return;
    this.dialogOpen.set(false);
    this.formError.set(null);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const input: TaskInput = {
      title: raw.title.trim(),
      description: raw.description.trim(),
      completed: raw.completed,
    };

    // عنوانی که فقط فاصله دارد، معتبر نیست
    if (!input.title) {
      this.form.controls.title.setErrors({ required: true });
      this.form.markAllAsTouched();
      return;
    }

    const id = this.editingId();
    const request$ =
      id === null ? this.tasksService.create(input) : this.tasksService.update(id, input);

    this.saving.set(true);
    this.formError.set(null);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogOpen.set(false);
        this.reload.next();
      },
      error: (e: AppError) => {
        this.saving.set(false);
        this.formError.set(e.message);
      },
    });
  }

  // ───── تغییر وضعیت ─────

  toggle(task: Task): void {
    this.actionError.set(null);
    this.tasksService.patch(task.id, { completed: !task.completed }).subscribe({
      next: () => this.reload.next(),
      error: (e: AppError) => this.actionError.set(e.message),
    });
  }

  // ───── حذف ─────

  askDelete(task: Task): void {
    this.pendingDelete.set(task);
  }

  cancelDelete(): void {
    if (this.deleting()) return;
    this.pendingDelete.set(null);
  }

  confirmDelete(): void {
    const target = this.pendingDelete();
    if (!target) return;

    this.deleting.set(true);
    this.tasksService.remove(target.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.pendingDelete.set(null);
        this.reload.next();
      },
      error: (e: AppError) => {
        this.deleting.set(false);
        this.pendingDelete.set(null);
        this.actionError.set(e.message);
      },
    });
  }

  // ───── کیبورد: Escape همیشه بالاترین لایه را می‌بندد ─────

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.pendingDelete()) {
      this.cancelDelete();
      return;
    }
    this.closeDialog();
  }
}