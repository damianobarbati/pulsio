type PulserProps = { label?: string; className?: string };

export const Pulser = ({ label = 'Loading', className = '' }: PulserProps) => (
  <span role="status" aria-label={label} className={`relative inline-flex h-5 w-5 items-center justify-center ${className}`}>
    <span className="absolute h-full w-full animate-ping rounded-full bg-pulsio-blue/30 motion-reduce:animate-none" />
    <span className="h-2/5 w-2/5 rounded-full bg-pulsio-blue" />
  </span>
);
