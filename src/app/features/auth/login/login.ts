import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { finalize, take } from 'rxjs';
import { AuthService } from 'app/core/services/apis/auth.service';
import { AuthService as AuthHelper } from 'app/core/services/auth';
import { Loader } from 'app/core/shared/components/loader/loader';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    Loader,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  protected readonly otpRequested = signal(false);
  protected readonly loginError = signal<string | null>(null);
  protected readonly otpHint = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly loadingText = signal('Loading...');

  protected readonly loginForm = new FormGroup({
    identifier: new FormControl('', [Validators.required, this.emailOrPhoneValidator]),
    otp: new FormControl(''),
  });

  private readonly authService = inject(AuthService);
  private readonly authHelper = inject(AuthHelper);
  private readonly router = inject(Router);

  protected requestOtp(): void {
    this.loginError.set(null);
    this.otpHint.set(null);

    const identifierControl = this.loginForm.controls.identifier;
    if (identifierControl.invalid) {
      identifierControl.markAsTouched();
      return;
    }

    this.loadingText.set('Sending OTP...');
    this.loading.set(true);
    this.authService.requestOtp({ identifier: identifierControl.value ?? '' }).pipe(
      take(1),
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: (response) => {
        this.otpRequested.set(true);
        this.loginForm.controls.otp.setValidators([Validators.required, Validators.pattern(/^\d{4,8}$/)]);
        this.loginForm.controls.otp.updateValueAndValidity();
        const method = response.data.deliveryMethod === 'email' ? 'email' : 'phone';
        this.otpHint.set(`OTP sent to your ${method}.${response.data.otp ? ` Dev OTP: ${response.data.otp}` : ''}`);
      },
      error: (error) => {
        this.loginError.set(error?.error?.message ?? 'Could not send OTP');
      },
    });
  }

  protected verifyOtp(): void {
    this.loginError.set(null);
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loadingText.set('Verifying OTP...');
    this.loading.set(true);
    this.authService.verifyOtp({
      identifier: this.loginForm.controls.identifier.value ?? '',
      otp: this.loginForm.controls.otp.value ?? '',
    }).pipe(
      take(1),
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: (response) => {
        this.authHelper.login(response.data.token);
        this.router.navigate(['/']);
      },
      error: (error) => {
        this.loginError.set(error?.error?.message ?? 'Invalid or expired OTP');
      },
    });
  }

  protected editIdentifier(): void {
    this.otpRequested.set(false);
    this.otpHint.set(null);
    this.loginForm.controls.otp.reset('');
    this.loginForm.controls.otp.clearValidators();
    this.loginForm.controls.otp.updateValueAndValidity();
  }

  private emailOrPhoneValidator(control: AbstractControl) {
    const value = `${control.value ?? ''}`.trim();
    if (!value) return null;

    const isEmail = /^\S+@\S+\.\S+$/.test(value);
    const isPhone = /^\+?[1-9]\d{1,14}$/.test(value);

    return isEmail || isPhone ? null : { emailOrPhone: true };
  }
}
