import type { Place } from '../types/PlaceModel';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export async function getPlaces(): Promise<Place[]> {
  const response = await fetch(`${API_URL}/places/all-places`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: unknown } | null;
    const message = typeof body?.message === 'string'
      ? body.message
      : `No se pudieron cargar los lugares (${response.status})`;
    throw new Error(message);
  }

  const places = await response.json();
  return Array.isArray(places) ? places as Place[] : [];
}
