import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/hooks/useAuth'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppLayout } from '@/layouts/AppLayout'
import Landing from '@/pages/Landing'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Dashboard from '@/pages/Dashboard'
import ReportLost from '@/pages/ReportLost'
import ReportFound from '@/pages/ReportFound'
import MyItems from '@/pages/MyItems'
import ItemDetails from '@/pages/ItemDetails'
import Matches from '@/pages/Matches'
import Notifications from '@/pages/Notifications'
import Profile from '@/pages/Profile'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/report/lost"
            element={
              <ProtectedRoute>
                <ReportLost />
              </ProtectedRoute>
            }
          />
          <Route
            path="/report/found"
            element={
              <ProtectedRoute>
                <ReportFound />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-items"
            element={
              <ProtectedRoute>
                <MyItems />
              </ProtectedRoute>
            }
          />
          <Route
            path="/items/:id"
            element={
              <ProtectedRoute>
                <ItemDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/matches"
            element={
              <ProtectedRoute>
                <Matches />
              </ProtectedRoute>
            }
          />
          <Route
            path="/matches/:id"
            element={
              <ProtectedRoute>
                <Matches />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Landing />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
