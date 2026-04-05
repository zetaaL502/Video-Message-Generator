import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WizardLayout } from "@/components/layout/WizardLayout";
import NotFound from "@/pages/not-found";

import ScriptPage from "@/pages/script";
import CharactersPage from "@/pages/characters";
import GeneratePage from "@/pages/generate";
import PreviewPage from "@/pages/preview";
import ExportPage from "@/pages/export";

const queryClient = new QueryClient();

function Router() {
  return (
    <WizardLayout>
      <Switch>
        <Route path="/" component={ScriptPage} />
        <Route path="/script" component={ScriptPage} />
        <Route path="/characters" component={CharactersPage} />
        <Route path="/generate" component={GeneratePage} />
        <Route path="/preview" component={PreviewPage} />
        <Route path="/export" component={ExportPage} />
        <Route component={NotFound} />
      </Switch>
    </WizardLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;