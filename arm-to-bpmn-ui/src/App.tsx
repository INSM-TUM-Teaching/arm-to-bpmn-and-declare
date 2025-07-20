import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import BPMN from './pages/BPMN';
import BatchTestPage from './pages/BatchTestPage';
import UploadPage from './pages/UploadPage';
import Home from './pages/Home';
import DeclarePage from './pages/Declare';
import Test from './pages/Test';
import RelationshipTestPageEN from './pages/RelationshipTestPageEN';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 min-w-screen">
        {/* Navigation Bar */}
        <nav className="bg-white text-[#3070B3] py-4 px-16 flex items-center justify-between shadow ">
          <div className="flex items-center space-x-3">
            <Link to="/home"><span className="text-lg font-semibold"><img src='/logo.png' className='h-[40px]'></img></span></Link>
          </div>
          <div className="flex space-x-6 text-sm text-white ml-8">
            <Link to="/home" className="text-[#3070B3] hover:underline hover:text-blue-600 transition-colors duration-150">Home</Link>
            <Link to="/batch" className="text-[#3070B3] hover:underline hover:text-600 transition-colors duration-150">Batch Tests</Link>
            <a href="/docs" className=" text-[#3070B3] hover:underline hover:text-600 transition-colors duration-150">Documentation</a>
          </div>
        </nav>
        <main className="">
          <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/bpmn" element={<BPMN />} />
            <Route path="/batch" element={<BatchTestPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/home" element={<Home />} />
            <Route path="/test" element={<Test />} />
            <Route path="/declare" element={<DeclarePage />} />
            <Route path="/relationship-test" element={<RelationshipTestPageEN />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
