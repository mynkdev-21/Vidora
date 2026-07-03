import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { AuthProvider } from "@/hooks/use-auth";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4" style={{ background: "#06070d", color: "#e2e8f0" }}>
      <h1 className="text-8xl font-bold" style={{ color: "#a78bfa" }}>404</h1>
      <h2 className="mt-4 text-xl font-semibold text-white">Page Not Found</h2>
      <p className="mt-2 text-sm text-center max-w-sm" style={{ color: "#64748b" }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <a
        href="/"
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
        style={{ background: "linear-gradient(135deg, #7c3aed, #a78bfa)" }}
      >
        Go Home
      </a>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Vidora — Earn from your content" },
      { name: "description", content: "Vidora is a file hosting and monetization platform. Upload content, share links, and earn from views." },
      { name: "author", content: "Vidora" },
      { property: "og:title", content: "Vidora" },
      { property: "og:description", content: "Vidora is a file hosting and monetization platform. Upload content, share links, and earn from views." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@vidora" },
      { name: "twitter:title", content: "Vidora" },
      { name: "twitter:description", content: "Vidora is a file hosting and monetization platform. Upload content, share links, and earn from views." },
      { property: "og:image", content: "/favicon.png" },
      { name: "twitter:image", content: "/favicon.png" },
    ],
    links: [
      {
        rel: "icon",
        href: "/favicon.png",
        type: "image/png",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
      </AuthProvider>
    </QueryClientProvider>
  );
}
