import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/navigation/AppShell'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import { DataProvider } from '@/hooks/useData'
import { useTheme } from '@/hooks/useTheme'
import { UIProvider } from '@/hooks/useUI'
import AuthPage from '@/app/auth'
import ChatPage from '@/app/chat/page'

const Dashboard = lazy(() => import('@/app/dashboard/page'))
const Leads = lazy(() => import('@/app/leads/page'))
const Contacts = lazy(() => import('@/app/contacts/page'))
const Companies = lazy(() => import('@/app/companies/page'))
const Deals = lazy(() => import('@/app/deals/page'))
const Tasks = lazy(() => import('@/app/tasks/page'))
const Activities = lazy(() => import('@/app/activities/page'))
const Settings = lazy(() => import('@/app/settings/page'))

function Gate() {
  const { user } = useAuth()
  if (!user) return <AuthPage />
  return (
    <DataProvider key={user.uid}>
      <UIProvider>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/chat" replace />} />
            <Route path="chat/:id?" element={<ChatPage />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="leads" element={<Leads />} />
            <Route path="contacts" element={<Contacts />} />
            <Route path="companies" element={<Companies />} />
            <Route path="deals" element={<Deals />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="activities" element={<Activities />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/chat" replace />} />
          </Route>
        </Routes>
      </UIProvider>
    </DataProvider>
  )
}

export default function App() {
  useTheme() // applies theme + follows system changes
  return (
    <ToastProvider>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:z-[200] focus:top-3 focus:left-3 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2 focus:border focus:border-line">Skip to content</a>
      <AuthProvider><Gate /></AuthProvider>
    </ToastProvider>
  )
}
