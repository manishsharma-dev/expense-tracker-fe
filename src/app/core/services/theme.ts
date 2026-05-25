import {
  Inject,
  Injectable,
  PLATFORM_ID,
  signal
} from '@angular/core';

import {
  DOCUMENT,
  isPlatformBrowser
} from '@angular/common';

@Injectable({
  providedIn:'root'
})
export class ThemeService {

  currentTheme =
    signal<'light-theme'|'dark-theme'>(
      'light-theme'
    );

  constructor(
    @Inject(DOCUMENT)
    private document:Document,

    @Inject(PLATFORM_ID)
    private platformId:Object
  ){}

  initTheme(){

    if(!isPlatformBrowser(this.platformId))
      return;

    const savedTheme=
      localStorage.getItem('theme');

    if(savedTheme){

      this.setTheme(
        savedTheme as
        'light-theme'|'dark-theme'
      );

      return;
    }

    const prefersDark=
      window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches;

    this.setTheme(
      prefersDark
      ? 'dark-theme'
      : 'light-theme'
    );
  }

  setTheme(
    theme:'light-theme'|'dark-theme'
  ){

    this.document.body.classList.remove(
      'light-theme',
      'dark-theme'
    );

    this.document.body.classList.add(
      theme
    );

    localStorage.setItem(
      'theme',
      theme
    );

    this.currentTheme.set(theme);

  }

  toggleTheme(){

    const next=

    this.currentTheme()==='light-theme'

    ? 'dark-theme'

    : 'light-theme';

    this.setTheme(next);

  }

}