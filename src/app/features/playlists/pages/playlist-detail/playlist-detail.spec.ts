import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlaylistDetail } from './playlist-detail';

describe('PlaylistDetail', () => {
  let component: PlaylistDetail;
  let fixture: ComponentFixture<PlaylistDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlaylistDetail],
    }).compileComponents();

    fixture = TestBed.createComponent(PlaylistDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
