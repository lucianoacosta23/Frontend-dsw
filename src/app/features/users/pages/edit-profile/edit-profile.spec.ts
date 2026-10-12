import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EditProfile } from './edit-profile';
import { UserService } from '../../../../core/services/user-service';
import type { UserProfile } from '../../../../models/user-profile';
const release = (id: number) => ({
  id,
  name: `Album ${id}`,
  type: 'ALBUM' as const,
  imageUrl: null,
  artists: [],
});
const profile: UserProfile = {
  id: 3,
  username: 'listener',
  fullName: 'Listener',
  createdAt: '',
  avatarUrl: null,
  coverUrl: null,
  favoriteReleases: [release(2), release(1)],
  favoriteTracks: [],
  followersCount: 0,
  followingCount: 0,
  isFollowing: false,
  followsMe: false,
  isOwnProfile: true,
};
describe('Profile editor integration', () => {
  let component: EditProfile;
  let users: {
    getOwnProfile: ReturnType<typeof vi.fn>;
    updateOwnProfile: ReturnType<typeof vi.fn>;
    uploadProfileImage: ReturnType<typeof vi.fn>;
  };
  beforeEach(() => {
    users = {
      getOwnProfile: vi.fn(() => of({ data: profile })),
      updateOwnProfile: vi.fn(() => of({ data: profile })),
      uploadProfileImage: vi.fn(() => of({ data: { imageId: 81 } })),
    };
    TestBed.configureTestingModule({
      imports: [EditProfile],
      providers: [provideRouter([]), { provide: UserService, useValue: users }],
    });
    TestBed.overrideComponent(EditProfile, { set: { template: '', imports: [] } });
    const fixture = TestBed.createComponent(EditProfile);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  it('omits unchanged fields and preserves ordered IDs, null and empty arrays', () => {
    expect(component.buildPatch()).toEqual({});
    component.moveFavorite('release', 1, -1);
    component.removeImage('cover');
    expect(component.buildPatch()).toEqual({ favoriteReleaseIds: [1, 2], coverImageId: null });
    component.releases.set([]);
    expect(component.buildPatch().favoriteReleaseIds).toEqual([]);
  });
  it('retains uploaded ID and draft after expired session without uploading twice', () => {
    component.images.update((images) => ({
      ...images,
      avatar: {
        ...images.avatar,
        file: new File(['x'], 'a.png', { type: 'image/png' }),
        changed: true,
      },
    }));
    users.updateOwnProfile.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 401 })),
    );
    component.save();
    expect(component.sessionExpired()).toBe(true);
    expect(component.images().avatar.imageId).toBe(81);
    expect(component.profile()).toBe(profile);
    component.save();
    expect(users.uploadProfileImage).toHaveBeenCalledTimes(1);
    expect(users.updateOwnProfile).toHaveBeenLastCalledWith({ avatarImageId: 81 });
  });
  it('prevents duplicate saves; cancel does not PATCH', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    component.cancel();
    expect(navigate).toHaveBeenCalledWith('/profile');
    expect(users.updateOwnProfile).not.toHaveBeenCalled();
    users.updateOwnProfile.mockReturnValue(new Subject());
    component.removeImage('avatar');
    component.save();
    component.save();
    expect(users.updateOwnProfile).toHaveBeenCalledTimes(1);
  });
  it('rejects duplicates, singles and a sixth project', () => {
    component.addFavorite(release(2));
    component.addFavorite({ ...release(4), type: 'SINGLE' });
    expect(component.releases()).toHaveLength(2);
    [3, 4, 5, 6].forEach((id) => component.addFavorite(release(id)));
    expect(component.releaseIds()).toEqual([2, 1, 3, 4, 5]);
  });
  it('rejects invalid image format and size before upload', async () => {
    await component.selectFile(new File(['x'], 'a.gif', { type: 'image/gif' }), 'avatar');
    expect(component.images().avatar.error).toContain('JPEG');
    await component.selectFile(
      new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'a.png', { type: 'image/png' }),
      'avatar',
    );
    expect(component.images().avatar.error).toContain('5 MiB');
    expect(users.uploadProfileImage).not.toHaveBeenCalled();
  });
});
