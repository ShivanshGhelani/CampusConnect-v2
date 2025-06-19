import React from 'react';
import { AuthProvider } from './context/AuthContext';
import AppRoutes from './routes';
import './styles/global.css';

function App() {
  return (
    <AuthProvider>
      <div className="App h-full">
        <AppRoutes />
      </div>
    </AuthProvider>
  );
}

export default App;
