import React from 'react';
import { AuthProvider } from './context/AuthContext';
import AppRoutes from './routes';
import './styles/global.css';

function App() {
  // // Load initial state from localStorage or use defaults
  // const [cssFramework, setCssFramework] = useState(() => {
  //   return localStorage.getItem('htmlEditor_cssFramework') || 'tailwind'
  // })
  // const [pageOrientation, setPageOrientation] = useState(() => {
  //   return localStorage.getItem('htmlEditor_pageOrientation') || 'portrait'
  // })
  // const [currentView, setCurrentView] = useState(() => {
  //   return localStorage.getItem('htmlEditor_currentView') || 'editor'
  // })
  // const [htmlCode, setHtmlCode] = useState(() => {
  //   return localStorage.getItem('htmlEditor_htmlCode') || ''
  // })

  // // Save to localStorage whenever state changes
  // useEffect(() => {
  //   localStorage.setItem('htmlEditor_cssFramework', cssFramework)
  // }, [cssFramework])

  // useEffect(() => {
  //   localStorage.setItem('htmlEditor_pageOrientation', pageOrientation)
  // }, [pageOrientation])

  // useEffect(() => {
  //   localStorage.setItem('htmlEditor_currentView', currentView)
  // }, [currentView])

  // useEffect(() => {
  //   localStorage.setItem('htmlEditor_htmlCode', htmlCode)
  // }, [htmlCode])
  return (
    <AuthProvider>
      <div className="App h-full">
        <AppRoutes />
      </div>
    </AuthProvider>
  );
}

export default App;
