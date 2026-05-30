import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from '../../../core/shared/components/header/header';

@Component({
  selector: 'app-main',
  imports: [Header, RouterOutlet],
  templateUrl: './main.html',
  styleUrl: './main.scss',
})
export class Main {}
