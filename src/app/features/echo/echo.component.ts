import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EchoWsService } from '../../core/services/echo-ws.service';

@Component({
  selector: 'app-echo',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './echo.component.html',
  styleUrl: './echo.component.css',
})
export class EchoComponent implements OnInit, OnDestroy {
  readonly ws = inject(EchoWsService);
  readonly message = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });
  readonly validationError = signal<string | null>(null);

  ngOnInit(): void {
    this.ws.connect();
  }

  ngOnDestroy(): void {
    this.ws.disconnect();
  }

  reconnect(): void {
    this.ws.disconnect();
    this.ws.connect();
  }

  send(): void {
    const text = this.message.value.trim();
    if (!text) {
      this.validationError.set('متنی برای ارسال وارد کنید.');
      return;
    }

    this.validationError.set(null);
    this.ws.send(text);
    this.message.reset('');
  }
}