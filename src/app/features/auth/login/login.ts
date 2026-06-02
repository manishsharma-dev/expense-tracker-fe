import { Component, signal,  ChangeDetectionStrategy } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import {LoginMethod} from 'app/core/shared/constants';
import {EmailLoginComponent} from 'app/features/auth/login/email-login/email-login';
import {MobileLoginComponent} from 'app/features/auth/login/mobile-login/mobile-login';

@Component({
  selector: 'app-login',
  imports: [MatCardModule, MobileLoginComponent, EmailLoginComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {  
  protected readonly LoginMethod = LoginMethod;

  protected currentLoginMethod = signal<LoginMethod>(LoginMethod.EMAIL) ;

  protected setLogin(loginMethod: LoginMethod){
    alert(loginMethod);
    this.currentLoginMethod.set(loginMethod);
  }
}
