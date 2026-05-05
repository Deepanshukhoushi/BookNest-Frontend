import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

export type ProfileSavePayload = {
  name: string;
  profileImage?: string;
  imageFile?: File;
};

@Component({
  selector: 'app-profile-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile-modal.component.html',
  styleUrl: './profile-modal.component.css'
})
export class ProfileModalComponent implements OnChanges {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  @Input() open = false;
  @Input() currentName = '';
  @Input() currentImage = '';
  @Input() saving = false;

  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<ProfileSavePayload>();

  profileForm: FormGroup;
  imagePreview = signal('');
  previewImageError = signal(false);
  fileSizeError = signal('');
  pendingDiscard = signal(false);
  /** True only when the user has picked a new image file — distinguishes
   *  "user's existing photo failed to load" (silent) from
   *  "user selected a broken file" (show error). */
  userSelectedNewImage = signal(false);
  previewImageSrc = computed(() => this.previewImageError() ? '' : this.imagePreview());
  
  constructor() {
    this.profileForm = this.fb.group({
      name: ['', [
        Validators.required,
        Validators.minLength(2)
      ]]
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.profileForm.patchValue({ name: this.currentName });
      this.previewImageError.set(false);
      this.userSelectedNewImage.set(false);   // reset on every open
      this.imagePreview.set(this.resolveImageUrl(this.currentImage) || '');
      this.profileForm.markAsPristine();
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      this.fileSizeError.set('Image size must be less than 2 MB. Please choose a smaller file.');
      input.value = ''; // reset file input
      return;
    }

    this.fileSizeError.set('');
    this.previewImageError.set(false);
    this.userSelectedNewImage.set(true);    // user explicitly chose a file
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      this.imagePreview.set(result);
      this.profileForm.markAsDirty();
      // Store the file for actual upload
      (this as any).selectedFile = file;
    };
    reader.readAsDataURL(file);
  }

  onClose(): void {
    if (this.profileForm.dirty) {
      this.pendingDiscard.set(true);
      return;
    }
    this.doClose();
  }

  confirmDiscard(): void {
    this.pendingDiscard.set(false);
    this.doClose();
  }

  cancelDiscard(): void {
    this.pendingDiscard.set(false);
  }

  onPreviewError(): void {
    if (this.userSelectedNewImage()) {
      // User picked a file that couldn't be previewed — show the error message
      this.previewImageError.set(true);
    } else {
      // Existing profile photo URL is broken — silently fall back to the person icon
      this.imagePreview.set('');
    }
  }

  private doClose(): void {
    this.profileForm.reset();
    this.imagePreview.set('');
    this.previewImageError.set(false);
    this.fileSizeError.set('');
    (this as any).selectedFile = undefined;
    this.close.emit();
  }

  onSave(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.save.emit({
      name: this.profileForm.value.name,
      // Never pass the base64 preview as profileImage — it's only for local display.
      // The parent receives imageFile for actual upload; profileImage is not needed here.
      imageFile: (this as any).selectedFile
    });
  }

  resolveImageUrl(path: string | undefined): string | null {
    return this.authService.resolveImageUrl(path);
  }
}
