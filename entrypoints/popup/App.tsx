function App() {
  return (
    <main className="w-90 bg-slate-950 text-slate-100">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
        <p className="text-xs font-semibold tracking-[0.18em] text-violet-300 uppercase">
          LunaV
        </p>
        <h1 className="mt-2 text-xl font-bold">Your extension is ready</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          WXT, React, and Tailwind CSS are configured. Next, add your core features.
        </p>
        <div className="mt-5 flex items-center gap-2 text-xs text-emerald-300">
          <span className="size-2 rounded-full bg-emerald-400" />
          Development environment ready
        </div>
      </div>
    </main>
  );
}

export default App;
