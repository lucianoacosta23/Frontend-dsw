import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RatingStats } from './rating-stats';

describe('RatingStats', () => {
  let component: RatingStats;
  let fixture: ComponentFixture<RatingStats>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RatingStats],
    }).compileComponents();

    fixture = TestBed.createComponent(RatingStats);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
