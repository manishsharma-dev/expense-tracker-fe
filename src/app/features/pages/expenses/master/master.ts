import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';

type ExpenseStatus = 'Completed' | 'Pending';

type Expense = {
  id: string;
  date: string;
  description: string;
  vendor: string;
  category: string;
  paymentMethod: string;
  amount: string;
  status: ExpenseStatus;
  icon: string;
  color: 'purple' | 'teal' | 'orange' | 'amber' | 'pink' | 'green' | 'blue';
};

@Component({
  selector: 'app-expenses-master',
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
  ],
  templateUrl: './master.html',
  styleUrl: './master.scss',
})
export class Master {
  protected readonly displayedColumns = [
    'select',
    'date',
    'description',
    'category',
    'paymentMethod',
    'amount',
    'status',
    'actions',
  ];

  protected readonly expenses: Expense[] = [
    { id: 'netflix-oct-15', date: 'Oct 15', description: 'Netflix', vendor: 'Netflix.com', category: 'Entertainment', paymentMethod: 'Apple Pay', amount: '-$15.99', status: 'Completed', icon: 'redeem', color: 'purple' },
    { id: 'uber-oct-14', date: 'Oct 14', description: 'Uber', vendor: 'Uber Trip', category: 'Transport', paymentMethod: 'Visa **4242', amount: '-$12.40', status: 'Completed', icon: 'directions_car', color: 'teal' },
    { id: 'whole-foods-oct-13', date: 'Oct 13', description: 'Whole Foods', vendor: 'Wholefoods Market', category: 'Food & Dining', paymentMethod: 'Mastercard **8891', amount: '-$87.30', status: 'Completed', icon: 'restaurant', color: 'orange' },
    { id: 'electricity-oct-12', date: 'Oct 12', description: 'Electricity Bill', vendor: 'Power Utility', category: 'Utilities', paymentMethod: 'Bank Transfer', amount: '-$94.00', status: 'Pending', icon: 'bolt', color: 'amber' },
    { id: 'gym-oct-10', date: 'Oct 10', description: 'Gym Membership', vendor: 'FitWell', category: 'Health', paymentMethod: 'Visa **4242', amount: '-$45.00', status: 'Completed', icon: 'favorite', color: 'pink' },
    { id: 'spotify-oct-09', date: 'Oct 9', description: 'Spotify', vendor: 'Premium', category: 'Entertainment', paymentMethod: 'Apple Pay', amount: '-$9.99', status: 'Completed', icon: 'music_note', color: 'green' },
    { id: 'shell-oct-08', date: 'Oct 8', description: 'Shell Gas Station', vendor: 'Fuel', category: 'Transport', paymentMethod: 'Visa **4242', amount: '-$58.20', status: 'Completed', icon: 'local_gas_station', color: 'blue' },
    { id: 'amazon-oct-07', date: 'Oct 7', description: 'Amazon', vendor: 'Online Order', category: 'Shopping', paymentMethod: 'Mastercard **8891', amount: '-$134.99', status: 'Completed', icon: 'shopping_bag', color: 'teal' },
  ];
}
