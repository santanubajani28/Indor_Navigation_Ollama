import React, { useState, useEffect, useCallback } from 'react';
import Navigation from './components/Navigation';
import MapPage from './pages/MapPage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import type { CampusData, Page, User, Dataset } from './types';
import { dbService } from './services/db';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>('map');
  const [currentData, setCurrentData] = useState<CampusData>({ facilities: [], levels: [], units: [], details: [] });
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMessage, setLoadingMessage] = useState('Initializing Database...');

  const loadData = useCallback(async () => {
      setLoadingMessage('Fetching campus data...');
      const data = await dbService.getActiveCampusData();
      setCurrentData(data);
      const datasetList = await dbService.getDatasets();
      setDatasets(datasetList);
      setLoading(false);
  }, []);

  useEffect(() => {
    const initDb = async () => {
      setLoading(true);
      await dbService.init();
      await loadData();
    };
    initDb();
  }, [loadData]);


  const handleLogin = async (username: string, password: string): Promise<boolean> => {
    const user = await dbService.getUser(username, password);
    if (user) {
      setCurrentUser(user);
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentPage('map'); // Reset to default page on logout
  };

  const handleDataUpload = async (name: string, newData: CampusData) => {
    setLoading(true);
    setLoadingMessage('Importing new dataset...');
    await dbService.addDataset(name, newData, true); // Make new upload active
    await loadData(); // Reload all data
    setLoading(false);
    alert('New dataset loaded successfully!');
    setCurrentPage('map'); // Switch to map view after successful upload
  };
  
  const handleResetData = async () => {
    setLoading(true);
    setLoadingMessage('Adding new default dataset...');
    await dbService.resetDatabase();
    await loadData();
    setLoading(false);
    alert('A new dataset with the default campus layout has been added.');
  };
  
  const handleSwitchDataset = async (id: number) => {
    setLoading(true);
    setLoadingMessage('Switching active dataset...');
    await dbService.setActiveDataset(id);
    await loadData();
    setLoading(false);
  }

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }
  
  if (loading) {
    return (
       <div className="absolute inset-0 bg-gray-900/90 flex items-center justify-center z-50">
          <div className="flex flex-col items-center">
              <svg className="animate-spin -ml-1 mr-3 h-12 w-12 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-xl text-white mt-4">{loadingMessage}</span>
          </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-gray-900 text-gray-100 overflow-hidden">
      <Navigation 
        user={currentUser}
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage} 
        onLogout={handleLogout}
      />
      <main className="flex-1 overflow-hidden">
        {currentPage === 'map' && <MapPage campusData={currentData} />}
        {currentPage === 'admin' && (
            <AdminPage 
                datasets={datasets}
                onDataUpload={handleDataUpload} 
                onResetData={handleResetData}
                onSwitchDataset={handleSwitchDataset} 
            />
        )}
      </main>
    </div>
  );
};

export default App;