export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="border-t border-white/10 mt-auto py-6 px-4">
      <div className="max-w-7xl mx-auto text-center">
        <div className="font-semibold text-white neon-glow-text text-[#00d2ff]">REMAPPRO</div>
        <div className="text-xs text-gray-500 mt-2">
          © {currentYear} Slovakia
        </div>
      </div>
    </footer>
  );
}
