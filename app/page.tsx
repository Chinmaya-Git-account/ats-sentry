import Analyzer from "@/components/Analyzer";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-slate-950 text-white">
      <header className="border-b border-slate-800/80 bg-slate-950/90">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-6 py-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-400">
            ATSSentry
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            ATSSentry — Pre-Flight ATS & Resume Gap Analyzer v1
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-400">
            Compare resume language against a job description before you apply.
            Spot missing hard skills, jargon that ATS parsers ignore, and
            stronger bullets you can paste back in.
          </p>
        </div>
      </header>

      <main className="flex-1 px-6 py-8">
        <Analyzer />
      </main>
    </div>
  );
}
