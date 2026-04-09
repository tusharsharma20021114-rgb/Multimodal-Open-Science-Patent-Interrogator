"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Upload,
  MessageSquare,
  BarChart3,
  ImageIcon,
} from "lucide-react";

export default function NavBar() {
  const pathname = usePathname();

  const links = [
    { href: "/chat", label: "Chat", icon: MessageSquare },
    { href: "/upload", label: "Upload", icon: Upload },
    { href: "/diagrams", label: "Diagrams", icon: ImageIcon },
    { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  ];

  return (
    <nav className="nav-bar">
      <Link href="/" className="nav-logo">
        <div className="nav-logo-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        Multimodal RAG
      </Link>
      <ul className="nav-links">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className={`nav-link ${pathname === link.href ? "active" : ""}`}
            >
              <link.icon size={14} strokeWidth={2} />
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
