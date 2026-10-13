import { DatePipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import type { AccountRestriction } from '../../../models/account-restriction';

@Component({
  selector: 'app-account-restriction-notice',
  imports: [DatePipe],
  templateUrl: './account-restriction-notice.html',
  styleUrl: './account-restriction-notice.scss',
})
export class AccountRestrictionNotice {
  @Input({ required: true }) restriction!: AccountRestriction;
  readonly timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
}
