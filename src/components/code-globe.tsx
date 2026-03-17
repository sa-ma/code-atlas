export function CodeGlobe() {
  return (
    <div className="relative flex size-[320px] items-center justify-center sm:size-[360px] lg:size-[420px]">
      <div className="code-globe-shell absolute inset-0 rounded-full" />
      <div className="code-globe-latitude absolute inset-[16%] rounded-full" />
      <div className="code-globe-latitude absolute inset-x-[12%] inset-y-[31%] rounded-full" />
      <div className="code-globe-latitude absolute inset-x-[12%] inset-y-[31%] rotate-90 rounded-full" />
      <div className="code-globe-latitude absolute inset-x-[22%] inset-y-[10%] rotate-90 rounded-full" />

      <div className="code-globe-meridian absolute inset-[8%] rounded-full" />
      <div className="code-globe-meridian absolute inset-[8%] rounded-full rotate-55" />
      <div className="code-globe-meridian absolute inset-[8%] rounded-full -rotate-55" />

      <div className="absolute inset-[18%] rounded-full border border-black/10" />

      <div className="pointer-events-none absolute inset-[-5%] rounded-full border border-black/6" />
    </div>
  );
}
