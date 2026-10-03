import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReviewForm } from './review-form';

describe('ReviewForm', () => {
  let component: ReviewForm;
  let fixture: ComponentFixture<ReviewForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReviewForm],
    }).compileComponents();

    fixture = TestBed.createComponent(ReviewForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
