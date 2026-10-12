import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service.js';

@Component({
  selector: 'app-spotify-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './spotify-register.html',
  styleUrl: './spotify-register.scss',
})
export class SpotifyRegister implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly ready = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    fullName: ['', [
      Validators.required,
      Validators.maxLength(255),
      Validators.pattern(/\S/),
    ]],
    username: ['', [
      Validators.required,
      Validators.pattern(/^[a-zA-Z0-9_]{3,30}$/),
    ]],
  });

  ngOnInit(): void {
    this.auth.getSpotifyRegistration()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: response => {
          this.form.controls.fullName.setValue(
            response.data.displayName ?? '',
          );
          this.ready.set(true);
        },
        error: () => {
          this.errorMessage.set(
            'El registro venció o no está disponible. Volvé a entrar con Spotify.',
          );
        },
      });
  }

  submit(): void {
    if (!this.ready() || this.saving()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const values = this.form.getRawValue();

    this.saving.set(true);
    this.errorMessage.set(null);

    this.auth.completeSpotifyRegistration({
      fullName: values.fullName.trim(),
      username: values.username.trim().toLowerCase(),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: response => {
          void this.router.navigateByUrl(response.returnUrl);
        },
        error: (error: unknown) => {
          let message = 'No pudimos crear la cuenta. Intentá nuevamente.';

          if (error instanceof HttpErrorResponse) {
            const body: unknown = error.error;

            if (
              typeof body === 'object' &&
              body !== null &&
              'message' in body &&
              typeof body.message === 'string'
            ) {
              message = body.message;
            }

            if (error.status === 401) {
              this.ready.set(false);
            }
          }

          this.errorMessage.set(message);
        },
      });
  } }