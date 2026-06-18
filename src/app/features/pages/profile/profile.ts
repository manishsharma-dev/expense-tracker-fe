import { ScrollingModule } from '@angular/cdk/scrolling';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize, take } from 'rxjs';
import { AuthService as AuthApiService } from 'app/core/services/apis/auth.service';
import { ExpenseApiService } from 'app/core/services/apis/expense.service';
import { AuthService as AuthStateService } from 'app/core/services/auth';
import { Loader } from 'app/core/shared/components/loader/loader';
import { UserGender } from 'app/core/shared/types/auth.model';
import { Country } from 'app/core/shared/types/expense.model';
import { filterCurrencyCountries } from 'app/core/shared/utils/country-currency';
import { formatDateOnly } from 'app/core/shared/utils/date';

type ProfileForm = {
  name: FormControl<string>;
  email: FormControl<string>;
  phone: FormControl<string>;
  gender: FormControl<UserGender | ''>;
  dateOfBirth: FormControl<Date | null>;
  country: FormControl<string>;
};

@Component({
  selector: 'app-profile',
  imports: [
    ReactiveFormsModule,
    ScrollingModule,
    MatButtonModule,
    MatCardModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatNativeDateModule,
    MatAutocompleteModule,
    MatSelectModule,
    MatSnackBarModule,
    Loader,
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile implements OnInit {
  private readonly authApi = inject(AuthApiService);
  private readonly expenseApi = inject(ExpenseApiService);
  private readonly authState = inject(AuthStateService);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly saving = signal(false);
  protected readonly loading = signal(false);
  protected readonly maxBirthDate = new Date();
  protected readonly countries = signal<Country[]>([]);
  protected readonly countrySearch = new FormControl('', { nonNullable: true });
  protected readonly countrySearchTerm = signal('');

  protected readonly filteredCountries = computed(() => {
    return filterCurrencyCountries(this.countries(), this.countrySearchTerm());
  });

  protected readonly form = new FormGroup<ProfileForm>({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.email] }),
    phone: new FormControl('', { nonNullable: true }),
    gender: new FormControl<UserGender | ''>('', { nonNullable: true, validators: [Validators.required] }),
    dateOfBirth: new FormControl<Date | null>(null),
    country: new FormControl('', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.countrySearch.valueChanges.subscribe((value) => {
      this.countrySearchTerm.set(value);
      const selectedCountry = this.countries().find((country) => country._id === this.form.controls.country.value);
      if (selectedCountry && value !== this.getCountryLabel(selectedCountry)) {
        this.form.controls.country.setValue('');
      }
    });
    this.loadCountries();

    const user = this.authState.user();
    if (user) {
      this.patchForm();
      return;
    }

    this.loading.set(true);
    this.authApi.me().pipe(
      take(1),
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: (response) => {
        this.authState.setUser(response.data.user);
        this.patchForm();
      },
      error: () => this.snackBar.open('Could not load profile', 'Close', { duration: 2500 }),
    });
  }

  protected saveProfile(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackBar.open('Please fix the highlighted fields', 'Close', { duration: 2500 });
      return;
    }

    const raw = this.form.getRawValue();
    const email = raw.email.trim();
    const phone = raw.phone.trim();
    if (!email && !phone) {
      this.form.controls.email.setErrors({ contactRequired: true });
      this.form.controls.phone.setErrors({ contactRequired: true });
      this.snackBar.open('Add either email or mobile number', 'Close', { duration: 2500 });
      return;
    }

    this.saving.set(true);
    this.authApi.updateProfile({
      name: raw.name,
      email,
      phone,
      gender: raw.gender,
      dateOfBirth: raw.dateOfBirth ? formatDateOnly(raw.dateOfBirth) : undefined,
      country: raw.country,
    }).pipe(
      take(1),
      finalize(() => this.saving.set(false))
    ).subscribe({
      next: (response) => {
        this.authState.setUser(response.data.user);
        this.snackBar.open('Profile updated', 'Close', { duration: 2500 });
      },
      error: (error) => this.snackBar.open(error?.error?.message ?? 'Could not update profile', 'Close', { duration: 3000 }),
    });
  }

  protected resetProfile(): void {
    this.patchForm();
  }

  protected selectCountry(event: MatAutocompleteSelectedEvent): void {
    const country = event.option.value as Country;
    this.form.controls.country.setValue(country._id);
    const countryLabel = this.getCountryLabel(country);
    this.countrySearch.setValue(countryLabel, { emitEvent: false });
    this.countrySearchTerm.set(countryLabel);
  }

  protected getCountryLabel(country: Country): string {
    return `${country.emoji ? `${country.emoji} ` : ''}${country.name}${country.iso2 ? ` (${country.iso2})` : ''}`;
  }

  private loadCountries(): void {
    this.expenseApi.getCountries().pipe(take(1)).subscribe({
      next: (response) => {
        this.countries.set(response.data.countries ?? []);
        this.patchCountrySearch();
      },
    });
  }

  private patchForm(): void {
    const user = this.authState.user();
    if (!user) return;

    const dateOfBirth = user.dateOfBirth ? new Date(user.dateOfBirth) : null;
    this.form.reset({
      name: user.name ?? '',
      email: user.email ?? '',
      phone: user.phone ?? '',
      gender: user.gender ?? '',
      dateOfBirth: dateOfBirth && !Number.isNaN(dateOfBirth.getTime()) ? dateOfBirth : null,
      country: user.country?._id ?? '',
    });
    this.patchCountrySearch();
  }

  private patchCountrySearch(): void {
    const userCountryId = this.authState.user()?.country?._id;
    const selectedCountryId = this.form.controls.country.value || userCountryId;
    const country = this.countries().find((item) => item._id === selectedCountryId);
    if (!country) return;

    const label = this.getCountryLabel(country);
    this.countrySearch.setValue(label, { emitEvent: false });
    this.countrySearchTerm.set(label);
  }
}
