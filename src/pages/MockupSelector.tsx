import { MOCKUPS } from '../mockups/registry'

// Homepage at '/' — card grid driven by the mockup registry. Clicking navigates; App.tsx renders.
export default function MockupSelector() {
  return (
    <div className="flex flex-col items-center justify-center gap-8 p-10" style={{ minHeight: '100vh', background: 'var(--color-void)' }}>
      <div className="text-center">
        <div className="font-mono text-[11px] font-medium tracking-[0.3em] text-quill">HPC DESK · DESIGN LAB</div>
        <h1 className="mt-2 text-2xl font-medium text-frost">Choose a mockup</h1>
        <div className="mt-1 text-[12.5px] text-ghost">{MOCKUPS.length} design{MOCKUPS.length === 1 ? '' : 's'} under review</div>
      </div>
      <div className="grid w-full max-w-5xl gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {MOCKUPS.map((m) => (
          <a
            key={m.id}
            href={`#/${m.id}`}
            className="group rounded-2xl border border-dusk bg-panel/40 p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-ghost hover:bg-panel/70"
          >
            <div className="font-mono text-[11px] text-accent-soft">{m.id}</div>
            <div className="mt-1 text-[15px] font-medium text-frost">{m.name}</div>
            <div className="mt-1 text-[12.5px] leading-relaxed text-quill">{m.desc}</div>
            <div className="mt-4 inline-flex items-center gap-1 font-mono text-[11px] text-mist transition group-hover:text-accent-soft">
              open
              <span aria-hidden>→</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
