import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import Landing from "./pages/Landing";
import CreateWorkflowWizard from "./pages/CreateWorkflowWizard";
import CaseViewConfigPage from "./pages/CaseViewConfigPage";
import StudioPage from "./pages/StudioPage";
import FormBuilderPage from "./pages/FormBuilderPage";
import ModuleConfigPage from "./pages/ModuleConfigPage";
import AllTemplates from "./pages/AllTemplates";
import AllWorkflows from "./pages/AllWorkflows";
import ProfilePage from "./pages/ProfilePage";
import TechDocsPage from "./pages/TechDocsPage";
import FormBuilderDocsPage from "./pages/FormBuilderDocsPage";
import EmailReaderDocsPage from "./pages/docs/EmailReaderDocsPage";
import DataExtractorDocsPage from "./pages/docs/DataExtractorDocsPage";
import AiProcessorDocsPage from "./pages/docs/AiProcessorDocsPage";
import SendEmailDocsPage from "./pages/docs/SendEmailDocsPage";
import ApprovalDocsPage from "./pages/docs/ApprovalDocsPage";
import AutomationNodesDocsPage from "./pages/docs/AutomationNodesDocsPage";
import CamundaTopicsDocsPage from "./pages/docs/CamundaTopicsDocsPage";
import RbacDocsPage from "./pages/docs/RbacDocsPage";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/AuthPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import { AuthzProvider } from "./contexts/AuthzContext";
import ProtectedRoute from "./components/authz/ProtectedRoute";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminTeamsPage from "./pages/admin/AdminTeamsPage";
import AdminPersonasPage from "./pages/admin/AdminPersonasPage";
import AdminRolesPage from "./pages/admin/AdminRolesPage";
import AdminPoliciesPage from "./pages/admin/AdminPoliciesPage";
import AdminAuditPage from "./pages/admin/AdminAuditPage";
import AdminLayout from "./pages/admin/AdminLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthzProvider>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<Landing />} />
              <Route path="/create" element={<CreateWorkflowWizard />} />
              <Route path="/create/case-view-config" element={<CaseViewConfigPage />} />
              <Route path="/studio" element={<StudioPage />} />
              <Route path="/studio/form-builder" element={<FormBuilderPage />} />
              <Route path="/studio/module-config" element={<ModuleConfigPage />} />
              <Route path="/templates" element={<AllTemplates />} />
              <Route path="/workflows" element={<AllWorkflows />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/docs" element={<TechDocsPage />} />
              <Route path="/docs/form-builder" element={<FormBuilderDocsPage />} />
              <Route path="/docs/email-reader" element={<EmailReaderDocsPage />} />
              <Route path="/docs/data-extractor" element={<DataExtractorDocsPage />} />
              <Route path="/docs/ai-processor" element={<AiProcessorDocsPage />} />
              <Route path="/docs/send-email" element={<SendEmailDocsPage />} />
              <Route path="/docs/approval" element={<ApprovalDocsPage />} />
              <Route path="/docs/automation-nodes" element={<AutomationNodesDocsPage />} />
              <Route path="/docs/camunda-topics" element={<CamundaTopicsDocsPage />} />
              <Route path="/docs/rbac" element={<RbacDocsPage />} />
              <Route path="/admin" element={<ProtectedRoute perm="navigation.view.admin"><AdminLayout /></ProtectedRoute>}>
                <Route index element={<AdminUsersPage />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="teams" element={<AdminTeamsPage />} />
                <Route path="personas" element={<AdminPersonasPage />} />
                <Route path="roles" element={<AdminRolesPage />} />
                <Route path="policies" element={<AdminPoliciesPage />} />
                <Route path="audit" element={<AdminAuditPage />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthzProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
