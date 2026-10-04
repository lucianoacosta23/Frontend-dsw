import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TrackDetail } from './track-detail';

describe('TrackDetail', () => {
  let component: TrackDetail;
  let fixture: ComponentFixture<TrackDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrackDetail],
    }).compileComponents();

    fixture = TestBed.createComponent(TrackDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
