import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { NewApplicationPage } from './pages/NewApplicationPage';
import { TrackerPage } from './pages/TrackerPage';
import { ApplicationDetailPage } from './pages/ApplicationDetailPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
        <Navbar />
        <main className="flex-1 pb-16">
          <Routes>
            <Route path="/" element={<Navigate to="/profile" replace />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/new-application" element={<NewApplicationPage />} />
            <Route path="/tracker" element={<TrackerPage />} />
            <Route path="/tracker/:id" element={<ApplicationDetailPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/profile" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default App;
