import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from 'app/core/services/apis/auth.service';
import { AuthService as AuthHelper } from 'app/core/services/auth';
import { Router } from '@angular/router';
import { take } from 'rxjs';

@Component({
  selector: 'app-email-login',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  templateUrl: './email-login.html',
  styleUrl: './email-login.scss',
})
export class EmailLoginComponent {
  protected readonly loginError = signal<string | null>(null);
  protected loginForm: FormGroup;

  private readonly authService = inject(AuthService);
  private readonly authHelper = inject(AuthHelper);
  private readonly router = inject(Router);

  constructor() {
    this.loginForm = new FormGroup({
      email: new FormControl('', [Validators.required, Validators.email]),
      password: new FormControl('', [Validators.required]),
    });
  }

  onSubmit(): void {
    this.loginError.set(null);
    if (!this.loginForm.valid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.authService.login(this.loginForm.value).pipe(take(1)).subscribe({
      next: (response) => {
        this.authHelper.login(response.data.token);
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.loginError.set('Invalid email or password');
        console.error('Login failed', err);
      },
    });
  }

  protected redirectToForgotPassword(){
    this.router.navigate(['/auth/forgot-password']);
  }
}
