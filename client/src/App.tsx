import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Login from "@/pages/login";
import ChangePassword from "@/pages/change-password";
import UserManagement from "@/pages/user-management";
import { AuthContext, useAuthProvider } from "@/lib/auth";
import React, { useContext } from 'react';

function ProtectedRoute({ component: Component, requireAdmin, ...rest }: { component: React.ComponentType<any>, requireAdmin?: boolean }) {
  const { auth } = useContext(AuthContext)!;

  if (!auth.isAuthenticated) {
    return <Redirect to="/login" />;
  }

  if (auth.forcePasswordChange) {
    return <Redirect to="/change-password" />;
  }

  if (requireAdmin && auth.role !== 'admin') {
    return <Redirect to="/" />;
  }

  return <Component {...rest} />;
}

function Router() {
  const auth = useContext(AuthContext)!;

  return (
    <Switch>
      <Route path="/login">
        {auth.auth.isAuthenticated ? <Redirect to="/" /> : <Login />}
      </Route>
      <Route path="/change-password">
        {!auth.auth.isAuthenticated ? (
          <Redirect to="/login" />
        ) : !auth.auth.forcePasswordChange ? (
          <Redirect to="/" />
        ) : (
          <ChangePassword />
        )}
      </Route>
      <Route path="/users" component={() => <ProtectedRoute component={UserManagement} requireAdmin />} />
      <Route path="/" component={() => <ProtectedRoute component={Home} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const auth = useAuthProvider();

  return (
    <AuthContext.Provider value={auth}>
      <QueryClientProvider client={queryClient}>
        <Router />
        <Toaster />
      </QueryClientProvider>
    </AuthContext.Provider>
  );
}

export default App;