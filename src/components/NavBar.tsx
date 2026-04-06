"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Brain,
  Upload,
  MessageSquare,
  BarChart3,
} from "lucide-react";

export default function NavBar() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Home", icon: Brain },
    { href: "/upload", label: "Upload", icon: Upload },
    { href: "/chat", label: "Chat", icon: MessageSquare },
    { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  ];

  return (
    <nav className="nav-bar">
      <Link href="/" className="nav-logo">
        <div className="nav-logo-icon">
          <Brain size={20} color="white" />
        </div>
        RAG Engine
      </Link>
      <ul className="nav-links">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className={`nav-link ${pathname === link.href ? "active" : ""}`}
            >
              <link.icon size={16} />
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
