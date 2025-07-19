import { createContext, ReactNode, useContext } from 'react'
import FileBrowserManager from '../state/filebrowser-manager';

const defaultFileBrowserManager = new FileBrowserManager();

const AppContext = createContext<{ fileBrowserManager: FileBrowserManager }>({
  fileBrowserManager: defaultFileBrowserManager,
});

type AppContextProviderProps = {
  fileBrowserManager: FileBrowserManager;
  children: ReactNode;
};

export const AppContextProvider = ({ fileBrowserManager, children }: AppContextProviderProps) => {
  return (
    <AppContext.Provider value={{ fileBrowserManager }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppContextProvider');
  }
  return context;
};
