import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import Landing from "./pages/Landing";
import CreateWorkflowWizard from "./pages/CreateWorkflowWizard";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/create" element={<CreateWorkflowWizard />} />
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
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
