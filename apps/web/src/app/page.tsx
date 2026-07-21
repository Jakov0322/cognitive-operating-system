import { redirect } from "next/navigation";

import { auth, signIn } from "@/auth";

export default async function HomePage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-3xl font-semibold">cognitive-os</h1>
      <p className="max-w-md text-neutral-500">
        Paste a public repo and get a personalized overview — architecture, risk,
        ownership, activity — instead of spending days reading code to learn it.
      </p>
      <form
        action={async () => {
          "use server";
          await signIn("github", { redirectTo: "/dashboard" });
        }}
      >
        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
        >
          Sign in with GitHub
        </button>
      </form>
    </main>
  );
}
