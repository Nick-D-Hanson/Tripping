import { AuthPanel } from "@/components/auth/auth-panel";
export default async function AuthPathPage({ params }: { params: Promise<{ path: string }> }) {
  const { path } = await params;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-6 sm:p-6">
      <div className="w-full max-w-md">
        <AuthPanel path={path} />
      </div>
    </main>
  );
}
