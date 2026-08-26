export default function DemoCheckEmailPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <div className="text-5xl mb-4">📧</div>
      <h1 className="text-2xl font-bold">Check your email</h1>
      <p className="mt-3 text-gray-500 max-w-sm">
        We sent a magic link to the demo account. Click it to explore RecipeOS with pre-loaded recipes, pantry items, and prep lists.
      </p>
      <p className="mt-6 text-xs text-gray-400">
        The demo account is read-only. Any changes you make will be reset periodically.
      </p>
    </main>
  );
}
