import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AmbientBackdrop } from './components/layout/AmbientBackdrop'
import { AppShell } from './components/layout/AppShell'
import { ContentLoader } from './components/layout/PageLoader'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import Landing from './pages/Landing'
import NotFound from './pages/NotFound'

/**
 * Routes are code-split per page.
 *
 * The landing page, sign-in and sign-up stay eager because they are the first
 * paint for most visitors and are small. Everything else - and in particular the
 * chart-heavy dashboard and progress pages - loads on demand.
 */
const AssessmentTake = lazy(() => import('./pages/AssessmentTake'))
const Assessments = lazy(() => import('./pages/Assessments'))
const CareerAssistant = lazy(() => import('./pages/CareerAssistant'))
const CompanyDetails = lazy(() => import('./pages/CompanyDetails'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Login = lazy(() => import('./pages/Login'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const OpportunityDetails = lazy(() => import('./pages/OpportunityDetails'))
const Opportunities = lazy(() => import('./pages/Opportunities'))
const Profile = lazy(() => import('./pages/Profile'))
const Progress = lazy(() => import('./pages/Progress'))
const Register = lazy(() => import('./pages/Register'))
const ResumeAnalysis = lazy(() => import('./pages/ResumeAnalysis'))
const Roadmap = lazy(() => import('./pages/Roadmap'))
const Settings = lazy(() => import('./pages/Settings'))
const SkillGap = lazy(() => import('./pages/SkillGap'))

/**
 * Application routes.
 *
 * - Public: landing, sign in, sign up.
 * - Browsable: opportunity browsing works with or without an account.
 * - Protected: everything else, rendered inside the authenticated shell.
 */
export default function App() {
  return (
    <BrowserRouter>
      <AmbientBackdrop />
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route
          path="/login"
          element={
            <Suspense fallback={<ContentLoader />}>
              <Login />
            </Suspense>
          }
        />
        <Route
          path="/register"
          element={
            <Suspense fallback={<ContentLoader />}>
              <Register />
            </Suspense>
          }
        />

        {/* Onboarding is protected but uses its own full-screen layout. */}
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <Suspense fallback={<ContentLoader />}>
                <Onboarding />
              </Suspense>
            </ProtectedRoute>
          }
        />

        {/* Browsable signed in or out - using AdaptiveLayout equivalent */}
        <Route
          path="/opportunities"
          element={
            <Suspense fallback={<ContentLoader />}>
              <Opportunities />
            </Suspense>
          }
        />
        <Route
          path="/opportunities/:jobId"
          element={
            <Suspense fallback={<ContentLoader />}>
              <OpportunityDetails />
            </Suspense>
          }
        />
        {/* Company record - browsable signed in or out. */}
        <Route
          path="/companies/:companyId"
          element={
            <Suspense fallback={<ContentLoader />}>
              <CompanyDetails />
            </Suspense>
          }
        />

        {/* Authenticated app - uses new AppShell */}
        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/resume" element={<ResumeAnalysis />} />
          <Route path="/skill-gap" element={<SkillGap />} />
          <Route path="/roadmap" element={<Roadmap />} />
          <Route path="/assessments" element={<Assessments />} />
          <Route path="/assessments/:assessmentId" element={<AssessmentTake />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/assistant" element={<CareerAssistant />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        {/* Legacy aliases so older links keep working */}
        <Route path="/jobs" element={<Navigate to="/opportunities" replace />} />
        <Route path="/jobs/:jobId" element={<Navigate to="/opportunities" replace />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}