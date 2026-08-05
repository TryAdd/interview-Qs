import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import QuizPage from './pages/QuizPage'
import AdminPage from './pages/AdminPage'
import HomePage from './pages/HomePage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/e/:token" element={<QuizPage />} />
        <Route path="/admin" element={<AdminPage mode="admin" />} />
        <Route path="/superadmin" element={<AdminPage mode="super" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
