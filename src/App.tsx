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
import AllTemplates from "./pages/AllTemplates";
import AllWorkflows from "./pages/AllWorkflows";
import ProfilePage from "./pages/ProfilePage";
import TechDocsPage from "./pages/TechDocsPage";
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
            <Route path="/templates" element={<AllTemplates />} />
            <Route path="/workflows" element={<AllWorkflows />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
