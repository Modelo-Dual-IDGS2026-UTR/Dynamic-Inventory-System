import React, { createContext, useContext, useState } from 'react';

interface ViewContextType {
  viewType: 'tabla' | 'tarjetas';
  setViewType: (view: 'tabla' | 'tarjetas') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  categoryFilter: string;
  setCategoryFilter: (category: string) => void;
  placeFilter: string;
  setPlaceFilter: (place: string) => void;
  categoryOptions: string[];
  setCategoryOptions: (categories: string[]) => void;
  placeOptions: string[];
  setPlaceOptions: (places: string[]) => void;
}

const ViewContext = createContext<ViewContextType>({
  viewType: 'tabla',
  setViewType: () => {},
  searchQuery: '',
  setSearchQuery: () => {},
  categoryFilter: '',
  setCategoryFilter: () => {},
  placeFilter: '',
  setPlaceFilter: () => {},
  categoryOptions: [],
  setCategoryOptions: () => {},
  placeOptions: [],
  setPlaceOptions: () => {},
});

export const ViewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [viewType, setViewType] = useState<'tabla' | 'tarjetas'>('tabla');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [placeFilter, setPlaceFilter] = useState('');
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [placeOptions, setPlaceOptions] = useState<string[]>([]);

  return (
    <ViewContext.Provider value={{
      viewType,
      setViewType,
      searchQuery,
      setSearchQuery,
      categoryFilter,
      setCategoryFilter,
      placeFilter,
      setPlaceFilter,
      categoryOptions,
      setCategoryOptions,
      placeOptions,
      setPlaceOptions,
    }}>
      {children}
    </ViewContext.Provider>
  );
};

export const useView = () => useContext(ViewContext);
