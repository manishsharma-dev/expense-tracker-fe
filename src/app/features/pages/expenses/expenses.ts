import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-expenses',
  imports: [RouterOutlet],
  templateUrl: './expenses.html',
  styleUrl: './expenses.scss',
})
export class Expenses {}
