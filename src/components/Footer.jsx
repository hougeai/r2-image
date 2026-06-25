import Link from 'next/link';
export default function Footer() {
  return (
    <footer className="w-full text-center flex flex-col justify-center items-center py-3">
      <p className="text-xs text-slate-400">
        请勿上传违反中国法律的图片，违者后果自负 · 基于 Cloudflare Pages + R2 ·
        <Link
          href="https://github.com/hougeai/r2-image"
          className="text-cyan-600 hover:text-cyan-500 ml-1 transition-colors duration-200"
          target="_blank"
          rel="noopener noreferrer"
        >hougeai/r2-image</Link>
      </p>
    </footer>
  );
}
