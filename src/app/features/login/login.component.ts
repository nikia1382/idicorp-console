import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AppError } from '../../core/utils/http-error';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = this.fb.nonNullable.group({
    username: ['admin', [Validators.required]],
    password: ['admin', [Validators.required]],
    captcha_answer: ['', [Validators.required]],
  });

  readonly captchaImage = signal<string | null>(null);
  readonly loadingCaptcha = signal(false);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  private salt = '';

  ngOnInit(): void {
    this.loadCaptcha();
  }

  loadCaptcha(): void {
    this.loadingCaptcha.set(true);
    this.error.set(null);

    this.auth.loadCaptcha().subscribe({
      next: (res) => {
        this.captchaImage.set(res.captcha);
        this.salt = res.salt;
        this.loadingCaptcha.set(false);
      },
      error: (e: AppError) => {
        this.error.set(e.message);
        this.loadingCaptcha.set(false);
      },
    });
  }

  submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    const { username, password, captcha_answer } = this.form.getRawValue();

    this.auth.login({ username, password, captcha_answer, salt: this.salt }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.router.navigateByUrl('/tasks');
      },
      error: (e: AppError) => {
        this.submitting.set(false);
        this.error.set(e.message);
        this.form.controls.captcha_answer.reset('');
        this.loadCaptcha();
      },
    });
  }
}