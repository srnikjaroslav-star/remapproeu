import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050505] p-4">
      <div className="glass rounded-2xl p-12 max-w-md w-full text-center border border-white/10">
        <h1 className="text-4xl font-bold mb-4 neon-glow-text text-[#00d2ff]">
          REMAPPRO
        </h1>
        <p className="text-gray-300 mb-8">Management Suite</p>
        <div className="space-y-4">
          <Link
            href="/admin"
            className="block w-full px-6 py-4 bg-[#00d2ff]/20 hover:bg-[#00d2ff]/30 border border-[#00d2ff]/50 rounded-lg text-[#00d2ff] font-medium transition-all neon-glow"
          >
            Admin Dashboard
          </Link>
          <div className="text-sm text-gray-400 mt-6">Client Portals</div>
          <Link
            href="/portal/jan-cery"
            className="block w-full px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-300 font-medium transition-all"
          >
            Jan Cery Portal
          </Link>
          <Link
            href="/portal/jindrich-cerman"
            className="block w-full px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-300 font-medium transition-all"
          >
            Jindrich Cerman Portal
          </Link>
        </div>
      </div>
    </div>
  );
}
