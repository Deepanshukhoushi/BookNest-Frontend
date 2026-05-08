import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OAuthRedirectComponent } from './oauth-redirect.component';
import { AuthService } from '../../core/services/auth.service';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';

describe('OAuthRedirectComponent', () => {
  let component: OAuthRedirectComponent;
  let fixture: ComponentFixture<OAuthRedirectComponent>;
  let authServiceSpy: any;
  let routerSpy: any;
  let routeSpy: any;

  beforeEach(async () => {
    authServiceSpy = {
      handleOAuthSuccess: vi.fn().mockReturnValue(of({}))
    };
    routerSpy = {
      navigate: vi.fn(),
      navigateByUrl: vi.fn()
    };
    routeSpy = {
      queryParamMap: of(convertToParamMap({})),
      fragment: of(null)
    };

    await TestBed.configureTestingModule({
      imports: [OAuthRedirectComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: routeSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(OAuthRedirectComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should navigate to auth on error in query params', () => {
    routeSpy.queryParamMap = of(convertToParamMap({ error: 'access_denied' }));
    fixture.detectChanges();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth'], expect.any(Object));
  });

  it('should handle token from query params', () => {
    routeSpy.queryParamMap = of(convertToParamMap({ token: 'mock-token' }));
    fixture.detectChanges();
    expect(authServiceSpy.handleOAuthSuccess).toHaveBeenCalledWith('mock-token');
    expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('/', expect.any(Object));
  });

  it('should handle token from fragment', () => {
    routeSpy.fragment = of('token=fragment-token');
    fixture.detectChanges();
    expect(authServiceSpy.handleOAuthSuccess).toHaveBeenCalledWith('fragment-token');
  });

  it('should navigate to auth if no token found', () => {
    fixture.detectChanges();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth'], expect.any(Object));
  });

  it('should handle OAuth success and redirect to returnUrl', () => {
    routeSpy.queryParamMap = of(convertToParamMap({ token: 't1', returnUrl: '/dashboard' }));
    fixture.detectChanges();
    expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('/dashboard', expect.any(Object));
  });

  it('should handle OAuth error', () => {
    routeSpy.queryParamMap = of(convertToParamMap({ token: 't1' }));
    authServiceSpy.handleOAuthSuccess.mockReturnValue(throwError(() => new Error('Failed')));
    const removeSpy = vi.spyOn(Storage.prototype, 'removeItem');
    
    fixture.detectChanges();
    
    expect(removeSpy).toHaveBeenCalledWith('token');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth'], expect.any(Object));
    removeSpy.mockRestore();
  });
});
