interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const Logo = ({ className = '', size = 'md' }: LogoProps) => {
  const sizeConfig = {
    sm: { width: 40, height: 24, fontSize: 20 },
    md: { width: 56, height: 32, fontSize: 28 },
    lg: { width: 80, height: 48, fontSize: 40 },
  };

  const { width, height, fontSize } = sizeConfig[size];

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 56 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="REMAPPRO Logo"
    >
      {/* R - Bold White */}
      <text
        x="2"
        y="25"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="28"
        fontWeight="800"
        fill="hsl(0 0% 98%)"
        letterSpacing="-1"
      >
        R
      </text>
      
      {/* P - Bold Brand Blue with subtle glow */}
      <defs>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <text
        x="22"
        y="25"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="28"
        fontWeight="800"
        fill="hsl(185 100% 50%)"
        letterSpacing="-1"
        filter="url(#glow)"
      >
        P
      </text>
    </svg>
  );
};

export default Logo;
