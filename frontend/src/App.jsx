import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import AppRoutes from './routes';
import './styles/global.css';

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <div className="App h-full">
          <AppRoutes />
        </div>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
