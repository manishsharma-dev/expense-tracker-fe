import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-create',
  imports: [
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatNativeDateModule,
    MatRadioModule,
    MatSelectModule,
  ],
  templateUrl: './create.html',
  styleUrl: './create.scss',
})
export class Create {
  protected readonly categories = [
    { label: 'Food', icon: 'restaurant', value: 'food', color: 'orange' },
    { label: 'Transport', icon: 'directions_car', value: 'transport', color: 'teal' },
    { label: 'Housing', icon: 'home', value: 'housing', color: 'amber' },
    { label: 'Fun', icon: 'movie', value: 'fun', color: 'purple' },
    { label: 'Health', icon: 'favorite', value: 'health', color: 'pink' },
    { label: 'Shopping', icon: 'shopping_bag', value: 'shopping', color: 'green' },
    { label: 'Utilities', icon: 'bolt', value: 'utilities', color: 'yellow' },
    { label: 'Travel', icon: 'flight', value: 'travel', color: 'blue' },
    { label: 'Other', icon: 'add', value: 'other', color: 'neutral' },
  ];

  protected readonly paymentMethods = [
    { label: 'Visa **4242', value: 'visa', icon: 'credit_card' },
    { label: 'Mastercard **8891', value: 'mastercard', icon: 'credit_card' },
    { label: 'Apple Pay', value: 'apple-pay', icon: 'account_balance_wallet' },
    { label: 'Bank Transfer', value: 'bank', icon: 'account_balance' },
  ];
}
