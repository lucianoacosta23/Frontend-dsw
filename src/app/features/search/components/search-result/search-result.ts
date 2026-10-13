import { NgTemplateOutlet } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { SearchEntry } from '../../../../models/search-view';
import { ReleaseCover } from '../../../catalog/components/release-cover/release-cover';

@Component({
  selector: 'app-search-result',
  imports: [RouterLink, NgTemplateOutlet, ReleaseCover],
  templateUrl: './search-result.html',
  styleUrl: './search-result.scss',
})
export class SearchResult {
  @Input({ required: true }) item!: SearchEntry;
  @Input() row = false;
  @Input() opening = false;
  @Input() busy = false;
  @Output() open = new EventEmitter<SearchEntry>();
}
