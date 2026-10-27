import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CalcOperation, CalculatorWsService } from '../../core/services/calculator-ws.service';

const MAX_NUMBERS = 100;
const MAX_ABS_VALUE = 1e12;

const OPERATIONS: { value: CalcOperation; label: string }[] = [
  { value: 'add', label: 'جمع' },
  { value: 'subtract', label: 'تفریق' },
  { value: 'multiply', label: 'ضرب' },
  { value: 'divide', label: 'تقسیم' },
];

/** ارقام فارسی و عربی و ویرگول فارسی را به حالت استاندارد تبدیل می‌کند. */
function normalizeInput(text: string): string {
  return text
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/،/g, ',')
    .replace(/٬/g, '');
}

/** اگر یکی از توکن‌ها عدد نباشد null برمی‌گرداند. */
function parseNumbers(text: string): number[] | null {
  const tokens = normalizeInput(text).split(/[,\s]+/).filter(Boolean);
  const values = tokens.map(Number);
  return values.every((n) => Number.isFinite(n)) ? values : null;
}

/** اعتبارسنجی سمت کلاینت؛ سرور همچنان مرجع نهایی است. */
function validate(operation: CalcOperation, values: number[] | null): string | null {
  if (values === null) return 'فقط عدد وارد کنید. مثال: 10, 20, 30';
  if (values.length === 0) return 'حداقل یک عدد وارد کنید.';
  if (values.length > MAX_NUMBERS) return `حداکثر ${MAX_NUMBERS} عدد مجاز است.`;
  if (values.some((n) => Math.abs(n) > MAX_ABS_VALUE)) {
    return 'قدرمطلق هر عدد نباید بیشتر از ۱ تریلیون باشد.';
  }
  if (operation === 'divide' && values.slice(1).some((n) => n === 0)) {
    return 'تقسیم بر صفر مجاز نیست.';
  }
  return null;
}

@Component({
  selector: 'app-calculator',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './calculator.component.html',
  styleUrl: './calculator.component.css',
})
export class CalculatorComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  readonly ws = inject(CalculatorWsService);

  readonly operations = OPERATIONS;
  readonly validationError = signal<string | null>(null);
  readonly ready = computed(() => this.ws.status() === 'ready');

  readonly form = this.fb.nonNullable.group({
    operation: ['add' as CalcOperation],
    numbers: ['', [Validators.required]],
  });

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

  submit(): void {
    const { operation, numbers } = this.form.getRawValue();
    const values = parseNumbers(numbers);
    const problem = validate(operation, values);

    this.validationError.set(problem);
    if (problem || !values) return;

    this.ws.compute(operation, values);
  }
}