'use client';

import React from 'react';
import Link, { LinkProps } from 'next/link';
import { usePathname } from 'next/navigation';
import { useLoading } from './LoadingContext';

interface TransitionLinkProps extends LinkProps {
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

export function TransitionLink({ href, children, className, onClick, ...props }: TransitionLinkProps) {
  const pathname = usePathname();
  const { startNavigation } = useLoading();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClick) onClick(e);

    const targetUrl = href.toString();
    const isInternal = targetUrl.startsWith('/') || targetUrl.startsWith(window.location.origin);
    const isDifferent = targetUrl !== pathname && targetUrl !== `${pathname}/`;

    if (isInternal && isDifferent && !e.metaKey && !e.ctrlKey) {
      startNavigation(targetUrl);
    }
  };

  return (
    <Link href={href} className={className} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}
