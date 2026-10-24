import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Home from "./pages/Home";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./layouts/DashboardLayout";
import { AuthProvider } from "./context/AuthContext";

import BloodSearch from "./pages/BloodSearch";
import Notifications from "./pages/Notifications";

import PatientDashboard from "./pages/patient/PatientDashboard";
import EmergencyRequests from "./pages/patient/EmergencyRequests";
import PatientNotifications from "./pages/patient/PatientNotifications";

import StaffDashboard from "./pages/staff/StaffDashboard";
import InventoryManagement from "./pages/staff/InventoryManagement";
import EmergencyManagement from "./pages/staff/EmergencyManagement";
import StaffNotifications from "./pages/staff/StaffNotifications";

import AdminDashboard from "./pages/admin/AdminDashboard";
import HospitalManagement from "./pages/admin/HospitalManagement";
import NetworkReports from "./pages/admin/NetworkReports";

const PATIENT_ROLES = ["patient"];
const STAFF_ROLES = ["staff", "hospital_staff", "hospital-staff"];
const ADMIN_ROLES = ["admin", "administrator"];

function AppRoutes() {
  return (
    <>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Any signed-in role */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/blood-search" element={<BloodSearch />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={PATIENT_ROLES} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/patient/dashboard" element={<PatientDashboard />} />
            <Route path="/patient/emergency-requests" element={<EmergencyRequests />} />
            <Route path="/patient/notifications" element={<PatientNotifications />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={STAFF_ROLES} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/staff/dashboard" element={<StaffDashboard />} />
            <Route path="/staff/inventory" element={<InventoryManagement />} />
            <Route path="/staff/emergencies" element={<EmergencyManagement />} />
            <Route path="/staff/notifications" element={<StaffNotifications />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={ADMIN_ROLES} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/reports" element={<NetworkReports />} />
            <Route path="/admin/hospitals" element={<HospitalManagement />} />
            <Route path="/admin/notifications" element={<Notifications />} />
          </Route>
        </Route>

        <Route path="*" element={<Home />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}