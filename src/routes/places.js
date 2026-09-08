// Nearby Search classico da Google Places API (sem dependencia nova, so fetch).
// A chave (GOOGLE_PLACES_API_KEY) fica so no backend -- o front-end nunca a ve.
export function registerPlacesRoutes({ json, requireUser }) {
  return async function handle(request, response) {
    if (request.url?.startsWith('/api/places/nearby') && request.method === 'GET') {
      const user = await requireUser(request, response); if (!user) return true;
      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey) { json(response, 200, { configured: false, results: [] }); return true; }
      const url = new URL(request.url, 'http://localhost');
      const lat = Number(url.searchParams.get('lat'));
      const lng = Number(url.searchParams.get('lng'));
      const keyword = String(url.searchParams.get('activity') || 'academia').slice(0, 60);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) { json(response, 400, { error: 'invalid_coordinates' }); return true; }
      try {
        const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=6000&keyword=${encodeURIComponent(keyword)}&key=${apiKey}`;
        const placesResponse = await fetch(placesUrl);
        const placesData = await placesResponse.json();
        if (placesData.status && !['OK', 'ZERO_RESULTS'].includes(placesData.status)) {
          json(response, 200, { configured: true, results: [], error: placesData.status });
          return true;
        }
        const results = (placesData.results || [])
          .map(place => ({
            id: place.place_id,
            name: place.name,
            address: place.vicinity || null,
            rating: place.rating ?? null,
            ratingsCount: place.user_ratings_total ?? null,
            openNow: place.opening_hours?.open_now ?? null,
            lat: place.geometry?.location?.lat ?? null,
            lng: place.geometry?.location?.lng ?? null,
          }))
          // So sugerimos lugares com boa reputacao (a pessoa pediu 4-5 estrelas);
          // sem avaliacoes suficientes, nao da pra saber a qualidade -- deixamos de fora.
          .filter(place => place.rating !== null && place.rating >= 4 && (place.ratingsCount || 0) >= 5)
          .sort((a, b) => b.rating - a.rating)
          .slice(0, 12);
        json(response, 200, { configured: true, results });
      } catch {
        json(response, 200, { configured: true, results: [], error: 'places_lookup_failed' });
      }
      return true;
    }
    return false;
  };
}
