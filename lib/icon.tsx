interface IconProps {
  path: string;
  size?: number;
  className?: string;
}

export function Icon({ path, size = 1, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size * 24}
      height={size * 24}
      className={className}
      fill="currentColor"
    >
      <path d={path} />
    </svg>
  );
}
