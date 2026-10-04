import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReleaseDetail } from './release-detail';

describe('ReleaseDetail', () => {
  let component: ReleaseDetail;
  let fixture: ComponentFixture<ReleaseDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReleaseDetail],
    }).compileComponents();

    fixture = TestBed.createComponent(ReleaseDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
