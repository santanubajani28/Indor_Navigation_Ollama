import React, { useState, useCallback } from 'react';
import type { CampusData, Dataset } from '../types';
import { parseShapefile, parseGeoPackage, exportToGeoJson } from '../utils/gisParser';

interface AdminPageProps {
  datasets: Dataset[];
  campusData: CampusData;
  onDataUpload: (name: string, uploadResult: { campusData: CampusData; mapOrigin?: { lat: number; lon: number } }) => Promise<void>;
  onSwitchDataset: (id: number) => void;
  onDeleteDataset: (id: number) => Promise<void>;
}

const AdminPage: React.FC<AdminPageProps> = ({ datasets, campusData, onDataUpload, onSwitchDataset, onDeleteDataset }) => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [datasetName, setDatasetName] = useState<string>('');
  
  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!datasetName.trim()) {
        setError("Please enter a name for the new dataset before uploading.");
        return;
    }

    setError(null);
    setLoading(true);

    try {
        let data: CampusData;
        let mapOrigin: { lat: number; lon: number } | undefined;

        if (file.name.endsWith('.json')) {
            const text = await file.text();
            data = JSON.parse(text) as CampusData;
        } else if (file.name.endsWith('.zip')) {
            const buffer = await file.arrayBuffer();
            const result = await parseShapefile(buffer);
            data = result.campusData;
            mapOrigin = result.mapOrigin;
        } else if (file.name.endsWith('.gpkg')) {
            const buffer = await file.arrayBuffer();
            data = await parseGeoPackage(buffer);
             // Note: GeoPackage origin detection is not implemented in this version.
        } else {
            throw new Error('Unsupported file type. Please upload .json, .zip (for Shapefile), or .gpkg.');
        }
        await onDataUpload(datasetName, { campusData: data, mapOrigin });
        setDatasetName(''); // Clear name after successful upload
    } catch (err: any) {
        console.error("Failed to parse or validate file:", err);
        setError(`Error: ${err.message}. Please check the file format and content.`);
    } finally {
        setLoading(false);
        event.target.value = '';
    }
  }, [onDataUpload, datasetName]);

  const handleExportGeoJson = () => {
    if (!campusData || campusData.units.length === 0) {
        setError("There is no active data to export.");
        return;
    }
    const activeDataset = datasets.find(d => d.isActive);
    const fileName = activeDataset ? `${activeDataset.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.geojson` : 'campus_data.geojson';

    const geoJsonObject = exportToGeoJson(campusData);
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(geoJsonObject, null, 2));

    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", fileName);
    document.body.appendChild(downloadAnchorNode); // Required for Firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };
  
  return (
    <div className="h-full w-full flex items-start justify-center p-8 bg-gray-900 relative overflow-y-auto">
      <div className="max-w-6xl w-full bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-gray-700 z-10">
        <h2 className="text-3xl font-bold text-white mb-6">Data Management</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Column 1: Manage Existing Datasets */}
          <div className="bg-gray-900/50 p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-gray-200 mb-4">Manage Datasets</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {datasets.length === 0 && (
                  <div className="text-center text-gray-400 p-4 border-2 border-dashed border-gray-600 rounded-lg">
                      No datasets found. Please add a new dataset to begin.
                  </div>
              )}
              {datasets.map(d => (
                <div key={d.id} className={`p-3 rounded-md flex justify-between items-center transition-all ${d.isActive ? 'bg-indigo-600/30 border border-indigo-500' : 'bg-gray-700/50 border border-transparent'}`}>
                  <div>
                    <p className={`font-semibold ${d.isActive ? 'text-indigo-300' : 'text-gray-200'}`}>{d.name}</p>
                    <p className="text-xs text-gray-400">Created: {new Date(d.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <button 
                      onClick={() => onSwitchDataset(d.id)}
                      disabled={d.isActive || loading}
                      className="px-3 py-1 text-sm font-medium rounded-md transition-colors bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed disabled:text-gray-300"
                    >
                      {d.isActive ? 'Active' : 'Activate'}
                    </button>
                     <button
                        onClick={() => onDeleteDataset(d.id)}
                        disabled={loading || datasets.length <= 1}
                        className="px-3 py-1 text-sm font-medium rounded-md transition-colors bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-500 disabled:cursor-not-allowed"
                        aria-label={`Delete ${d.name} dataset`}
                    >
                        Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: Add New Dataset */}
          <div className="bg-gray-900/50 p-6 rounded-lg">
             <h3 className="text-xl font-semibold text-gray-200 mb-4">Add New Dataset</h3>
             <div className="space-y-4">
                <div>
                  <label htmlFor="dataset-name" className="block text-sm font-medium text-gray-300 mb-2">1. New Dataset Name</label>
                  <input
                    id="dataset-name"
                    type="text"
                    value={datasetName}
                    onChange={(e) => setDatasetName(e.target.value)}
                    placeholder="e.g., Spring 2024 Campus"
                    className="w-full bg-gray-800 border-gray-600 rounded-md shadow-sm text-white focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="file-upload" className="block text-sm font-medium text-gray-300 mb-2">2. Upload Data File (.zip)</label>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".zip,application/zip"
                    onChange={handleFileChange}
                    disabled={loading}
                    className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer disabled:opacity-50"
                  />
                </div>
             </div>
              {error && (
                <div className="mt-4 p-3 bg-red-900/50 border border-red-700 text-red-300 rounded-md text-sm">
                    {error}
                </div>
              )}
          </div>
           {/* Section for Sample Templates */}
          <div className="md:col-span-2 bg-gray-900/50 p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-gray-200 mb-4">Shapefile (.zip) Format Guidelines</h3>
            <p className="text-sm text-gray-400 mb-4">
                Your .zip file must contain 5 shapefiles. Layers are linked by the specified ID fields.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div className="bg-gray-800 p-4 rounded-lg">
                    <h4 className="font-bold text-white mb-2">Site (Polygon)</h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-300">
                        <li><code className="bg-gray-700 p-1 rounded">Site_Id</code> (Required, Unique)</li>
                        <li><code className="bg-gray-700 p-1 rounded">Site_Name</code> (Optional)</li>
                    </ul>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg">
                    <h4 className="font-bold text-white mb-2">Facility (Polygon)</h4>
                     <ul className="list-disc list-inside space-y-1 text-gray-300">
                        <li><code className="bg-gray-700 p-1 rounded">Faci_Id</code> (Required, Unique)</li>
                        <li><code className="bg-gray-700 p-1 rounded">Site_Id</code> (Required, Links to Site)</li>
                        <li><code className="bg-gray-700 p-1 rounded">Faci_Name</code> (Optional)</li>
                    </ul>
                </div>
                 <div className="bg-gray-800 p-4 rounded-lg">
                    <h4 className="font-bold text-white mb-2">Level (Polygon)</h4>
                     <ul className="list-disc list-inside space-y-1 text-gray-300">
                        <li><code className="bg-gray-700 p-1 rounded">Level_Id</code> (Required, Unique)</li>
                        <li><code className="bg-gray-700 p-1 rounded">Faci_Id</code> (Required, Links to Facility)</li>
                        <li><code className="bg-gray-700 p-1 rounded">Level_Name</code> (Optional)</li>
                         <li><code className="bg-gray-700 p-1 rounded">Z_Index</code> (Optional, Vertical order)</li>
                    </ul>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg">
                    <h4 className="font-bold text-white mb-2">Unit (Polygon)</h4>
                     <ul className="list-disc list-inside space-y-1 text-gray-300">
                        <li><code className="bg-gray-700 p-1 rounded">Unit_Id</code> (Required, Unique)</li>
                        <li><code className="bg-gray-700 p-1 rounded">Level_Id</code> (Required, Links to Level)</li>
                        <li><code className="bg-gray-700 p-1 rounded">Disp_Name</code> (Required, for dropdowns)</li>
                         <li><code className="bg-gray-700 p-1 rounded">Unit_Type</code> (Required, e.g. CLASSROOM)</li>
                         <li><code className="bg-gray-700 p-1 rounded">Access</code> (Required, 1 for yes)</li>
                         <li><code className="bg-gray-700 p-1 rounded">v_conn_id</code> (Optional, groups stairs/elevators across levels)</li>
                    </ul>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg">
                    <h4 className="font-bold text-white mb-2">Details (Line)</h4>
                     <ul className="list-disc list-inside space-y-1 text-gray-300">
                        <li><code className="bg-gray-700 p-1 rounded">Details_Id</code> (Required, Unique)</li>
                        <li><code className="bg-gray-700 p-1 rounded">Level_Id</code> (Required, Links to Level)</li>
                        <li><code className="bg-gray-700 p-1 rounded">Use_Type</code> (Required, e.g. Door-A, Wall-i)</li>
                         <li><code className="bg-gray-700 p-1 rounded">Height_Rel</code> (Required for 3D view)</li>
                    </ul>
                </div>
            </div>
          </div>
           {/* New Section for Exporting Data */}
          <div className="md:col-span-2 bg-gray-900/50 p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-gray-200 mb-4">Export Active Dataset</h3>
            <p className="text-sm text-gray-400 mb-4">
                Download the currently active dataset as a GeoJSON file. This file can be opened in standard GIS software like QGIS or ArcGIS.
            </p>
             <button
                onClick={handleExportGeoJson}
                disabled={loading}
                className="w-full bg-green-600 text-white font-bold py-2 px-4 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
            >
                Download as GeoJSON
            </button>
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
                <span className="text-lg text-white mt-4">Processing...</span>
            </div>
        </div>
       )}
    </div>
  );
};

export default AdminPage;