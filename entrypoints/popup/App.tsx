function App() {
  return (
    <main className="w-90 bg-slate-950 p-5 text-slate-100">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
        <p className="text-xs font-semibold tracking-[0.18em] text-violet-300 uppercase">
          Luna
        </p>
        <h1 className="mt-2 text-xl font-bold">你的插件已准备好</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          WXT、React 与 Tailwind CSS 已完成配置。接下来只需接入你的核心功能。
        </p>
        <div className="mt-5 flex items-center gap-2 text-xs text-emerald-300">
          <span className="size-2 rounded-full bg-emerald-400" />
          开发环境就绪
        </div>
      </div>
    </main>
  );
}

export default App;
