import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import HomePage from './pages/HomePage';
import BatchTestPage from './pages/BatchTestPage';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-white min-w-screen">
        {/* Navigation Bar */}
        <nav className="bg-[#3070B3] text-white py-4 flex justify-between items-center shadow px-2">
          <div className="flex items-center space-x-3">
            <span className="text-lg font-semibold">Logo</span>
          </div>
          <div className="space-x-6 text-sm text-white">
            <Link to="/" className="hover:underline hover:text-[#e5e5e5] transition-colors duration-150">Home</Link>
            <Link to="/batch" className="hover:underline hover:text-[#e5e5e5] transition-colors duration-150">Batch Tests</Link>
            <a href="/docs" className="hover:underline hover:text-[#e5e5e5] transition-colors duration-150">Documentation</a>
          </div>
        </nav>
        <main className="py-6 px-2">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/batch" element={<BatchTestPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
