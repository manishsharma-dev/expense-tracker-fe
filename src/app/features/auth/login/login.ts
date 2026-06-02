import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import {LoginMethod} from 'app/core/shared/constants';
import {EmailLoginComponent} from 'app/features/auth/login/email-login/email-login';
import {MobileLoginComponent} from 'app/features/auth/login/mobile-login/mobile-login';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MobileLoginComponent,
    EmailLoginComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {  
  protected readonly LoginMethod = LoginMethod;

  protected currentLoginMethod = signal<LoginMethod>(LoginMethod.EMAIL) ;

  protected setLogin(loginMethod: LoginMethod){
    this.currentLoginMethod.set(loginMethod);
  }
}
