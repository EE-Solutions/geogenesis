import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  try {
    const mapboxRes = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        query
      )}.json?access_token=${process.env.MAPBOX_TOKEN}&types=address,place`
    );

    const data = await mapboxRes.json();
    return NextResponse.json({ features: data.features });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch address data' }, { status: 500 });
  }
}
