import { useState, useEffect } from 'react';
import LandingPage from './LandingPage';
import Medical3DCanvas from './Medical3DCanvas';

function App() {
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => {
    document.title = showEditor
      ? 'MedViz – 3D Editor'
      : 'MedViz – Clinical 3D Editor';
  }, [showEditor]);

  function enterEditor() {
    document.body.classList.add('editor-mode');
    setShowEditor(true);
  }

  function exitEditor() {
    document.body.classList.remove('editor-mode');
    setShowEditor(false);
  }

  if (showEditor) {
    return <Medical3DCanvas onGoHome={exitEditor} />;
  }

  return <LandingPage onEnterEditor={enterEditor} />;
}

export default App;
