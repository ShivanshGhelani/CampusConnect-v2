import { useState, useEffect } from 'react';
import MainPanel from '../../components/editor/MainPanel';
import '../../styles/editor.css';

const CertificateEditor = () => {
  // Load initial state from localStorage or use defaults
  const [cssFramework, setCssFramework] = useState(() => {
    return localStorage.getItem('htmlEditor_cssFramework') || 'tailwind'
  })
  const [pageOrientation, setPageOrientation] = useState(() => {
    return localStorage.getItem('htmlEditor_pageOrientation') || 'portrait'
  })
  const [currentView, setCurrentView] = useState(() => {
    return localStorage.getItem('htmlEditor_currentView') || 'editor'
  })
  const [htmlCode, setHtmlCode] = useState(() => {
    return localStorage.getItem('htmlEditor_htmlCode') || ''
  })

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('htmlEditor_cssFramework', cssFramework)
  }, [cssFramework])

  useEffect(() => {
    localStorage.setItem('htmlEditor_pageOrientation', pageOrientation)
  }, [pageOrientation])

  useEffect(() => {
    localStorage.setItem('htmlEditor_currentView', currentView)
  }, [currentView])

  useEffect(() => {
    localStorage.setItem('htmlEditor_htmlCode', htmlCode)
  }, [htmlCode])

  return (
    <div className="h-screen bg-gray-900 flex">
      <MainPanel
        currentView={currentView}
        htmlCode={htmlCode}
        cssFramework={cssFramework}
        pageOrientation={pageOrientation}
        onViewChange={setCurrentView}
        onCodeChange={setHtmlCode}
        onFrameworkChange={setCssFramework}
        onOrientationChange={setPageOrientation}
      />
    </div>
  )
}

export default CertificateEditor
