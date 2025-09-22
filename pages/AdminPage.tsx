import React, { useState, useCallback } from 'react';
import type { CampusData } from '../types';
import { parseShapefile, parseGeoPackage } from '../utils/gisParser';

interface AdminPageProps {
  onDataUpload: (data: CampusData) => void;
  onResetData: () => void;
}

type UploadFormat = 'json' | 'shapefile' | 'geopackage';

const AdminPage: React.FC<AdminPageProps> = ({ onDataUpload, onResetData }) => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<UploadFormat>('json');

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setLoading(true);

    try {
        let data: CampusData;
        if (file.name.endsWith('.json')) {
            const text = await file.text();
            const jsonData = JSON.parse(text);
            // Basic validation
            if (!jsonData.facilities || !jsonData.levels || !jsonData.units) {
                throw new Error("Invalid JSON. Must contain 'facilities', 'levels', and 'units' arrays.");
            }
            data = jsonData as CampusData;
        } else if (file.name.endsWith('.zip')) {
            const buffer = await file.arrayBuffer();
            data = await parseShapefile(buffer);
        } else if (file.name.endsWith('.gpkg')) {
            const buffer = await file.arrayBuffer();
            data = await parseGeoPackage(buffer);
        } else {
            throw new Error('Unsupported file type. Please upload .json, .zip (for Shapefile), or .gpkg.');
        }
        onDataUpload(data);
    } catch (err: any) {
        console.error("Failed to parse or validate file:", err);
        setError(`Error: ${err.message}. Please check the file format and content.`);
    } finally {
        setLoading(false);
        // Reset file input to allow re-uploading the same file
        event.target.value = '';
    }
  }, [onDataUpload]);
  
const formatInstructions = {
    json: `
{
  "facilities": [{ "id": "F1", "name": "...", "polygon": [...] }],
  "levels": [{ "id": "L1", "name": "...", "facilityId": "F1", ... }],
  "units": [{ "id": "U101", "name": "...", "type": "CLASSROOM", ... }]
}
// See types.ts for all available UnitType values.`.trim(),
    shapefile: `
- Upload a .zip file containing a single Shapefile (e.g., units.shp, .shx, .dbf).
- This file should represent the 'units' layer.
- Facility and Level polygons will be auto-generated as bounding boxes.
- Required attributes in the .dbf file:
  - id (string | number): Unique unit ID.
  - name (string): Display name.
  - type (string): e.g., 'CLASSROOM', 'CORRIDOR'.
  - levelId (string | number): ID of the parent level.
  - facilityId (string | number): ID of the parent facility.
  - v_conn_id (optional): For linking stairs/elevators.
`.trim(),
    geopackage: `
- Upload a single .gpkg file.
- The file must contain three feature tables named exactly:
  1. 'facilities'
  2. 'levels'
  3. 'units'
- Required columns for 'facilities':
  - id, name
- Required columns for 'levels':
  - id, name, facilityId, zIndex
- Required columns for 'units':
  - id, name, type, levelId, v_conn_id (optional)
`.trim(),
};

const Tab: React.FC<{title: string; format: UploadFormat; active: boolean; onClick: () => void;}> = ({title, active, onClick}) => (
    <button onClick={onClick} className={`px-4 py-2 text-sm font-medium rounded-t-lg focus:outline-none transition-colors ${active ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700/50'}`}>
        {title}
    </button>
);

  return (
    <div className="h-full w-full flex items-center justify-center p-8 bg-gray-900 relative">
      <div className="max-w-4xl w-full bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-gray-700 z-10">
        <h2 className="text-3xl font-bold text-white mb-2">Upload Campus Data</h2>
        <p className="text-gray-400 mb-6">Upload a file with your own campus layout. Select a format below for specific instructions.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
             <h3 className="text-xl font-semibold text-gray-200 mb-3">1. Select & Upload File</h3>
             <div className="space-y-4">
                <div>
                  <label htmlFor="file-upload" className="block text-sm font-medium text-gray-300 mb-2">Campus Data File</label>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".json,application/json,.zip,application/zip,.gpkg"
                    onChange={handleFileChange}
                    disabled={loading}
                    className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer disabled:opacity-50"
                  />
                </div>

                <button
                    onClick={onResetData}
                    disabled={loading}
                    className="w-full bg-gray-600 text-white font-bold py-2 px-4 rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                    Reset to Default Data
                </button>
             </div>
              {error && (
                <div className="mt-4 p-3 bg-red-900/50 border border-red-700 text-red-300 rounded-md text-sm">
                    {error}
                </div>
              )}
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-200 mb-3">2. Format Requirements</h3>
            <div className="border-b border-gray-600 flex space-x-1">
                <Tab title="JSON" format="json" active={activeTab === 'json'} onClick={() => setActiveTab('json')} />
                <Tab title="Shapefile (.zip)" format="shapefile" active={activeTab === 'shapefile'} onClick={() => setActiveTab('shapefile')} />
                <Tab title="GeoPackage (.gpkg)" format="geopackage" active={activeTab === 'geopackage'} onClick={() => setActiveTab('geopackage')} />
            </div>
            <pre className="bg-gray-900 p-4 rounded-b-md text-gray-300 text-xs overflow-auto h-52 whitespace-pre-wrap">
              <code>
                {formatInstructions[activeTab]}
              </code>
            </pre>
          </div>
        </div>
      </div>
       {loading && (
        <div className="absolute inset-0 bg-gray-900/70 flex items-center justify-center z-20">
            <div className="flex flex-col items-center">
                <svg className="animate-spin -ml-1 mr-3 h-10 w-10 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-lg text-white mt-4">Processing file...</span>
            </div>
        </div>
       )}
    </div>
  );
};

export default AdminPage;