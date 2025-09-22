import React from 'react';
import type { Page, User } from '../types';

interface NavigationProps {
  user: User;
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  onLogout: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ user, currentPage, setCurrentPage, onLogout }) => {
  const linkClasses = "px-4 py-2 rounded-md text-sm font-medium transition-colors";
  const activeLinkClasses = "bg-indigo-600 text-white";
  const inactiveLinkClasses = "text-gray-300 hover:bg-gray-700 hover:text-white";

  return (
    <header className="bg-gray-800 shadow-md z-10">
      <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-white">Indoor Navigator</h1>
          <span className="text-sm text-gray-400">| Welcome, <span className="font-semibold capitalize text-gray-200">{user.name}</span></span>
        </div>
        <div className="flex items-center space-x-4">
          {user.role === 'admin' && (
            <>
              <button
                onClick={() => setCurrentPage('map')}
                className={`${linkClasses} ${currentPage === 'map' ? activeLinkClasses : inactiveLinkClasses}`}
              >
                Map Viewer
              </button>
              <button
                onClick={() => setCurrentPage('admin')}
                className={`${linkClasses} ${currentPage === 'admin' ? activeLinkClasses : inactiveLinkClasses}`}
              >
                Admin & Upload
              </button>
            </>
          )}
          <button
            onClick={onLogout}
            className="px-4 py-2 rounded-md text-sm font-medium transition-colors bg-red-600/80 text-white hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </nav>
    </header>
  );
};

export default Navigation;