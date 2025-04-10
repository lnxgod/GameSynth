import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Run from "@/pages/run";
import PromptsSetup from "@/pages/prompts-setup";
import { AssetsPage } from "@/pages/assets";
import { NavBar } from "@/components/nav-bar";

function Router() {
  return (
    <div>
      <NavBar />
      <Switch>
        <Route path="/run" component={Run} />
        <Route path="/prompts-setup" component={PromptsSetup} />
        <Route path="/assets" component={AssetsPage} />
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;