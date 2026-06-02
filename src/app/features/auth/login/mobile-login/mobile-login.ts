import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-mobile-login',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  templateUrl: './mobile-login.html',
  styleUrl: './mobile-login.scss',
})
export class MobileLoginComponent {
  protected readonly loginError = signal<string | null>(null);
  protected loginForm: FormGroup;

  constructor() {
    this.loginForm = new FormGroup({
      phone: new FormControl('', [Validators.required, Validators.pattern(/^\d{10}$/)]),
    });
  }

  protected onSubmit(): void {
    this.loginError.set(null);
    if (!this.loginForm.valid) {
      this.loginForm.markAllAsTouched();
      return;
    }
  }
}
