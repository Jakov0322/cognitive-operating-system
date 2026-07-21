import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your projects</h1>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="text-sm text-neutral-500 hover:text-neutral-900"
          >
            Sign out
          </button>
        </form>
      </div>
      <p className="mt-6 text-neutral-500">
        Signed in as {session.user.email ?? session.user.name}. No projects yet —
        this is where they&apos;ll show up.
      </p>
    </main>
  );
}
