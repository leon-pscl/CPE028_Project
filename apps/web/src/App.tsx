import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './components/Home'
import Assess from './modules/assess/AssessPage'
import Navigate from './modules/navigate/NavigatePage'
import Connect from './modules/connect/ConnectPage'

export default function App() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-16">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/assess" element={<Assess />} />
          <Route path="/navigate" element={<Navigate />} />
          <Route path="/connect" element={<Connect />} />
        </Routes>
      </main>
    </div>
  )
}
