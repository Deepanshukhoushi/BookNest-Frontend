import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProfileModalComponent } from './profile-modal.component';
import { AuthService } from '../../../core/services/auth.service';
import { ReactiveFormsModule } from '@angular/forms';
import { SimpleChange } from '@angular/core';

describe('ProfileModalComponent', () => {
  let component: ProfileModalComponent;
  let fixture: ComponentFixture<ProfileModalComponent>;
  let authServiceSpy: any;

  beforeEach(async () => {
    authServiceSpy = {
      resolveImageUrl: vi.fn().mockImplementation((path) => path ? `resolved-${path}` : null)
    };

    await TestBed.configureTestingModule({
      imports: [ProfileModalComponent, ReactiveFormsModule],
      providers: [
        { provide: AuthService, useValue: authServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should patch form and resolve image on open', () => {
    component.currentName = 'Initial Name';
    component.currentImage = 'image.png';
    component.open = true;
    
    component.ngOnChanges({
      open: new SimpleChange(false, true, true)
    });

    expect(component.profileForm.value.name).toBe('Initial Name');
    expect(component.imagePreview()).toBe('resolved-image.png');
  });

  it('should handle file selection', async () => {
    const file = new File(['hello'], 'test.png', { type: 'image/png' });
    Object.defineProperty(file, 'size', { value: 1024 });
    
    const event = { target: { files: [file] } } as any;
    component.onFileSelected(event);
    
    // Wait for the async FileReader to complete or mark form as dirty
    await new Promise(resolve => {
      const start = Date.now();
      const check = () => {
        if (component.profileForm.dirty || Date.now() - start > 500) {
          resolve(true);
        } else {
          setTimeout(check, 10);
        }
      };
      check();
    });
    
    expect(component.userSelectedNewImage()).toBe(true);
    expect(component.profileForm.dirty).toBe(true);
    expect((component as any).selectedFile).toBe(file);
  });

  it('should validate file size', () => {
    const file = new File([''], 'large.png');
    Object.defineProperty(file, 'size', { value: 3 * 1024 * 1024 });
    
    const event = { target: { files: [file] } } as any;
    component.onFileSelected(event);
    
    expect(component.fileSizeError()).toContain('2 MB');
  });

  it('should show discard confirm on close if dirty', () => {
    component.profileForm.markAsDirty();
    component.onClose();
    expect(component.pendingDiscard()).toBe(true);
  });

  it('should emit save event on valid submit', () => {
    const saveSpy = vi.spyOn(component.save, 'emit');
    component.profileForm.patchValue({ name: 'New Name' });
    component.onSave();
    expect(saveSpy).toHaveBeenCalledWith({ name: 'New Name', imageFile: undefined });
  });

  it('should handle preview error', () => {
    component.userSelectedNewImage.set(true);
    component.onPreviewError();
    expect(component.previewImageError()).toBe(true);

    component.userSelectedNewImage.set(false);
    component.onPreviewError();
    expect(component.imagePreview()).toBe('');
  });
});
