import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-loader',
  imports: [MatProgressSpinnerModule],
  templateUrl: `./loader.html`,
  styleUrl: './loader.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Loader { }
