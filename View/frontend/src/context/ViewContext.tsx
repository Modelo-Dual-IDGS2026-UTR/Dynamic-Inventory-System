import React, { createContext, useContext, useState } from 'react';

interface ViewContextType {
  viewType: 'tabla' | 'tarjetas';
  setViewType: (view: 'tabla' | 'tarjetas') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const ViewContext = createContext<ViewContextType>({
  viewType: 'tabla',
  setViewType: () => {},
  searchQuery: '',
  setSearchQuery: () => {},
});

export const ViewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [viewType, setViewType] = useState<'tabla' | 'tarjetas'>('tabla');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <ViewContext.Provider value={{ viewType, setViewType, searchQuery, setSearchQuery }}>
      {children}
    </ViewContext.Provider>
  );
};

export const useView = () => useContext(ViewContext);
