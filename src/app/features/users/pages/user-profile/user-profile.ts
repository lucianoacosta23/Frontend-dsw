import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { OwnProfile } from '../own-profile/own-profile';

@Component({
  selector: 'app-user-profile',
  imports: [OwnProfile],
  templateUrl: './user-profile.html',
})
export class UserProfile {
  private readonly route = inject(ActivatedRoute);
  readonly username = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('username')?.trim() ?? '')),
    { initialValue: '' },
  );
}
