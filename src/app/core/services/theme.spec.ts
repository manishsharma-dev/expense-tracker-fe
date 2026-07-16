import { DOCUMENT } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ThemeService } from './theme';

describe('ThemeService', () => {
  let service: ThemeService;
  let storage: Map<string, string>;

  const setup = (platformId: 'browser' | 'server' = 'browser') => {
    TestBed.configureTestingModule({
      providers: [
        ThemeService,
        { provide: DOCUMENT, useValue: document },
        { provide: PLATFORM_ID, useValue: platformId },
      ],
    });
    service = TestBed.inject(ThemeService);
  };

  beforeEach(() => {
    document.body.className = '';
    storage = new Map<string, string>();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: vi.fn((key: string) => storage.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
      },
    });
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
  });

  it('applies saved theme on init', () => {
    storage.set('theme', 'dark-theme');
    setup();

    service.initTheme();

    expect(document.body.classList.contains('dark-theme')).toBe(true);
    expect(service.currentTheme()).toBe('dark-theme');
  });

  it('uses system preference when no saved theme exists', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    setup();

    service.initTheme();

    expect(window.matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
    expect(service.currentTheme()).toBe('dark-theme');
  });

  it('sets theme class, persists theme, and removes previous theme class', () => {
    setup();

    service.setTheme('light-theme');
    service.setTheme('dark-theme');

    expect(document.body.classList.contains('light-theme')).toBe(false);
    expect(document.body.classList.contains('dark-theme')).toBe(true);
    expect(storage.get('theme')).toBe('dark-theme');
    expect(service.currentTheme()).toBe('dark-theme');
  });

  it('toggles between light and dark theme', () => {
    setup();
    service.setTheme('light-theme');

    service.toggleTheme();
    expect(service.currentTheme()).toBe('dark-theme');

    service.toggleTheme();
    expect(service.currentTheme()).toBe('light-theme');
  });

  it('does not initialize theme on the server', () => {
    storage.set('theme', 'dark-theme');
    setup('server');

    service.initTheme();

    expect(document.body.className).toBe('');
    expect(service.currentTheme()).toBe('light-theme');
  });
});
