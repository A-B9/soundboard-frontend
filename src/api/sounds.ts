import { apiFetch, apiFetchBlob } from './client';
import type {
  GetSoundResponse,
  PagedResponse,
  SortBy,
  SoundCategory,
} from './types';

// A type alias (not an interface) so it stays assignable to the generic
// params record in client.ts.
export type ListSoundsParams = {
  page?: number;
  size?: number;
  sortBy?: SortBy;
  ascending?: boolean;
  category?: SoundCategory | '';
  tag?: string;
};

export function listSounds(
  params: ListSoundsParams = {},
): Promise<PagedResponse<GetSoundResponse>> {
  return apiFetch<PagedResponse<GetSoundResponse>>('/sounds', { params });
}

// Note: the search endpoint returns a plain array, not the paged wrapper,
// and ignores category/tag/sort (see IMPLEMENTATION_GUIDE.md §4).
export function searchSounds(keyword: string): Promise<GetSoundResponse[]> {
  return apiFetch<GetSoundResponse[]>('/sounds/search', {
    params: { keyword },
  });
}

export function getAudioBlob(id: string): Promise<Blob> {
  return apiFetchBlob(`/sounds/${id}/download`);
}
