import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import AppRoutes from './routes';
import './styles/global.css';

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <div className="App h-full">
          {console.log("API URL:", import.meta.env.API_URL)}
          <AppRoutes />
        </div>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
