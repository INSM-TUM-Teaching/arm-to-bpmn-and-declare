import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import BPMN from './pages/BPMN';
import BatchTestPage from './pages/BatchTestPage';
import UploadPage from './pages/UploadPage';
import Home from './pages/Home';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-white min-w-screen">
        {/* Navigation Bar */}
        <nav className="bg-[#3070B3] text-white py-4 px-16 flex items-center justify-between shadow ">
          <div className="flex items-center space-x-3">
            <span className="text-lg font-semibold">Logo</span>
          </div>
          <div className="flex space-x-6 text-sm text-white ml-8">
            <Link to="/home" className="hover:underline hover:text-[#e5e5e5] transition-colors duration-150">Home</Link>
            <Link to="/batch" className="hover:underline hover:text-[#e5e5e5] transition-colors duration-150">Batch Tests</Link>
            <a href="/docs" className="hover:underline hover:text-[#e5e5e5] transition-colors duration-150">Documentation</a>
            <Link to="/upload" className="hover:underline hover:text-[#e5e5e5] transition-colors duration-150">Upload</Link>
            <Link to="/bpmn" className="hover:underline hover:text-[#e5e5e5] transition-colors duration-150">BPMN</Link>
          </div>
        </nav>
        <main className="py-6 px-2">
          <Routes>
            <Route path="/bpmn" element={<BPMN />} />
            <Route path="/batch" element={<BatchTestPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/home" element={<Home />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
