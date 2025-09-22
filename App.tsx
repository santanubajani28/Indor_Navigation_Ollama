import React, { useState } from 'react';
import Navigation from './components/Navigation';
import MapPage from './pages/MapPage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import { campusData as defaultCampusData } from './data/campusData';
import type { CampusData, Page, User, Role } from './types';

// Hardcoded user credentials
const USERS: Record<string, { password: string; role: Role }> = {
  'santanu': { password: '111', role: 'admin' },
  'san': { password: '111', role: 'viewer' },
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>('map');
  const [currentData, setCurrentData] = useState<CampusData>(defaultCampusData);

  const handleLogin = (username: string, password: string): boolean => {
    const user = USERS[username];
    if (user && user.password === password) {
      setCurrentUser({ name: username, role: user.role });
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentPage('map'); // Reset to default page on logout
  };

  const handleDataUpload = (newData: CampusData) => {
    setCurrentData(newData);
    alert('Custom data loaded successfully!');
    setCurrentPage('map'); // Switch to map view after successful upload
  };
  
  const handleResetData = () => {
    setCurrentData(defaultCampusData);
    alert('Data has been reset to the default campus layout.');
  };

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // All authenticated users now use the same layout structure.
  // The Navigation component will handle role-based visibility of its elements.
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
        {currentPage === 'admin' && <AdminPage onDataUpload={handleDataUpload} onResetData={handleResetData} />}
      </main>
    </div>
  );
};

export default App;