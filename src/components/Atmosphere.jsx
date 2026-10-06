const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")"

export default function Atmosphere() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* deep field — near black, with only a suggestion of colour in it */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(115% 92% at 62% 44%, #0d0a26 0%, #080618 34%, #050411 64%, #03020d 100%)',
        }}
      />

      {/* Purple atmosphere, two bodies drifting on unrelated periods.
          Gradients rather than blurred blocks: a 120px filter blur on layers
          this large costs a fortune to paint and buys nothing a soft colour
          stop can't do. */}
      <div
        data-atmos
        className="absolute -right-[14%] -top-[28%] h-[88vh] w-[78vw]"
        style={{
          background:
            'radial-gradient(closest-side, rgba(116,84,190,0.2) 0%, rgba(104,74,174,0.12) 32%,' +
            ' rgba(88,62,150,0.05) 58%, transparent 80%)',
          animation: 'haze-a 27s ease-in-out infinite',
        }}
      />
      <div
        data-atmos
        className="absolute -left-[18%] top-[30%] h-[78vh] w-[66vw]"
        style={{
          background:
            'radial-gradient(closest-side, rgba(80,60,150,0.14) 0%, rgba(70,52,134,0.08) 34%,' +
            ' rgba(58,44,116,0.03) 60%, transparent 82%)',
          animation: 'haze-b 34s ease-in-out infinite',
        }}
      />

      {/* the light the pointer is moving through the room */}
      <div
        className="absolute inset-0 mix-blend-screen"
        style={{
          background:
            'radial-gradient(44vmax 40vmax at calc(var(--lx, 0.5) * 100%) calc(var(--ly, 0.45) * 100%),' +
            ' rgba(146,116,220,calc(0.1 + var(--warm, 0) * 0.04)) 0%,' +
            ' rgba(104,82,170,0.035) 40%, transparent 70%)',
        }}
      />

      {/* lighting evolves as the camera closes in: violet gives way to a warm key */}
      <div
        className="absolute inset-0 mix-blend-screen"
        style={{
          opacity: 'var(--warm, 0)',
          background:
            'radial-gradient(30vmax 28vmax at calc(var(--lx, 0.5) * 100%) calc(var(--ly, 0.45) * 100%),' +
            ' rgba(226,178,132,0.22) 0%, rgba(190,140,110,0.08) 42%, transparent 70%)',
        }}
      />

      {/* vignette, tightening through the sequence */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(118% 100% at 50% 48%, transparent 30%, rgba(3,2,13,calc(0.45 + var(--vig, 0) * 0.4)) 78%, rgba(3,2,13,calc(0.78 + var(--vig, 0) * 0.2)) 100%)',
        }}
      />

      <div
        className="absolute -inset-[12%] opacity-[0.035] mix-blend-overlay"
        style={{ backgroundImage: GRAIN, animation: 'grain-shift 8s steps(5) infinite' }}
      />

      {/* the scene closes to the exact black the next section opens on */}
      <div
        className="absolute inset-0 bg-abyss"
        style={{ opacity: 'var(--blackout, 0)' }}
      />
    </div>
  )
}
