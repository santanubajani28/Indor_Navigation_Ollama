
import React, { useState, useEffect, useCallback } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import Navigation from './components/Navigation';
import MapPage from './pages/MapPage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import type { CampusData, Page, User, Dataset } from './types';
import { dbService } from './services/db';

function AppErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white p-8">
      <div className="bg-red-900/50 border border-red-500 rounded-xl p-6 max-w-lg w-full">
        <h2 className="text-xl font-bold text-red-300 mb-2">Something went wrong</h2>
        <p className="text-gray-300 text-sm mb-4">A rendering error occurred. Try again or refresh the page.</p>
        <pre className="bg-gray-800 rounded p-3 text-xs text-red-200 overflow-auto max-h-40">
          {error.message}
        </pre>
        <button
          onClick={resetErrorBoundary}
          className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-md text-sm transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>('map');
  const [currentData, setCurrentData] = useState<CampusData>({ sites: [], facilities: [], levels: [], units: [], details: [] });
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [mapOrigin, setMapOrigin] = useState<{ lat: number; lon: number } | null>(null);

  const loadData = useCallback(async () => {
    setLoadingMessage('Fetching campus data...');
    const data = await dbService.getActiveCampusData();
    setCurrentData(data);

    setLoadingMessage('Loading datasets...');
    const datasetList = await dbService.getDatasets();
    setDatasets(datasetList);

    const activeDataset = datasetList.find(d => d.isActive);
    if (activeDataset && activeDataset.originLat != null && activeDataset.originLon != null) {
      setMapOrigin({ lat: activeDataset.originLat, lon: activeDataset.originLon });
    } else if (data.sites.length > 0 && data.sites[0].polygon.length > 0) {
      // Fallback to center of first site if origin not set
      const allPoints = data.sites.flatMap(s => s.polygon);
      const minLon = Math.min(...allPoints.map(p => p.x));
      const maxLon = Math.max(...allPoints.map(p => p.x));
      const minLat = Math.min(...allPoints.map(p => p.y));
      const maxLat = Math.max(...allPoints.map(p => p.y));
      setMapOrigin({ lon: minLon + (maxLon - minLon) / 2, lat: minLat + (maxLat - minLat) / 2 });
    } else {
      setMapOrigin({ lat: 40.7128, lon: -74.0060 });
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setLoadingMessage('Initializing Database...');
      await dbService.init();
      await loadData();
    };
    init();
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

  const handleDataUpload = async (
    name: string,
    uploadResult: { campusData: CampusData; mapOrigin?: { lat: number, lon: number } }
  ) => {
    setLoading(true);
    setLoadingMessage('Importing new dataset...');
    setUploadProgress(0);

    try {
      await dbService.addDataset(
        name,
        uploadResult.campusData,
        true,
        (progress) => {
          setUploadProgress(progress);
          setLoadingMessage(`Importing... ${Math.round(progress)}%`);
        },
        uploadResult.mapOrigin
      );
      await loadData(); // Reload all data, which will update the map origin
      alert('New dataset loaded successfully!');
      setCurrentPage('map'); // Switch to map view after successful upload
    } catch (e) {
      console.error("Failed to upload dataset:", e);
      alert(`Data upload failed. Please check the file format and console for errors. Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
      setUploadProgress(null);
    }
  };

  const handleSwitchDataset = async (id: number) => {
    setLoading(true);
    setLoadingMessage('Switching active dataset...');
    await dbService.setActiveDataset(id);
    await loadData();
    setLoading(false);
  }

  const handleDeleteDataset = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this dataset? This action cannot be undone.')) {
      setLoading(true);
      setLoadingMessage('Deleting dataset...');
      try {
        await dbService.deleteDataset(id);
        await loadData();
        alert('Dataset deleted successfully!');
      } catch (e) {
        console.error("Failed to delete dataset:", e);
        alert(`Dataset deletion failed. Error: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setLoading(false);
      }
    }
  };

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (loading || !mapOrigin) {
    return (
      <div className="absolute inset-0 bg-gray-900/90 flex items-center justify-center z-50">
        <div className="flex flex-col items-center">
          <svg className="animate-spin -ml-1 mr-3 h-12 w-12 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-xl text-white mt-4">{loadingMessage}</span>
          {uploadProgress !== null && (
            <div className="w-64 mt-4 bg-gray-700 rounded-full h-2.5">
              <div
                className="bg-indigo-500 h-2.5 rounded-full transition-all duration-150"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          )}
        </div>
      </div>
    )
  }

  const activeDataset = datasets.find(d => d.isActive);
  const activeDatasetName = activeDataset ? activeDataset.name : 'No active dataset';

  return (
    <ErrorBoundary FallbackComponent={AppErrorFallback}>
      <div className="flex flex-col h-screen w-screen bg-gray-900 text-gray-100 overflow-hidden">
        <Navigation
          user={currentUser}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          onLogout={handleLogout}
        />
        <main className="flex-1 min-h-0 overflow-hidden">
          <ErrorBoundary FallbackComponent={AppErrorFallback}>
            {currentPage === 'map' && <MapPage campusData={currentData} mapOrigin={mapOrigin} activeDatasetName={activeDatasetName} />}
            {currentPage === 'admin' && (
              <AdminPage
                datasets={datasets}
                campusData={currentData}
                onDataUpload={handleDataUpload}
                onSwitchDataset={handleSwitchDataset}
                onDeleteDataset={handleDeleteDataset}
              />
            )}
          </ErrorBoundary>
        </main>
      </div>
    </ErrorBoundary>
  );
};

export default App;
