import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { Toaster } from '@/components/ui/toast';
import { Layout } from '@/components/layout/Layout';
import { Dashboard } from '@/pages/dashboard';
import { Programs } from '@/pages/programs';
import { ProgramDetail } from '@/pages/program-detail';
import { Findings } from '@/pages/findings';
import { FindingDetail } from '@/pages/finding-detail';

const queryClient = new QueryClient();

function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">404</h1>
      <p className="mt-2 text-sm text-muted-foreground">Page not found in this sector.</p>
    </div>
  );
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/programs" component={Programs} />
        <Route path="/programs/:id" component={ProgramDetail} />
        <Route path="/findings" component={Findings} />
        <Route path="/findings/:id" component={FindingDetail} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Router />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;