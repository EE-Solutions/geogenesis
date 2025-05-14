import { NextResponse } from 'next/server';

import { Feature } from '~/core/hooks/use-place-search';

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

    const mapBoxData: Feature[] = data.features.map(
      (feature: { place_name: any; center: any; context: any[]; text: string }) => {
        const zipcode = feature.context.find(cont => cont.id.includes('postcode'));
        const province = feature.context.find(cont => cont.id.includes('region'));
        return {
          place_name: feature?.place_name,
          center: feature?.center,
          text: feature?.text,
          zipcode: zipcode?.text,
          province: province?.text,
        };
      }
    );

    return NextResponse.json({ features: mapBoxData });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch address data' }, { status: 500 });
  }
}
