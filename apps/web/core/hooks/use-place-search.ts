import { useEffect, useState } from 'react';

import { useDebouncedValue } from './use-debounced-value';

export type Feature = {
  place_name: string;
  center: [number, number];
  text: string;
};

export const usePlaceSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setPlacesResults] = useState<Feature[]>([]);
  const [isEmpty, setIsEmpty] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async () => {
    if (query === '') {
      setPlacesResults([]);
      setIsLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/search-place?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      setPlacesResults(data.features || []);
      if (!data.features.length) {
        setIsEmpty(true);
      }
    } catch (error: any) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const onQueryChange = (value: string) => {
    setIsLoading(true);
    setQuery(value);
  };

  const debouncedQuery = useDebouncedValue(query, 1000);

  useEffect(() => {
    handleSearch();
  }, [debouncedQuery]);

  return {
    results,
    onQueryChange,
    isLoading,
    query,
    isEmpty,
  };
};
