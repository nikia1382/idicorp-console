import { Routes } from '@angular/router';
import { LoginComponent } from './features/login/login.component';
import { TasksComponent } from './features/tasks/tasks.component';
import { CalculatorComponent } from './features/calculator/calculator.component';
import { EchoComponent } from './features/echo/echo.component';
import { StreamComponent } from './features/stream/stream.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'tasks', component: TasksComponent, canActivate: [authGuard] },
  { path: 'calculator', component: CalculatorComponent, canActivate: [authGuard] },
  { path: 'echo', component: EchoComponent, canActivate: [authGuard] },
  { path: 'stream', component: StreamComponent, canActivate: [authGuard] },
  { path: '', redirectTo: 'tasks', pathMatch: 'full' },
  { path: '**', redirectTo: 'tasks' },
];