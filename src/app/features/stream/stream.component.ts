import { Component, OnDestroy, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { StreamService } from '../../core/services/stream.service';

@Component({
  selector: 'app-stream',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './stream.component.html',
  styleUrl: './stream.component.css',
})
export class StreamComponent implements OnDestroy {
  private readonly stream = inject(StreamService);
  private controller: AbortController | null = null;

  readonly input = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });

  readonly output = signal('');
  readonly running = signal(false);
  readonly error = signal<string | null>(null);
  readonly validationError = signal<string | null>(null);

  async start(): Promise<void> {
    const text = this.input.value;
    if (!text.trim()) {
      this.validationError.set('متنی برای ارسال وارد کنید.');
      return;
    }

    this.validationError.set(null);
    this.error.set(null);
    this.output.set('');
    this.running.set(true);

    this.controller = new AbortController();

    try {
      await this.stream.echo(
        text,
        (chunk) => this.output.update((current) => current + chunk),
        this.controller.signal,
      );
    } catch (e) {
      // لغو شدن توسط کاربر خطا نیست
      if ((e as Error).name !== 'AbortError') {
        this.error.set((e as Error).message ?? 'خطای غیرمنتظره‌ای رخ داد.');
      }
    } finally {
      this.running.set(false);
      this.controller = null;
    }
  }

  cancel(): void {
    this.controller?.abort();
  }

  ngOnDestroy(): void {
    this.controller?.abort();
  }
}