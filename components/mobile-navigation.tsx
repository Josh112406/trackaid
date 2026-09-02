"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

export function MobileNavigation({
  items,
}: {
  items: ReadonlyArray<readonly [href: string, label: string]>;
}) {
  const pathname = usePathname();
  const detailsRef = useRef<HTMLDetailsElement>(null);

  function closeMenu() {
    if (detailsRef.current) detailsRef.current.open = false;
  }

  useEffect(() => {
    if (detailsRef.current) detailsRef.current.open = false;
  }, [pathname]);

  return (
    <details className="mobile-navigation" ref={detailsRef}>
      <summary>
        <Menu size={18} aria-hidden="true" /> Menu
      </summary>
      <nav aria-label="Mobile navigation">
        {items.map(([href, label]) => (
          <Link href={href} key={href} onClick={closeMenu}>
            {label}
          </Link>
        ))}
      </nav>
    </details>
  );
}
