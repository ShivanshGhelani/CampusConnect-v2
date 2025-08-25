import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ToastProvider } from './context/ToastContext';
import AppRoutes from './routes';
import './styles/global.css';

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <ToastProvider>
          <div className="App h-full">
            <AppRoutes />
          </div>
        </ToastProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
