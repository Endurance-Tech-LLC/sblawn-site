import Image from "next/image";
import Link from "next/link";
import { MowRow } from "@/components/mow-row";
import { MowerPicker } from "@/components/mower-picker";
import { ProductCard } from "@/components/product-card";
import { ButtonLink, Container, Eyebrow } from "@/components/ui";
import { getCategories, getFeaturedProducts, getMowerModels, getProducts } from "@/lib/catalog";
import { media } from "@/lib/mock-data";

const steps = [
  { n: "01", title: "Attach", body: "Clamp it to your walk-behind in about 15 minutes. Brackets for 40+ brands are in the box.", img: media.step1 },
  { n: "02", title: "Design", body: "Pick a pattern — straight stripes, checkerboard, diamonds. The patterning guide shows you how.", img: media.step2 },
  { n: "03", title: "Mow", body: "Mow like normal. The sand-filled roller bends the grass for crisp, pro-level stripes.", img: media.step3 },
];

const stats = [
  { big: "15 min", small: "to install" },
  { big: "40+", small: "mower brands fit" },
  { big: "1 pass", small: "mow + stripe" },
  { big: "1–2 day", small: "UPS shipping" },
];

/** Big white heading that sits straight on the lawn. */
function LawnHeading({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 text-white">
      <div>
        {eyebrow && (
          <p className="inline-block rounded-full bg-charcoal/80 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-turf">
            {eyebrow}
          </p>
        )}
        <h2 className="mt-3 font-display text-4xl font-extrabold uppercase [text-shadow:0_2px_12px_rgb(15_40_20/0.55)] sm:text-6xl">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

export default async function Home() {
  const [featured, categories, mowers, systems] = await Promise.all([
    getFeaturedProducts(),
    getCategories(),
    getMowerModels(),
    getProducts("striping-systems"),
  ]);
  const fromPrice = Math.min(...systems.map((s) => s.priceCents)) / 100;

  return (
    <div className="pb-20">
      {/* Hero — straight on the lawn */}
      <Container className="grid items-center gap-10 pt-10 sm:pt-16 lg:grid-cols-[1.05fr_1fr]">
        <div className="rounded-3xl bg-charcoal/90 p-7 text-white shadow-2xl ring-1 ring-white/10 backdrop-blur sm:p-10">
          <Eyebrow>Pattern your lawn like the pros</Eyebrow>
          <h1 className="mt-3 font-display text-5xl font-extrabold uppercase leading-[0.92] sm:text-7xl">
            Crisp stripes. <span className="text-turf">Every mow.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-white/85">
            Lawn Stryper® attaches to most walk-behind mowers in 15 minutes so you can mow and stripe in one pass.
            Systems from ${fromPrice.toFixed(2)}.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/product-category/striping-systems/">Shop striping systems</ButtonLink>
            <ButtonLink href="/product-overview/" variant="outline">
              Compare systems
            </ButtonLink>
          </div>
        </div>

        <div className="relative px-4 pb-6 sm:px-10">
          {/* The mower rolls forward as you start scrolling. */}
          <Image
            src="/mower.svg"
            alt="Walk-behind mower pulling a Lawn Stryper roller"
            width={400}
            height={240}
            priority
            className="mx-auto w-full max-w-lg drop-shadow-[0_25px_25px_rgb(15_40_20/0.45)] will-change-transform"
            style={{ transform: "translate3d(calc(min(var(--scroll-y, 0), 700) * 0.4px), 0, 0)" }}
          />
          <div className="absolute right-2 top-0 grid size-28 rotate-12 place-items-center rounded-full bg-white text-center shadow-xl ring-4 ring-turf sm:right-8 sm:size-32">
            <p className="font-display text-sm font-bold uppercase leading-tight text-charcoal">
              Assembled in
              <span className="block text-2xl font-extrabold text-turf-800">Milwaukee</span>
              Wisconsin
            </p>
          </div>
        </div>
      </Container>

      {/* Quick facts */}
      <Container className="mt-12 sm:mt-16">
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {stats.map((s) => (
            <li key={s.big} className="rounded-2xl bg-white/95 px-5 py-4 shadow-lg ring-1 ring-black/5">
              <p className="font-display text-3xl font-extrabold uppercase text-turf-800 sm:text-4xl">{s.big}</p>
              <p className="text-sm font-semibold uppercase tracking-wide text-charcoal/70">{s.small}</p>
            </li>
          ))}
        </ul>
      </Container>

      <MowRow tone="light" direction="left" />

      {/* Fit finder */}
      <Container>
        <div className="sheet p-6 sm:p-10">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-2">
            <div>
              <Eyebrow>Fit finder</Eyebrow>
              <h2 className="mt-1 font-display text-3xl font-bold uppercase sm:text-4xl">Will it fit my mower?</h2>
              <p className="text-charcoal/70">Pick your mower to see the systems and parts that fit.</p>
            </div>
            <Link href="/mower-fit/" className="text-sm font-semibold text-turf-800 underline">
              Browse all mowers
            </Link>
          </div>
          <MowerPicker mowers={mowers} />
        </div>
      </Container>

      <MowRow tone="dark" direction="right" />

      {/* Featured systems */}
      <Container>
        <LawnHeading
          eyebrow="Shop the newest generation"
          title="The complete system"
          action={<ButtonLink href="/product-category/striping-systems/" variant="light">View all systems</ButtonLink>}
        />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((p, i) => (
            <div key={p.slug} className="rounded-2xl shadow-xl">
              <ProductCard product={p} priority={i === 0} />
            </div>
          ))}
        </div>
      </Container>

      <MowRow tone="light" direction="left" />

      {/* How it works */}
      <Container>
        <div className="sheet grid lg:grid-cols-[22rem_1fr]">
          <div className="stripes-dark p-8 text-white sm:p-10">
            <Eyebrow>How it works</Eyebrow>
            <h2 className="mt-2 font-display text-5xl font-extrabold uppercase leading-none">
              Attach.
              <br />
              Design.
              <br />
              Mow.
            </h2>
            <p className="mt-4 text-white/85">No tools you don&apos;t already own, no extra pass around the yard.</p>
          </div>
          <ol className="grid gap-6 p-6 sm:p-8 md:grid-cols-3">
            {steps.map((s) => (
              <li key={s.n}>
                <div className="relative aspect-[16/11] overflow-hidden rounded-xl">
                  <Image src={s.img} alt="" fill sizes="(min-width: 768px) 25vw, 100vw" className="object-cover" />
                  <span className="absolute left-3 top-3 rounded-full bg-turf px-3 py-1 font-display text-lg font-extrabold text-white shadow">
                    {s.n}
                  </span>
                </div>
                <h3 className="mt-4 font-display text-2xl font-bold uppercase">{s.title}</h3>
                <p className="mt-1 text-charcoal/75">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </Container>

      <MowRow tone="dark" direction="right" />

      {/* Categories */}
      <Container>
        <LawnHeading title="Shop by category" />
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/product-category/${c.slug}/`}
              className="group relative flex aspect-[4/3] items-end overflow-hidden rounded-2xl bg-charcoal text-white shadow-xl ring-4 ring-white/70 transition hover:-translate-y-1 hover:ring-white"
            >
              <Image
                src={c.image}
                alt=""
                fill
                sizes="(min-width: 768px) 33vw, 100vw"
                className="object-cover opacity-70 transition duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal/90 to-transparent" />
              <div className="relative p-6">
                <p className="text-sm font-semibold text-turf">{c.tagline}</p>
                <h3 className="font-display text-3xl font-bold uppercase">{c.name}</h3>
              </div>
            </Link>
          ))}
        </div>
      </Container>

      <MowRow tone="light" direction="left" />

      {/* Before/after CTA */}
      <Container>
        <div className="grid overflow-hidden rounded-3xl bg-charcoal text-white shadow-2xl lg:grid-cols-2">
          <div className="relative min-h-72">
            <Image src={media.beforeAfter} alt="A lawn before and after striping with Lawn Stryper" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
          </div>
          <div className="px-6 py-12 sm:px-12 lg:py-16">
            <Eyebrow>Why wait?</Eyebrow>
            <h2 className="mt-2 font-display text-4xl font-bold uppercase sm:text-5xl">Make this season your best yet</h2>
            <ul className="mt-6 space-y-3 text-white/85">
              <li>✓ Works with gas and battery mowers</li>
              <li>✓ Keep your bagger on — or take it off</li>
              <li>✓ Assembled in Milwaukee, WI</li>
              <li>✓ Ships UPS Ground in 1–2 business days</li>
            </ul>
            <div className="mt-8">
              <ButtonLink href="/product/lawn-stryper-generation-3/">Shop Generation 3</ButtonLink>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
