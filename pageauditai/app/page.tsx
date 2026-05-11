export default function Home() {
  const trustLogos = ["Northwind", "Vantage", "Helio", "Summit", "Astra"];
  const features = [
    {
      title: "Unified Page Signals",
      description:
        "Track key on-page quality signals in one calm view so teams can prioritize what matters first.",
    },
    {
      title: "AI-Guided Recommendations",
      description:
        "Get clear, actionable suggestions written in plain language to improve clarity and conversion.",
    },
    {
      title: "Fast Team Collaboration",
      description:
        "Share reports and align stakeholders with concise findings, context, and next-step suggestions.",
    },
  ];

  return (
    <main className="bg-[#f4f8fd] text-[#1f3044]">
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-20 sm:px-10 sm:pb-20 sm:pt-24 lg:px-16 lg:pt-28">
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex rounded-full border border-[#cbdceb] bg-white px-4 py-1 text-xs font-medium tracking-wide text-[#58728d] uppercase">
            Placeholder Preview
          </p>
          <h1 className="mt-8 font-serif text-4xl leading-tight font-semibold tracking-tight text-[#23415f] sm:text-6xl">
            Turn every page into a calm, clear conversion experience.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-[#58728d] sm:text-lg">
            PageAuditAI helps your team review what matters, improve clarity,
            and ship better pages with confidence.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="#"
              className="inline-flex h-11 items-center justify-center rounded-full bg-[#2f6faa] px-6 text-sm font-medium text-white transition hover:bg-[#285e90]"
            >
              Start Free Trial
            </a>
            <a
              href="#"
              className="inline-flex h-11 items-center justify-center rounded-full border border-[#cbdceb] bg-white px-6 text-sm font-medium text-[#355777] transition hover:bg-[#eef4fb]"
            >
              Book a Demo
            </a>
          </div>
          <div className="mx-auto mt-12 grid max-w-2xl grid-cols-2 gap-3 rounded-2xl border border-[#cbdceb] bg-white p-4 text-left shadow-[0_10px_30px_rgba(36,77,115,0.08)] sm:grid-cols-4">
            <div>
              <p className="text-xs text-[#6f89a4]">Pages Audited</p>
              <p className="mt-1 text-sm font-semibold text-[#23415f]">6,400+</p>
            </div>
            <div>
              <p className="text-xs text-[#6f89a4]">Avg. Lift</p>
              <p className="mt-1 text-sm font-semibold text-[#23415f]">19%</p>
            </div>
            <div>
              <p className="text-xs text-[#6f89a4]">Teams</p>
              <p className="mt-1 text-sm font-semibold text-[#23415f]">730+</p>
            </div>
            <div>
              <p className="text-xs text-[#6f89a4]">Weekly Reports</p>
              <p className="mt-1 text-sm font-semibold text-[#23415f]">2,300+</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#d9e6f3] bg-[#edf4fb]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-4 px-6 py-6 text-xs font-medium tracking-wide text-[#5f7a96] uppercase sm:px-10 lg:px-16">
          <span className="text-[#7f97af]">Trusted by growing teams</span>
          {trustLogos.map((name) => (
            <span key={name}>{name}</span>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 sm:px-10 sm:py-20 lg:px-16">
        <div className="mb-12 max-w-2xl">
          <h2 className="font-serif text-3xl font-semibold tracking-tight text-[#23415f] sm:text-4xl">
            Built for focused teams and thoughtful launch workflows.
          </h2>
          <p className="mt-4 text-[#58728d]">
            A simple foundation with clear feedback loops, designed to keep
            your product and marketing teams aligned.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-2xl border border-[#d3e1ef] bg-white p-6 shadow-[0_8px_24px_rgba(36,77,115,0.07)]"
            >
              <h3 className="text-lg font-medium text-[#23415f]">
                {feature.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-[#58728d]">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-[#edf4fb]">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:px-10 sm:py-20 lg:px-16">
          <div className="rounded-3xl border border-[#d3e1ef] bg-white p-8 sm:p-10">
            <p className="text-xs font-medium tracking-wide text-[#5f7a96] uppercase">
            Pricing teaser
            </p>
            <h2 className="mt-3 font-serif text-2xl font-semibold tracking-tight text-[#23415f] sm:text-3xl">
              Simple plans for every growing team.
            </h2>
            <p className="mt-4 max-w-2xl text-[#58728d]">
              Start with a flexible base and upgrade as your workflow matures.
              Full pricing table and plan comparison coming soon.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <a
                href="#"
                className="inline-flex h-11 items-center justify-center rounded-full bg-[#2f6faa] px-6 text-sm font-medium text-white transition hover:bg-[#285e90]"
              >
                View Plans
              </a>
              <a
                href="#"
                className="inline-flex h-11 items-center justify-center rounded-full border border-[#cbdceb] bg-white px-6 text-sm font-medium text-[#355777] transition hover:bg-[#eef4fb]"
              >
                Contact Sales
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
