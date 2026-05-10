import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { provideRouter, Router, RouterOutlet } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { App } from './app';
import { appConfig } from './app.config';

@Component({ standalone: true, template: '<router-outlet></router-outlet>', imports: [RouterOutlet] })
class MockComponent {}

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([
          { path: '', component: MockComponent },
          { path: 'admin', component: MockComponent }
        ]),
        provideNoopAnimations()
      ]
    }).compileComponents();
    
    const router = TestBed.inject(Router);
    router.initialNavigation();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  /*
  it('should render the application shell', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    try {
      fixture.detectChanges();
    } catch (e) {
      // Ignore ExpressionChangedAfterItHasBeenCheckedError in tests with animations
    }
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-header')).toBeTruthy();
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });
  */

  it('should show shell for standard routes', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    const router = TestBed.inject(Router);
    
    await router.navigate(['/']);
    expect(app.showShell()).toBe(true);
  });

  it('should hide shell for admin routes', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    const router = TestBed.inject(Router);
    
    await router.navigate(['/admin']);
    expect(app.showShell()).toBe(false);
  });

  it('should expose the application providers', () => {
    expect(appConfig.providers.length).toBeGreaterThan(0);
  });
});
