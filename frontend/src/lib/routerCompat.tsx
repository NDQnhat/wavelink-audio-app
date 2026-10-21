'use client';

import React, { useEffect, useTransition } from 'react';
import {
  useRouter as useNextRouter,
  usePathname as useNextPathname,
  useParams as useNextParams,
  useSearchParams as useNextSearchParams,
} from 'next/navigation';
import NextLink from 'next/link';

export interface NavigateOptions {
  replace?: boolean;
  state?: unknown;
}

export type NavigateFunction = (to: string | number, options?: NavigateOptions) => void;

export const useNavigate = (): NavigateFunction => {
  const router = useNextRouter();
  const [, startTransition] = useTransition();

  return (to: string | number, options?: NavigateOptions) => {
    if (typeof to === 'number') {
      if (to === -1) {
        router.back();
      } else {
        if (typeof window !== 'undefined') {
          window.history.go(to);
        }
      }
      return;
    }

    startTransition(() => {
      if (options?.replace) {
        router.replace(to);
      } else {
        router.push(to);
      }
    });
  };
};

export const useLocation = () => {
  const pathname = useNextPathname() || '/';
  const searchParams = useNextSearchParams();
  const search = searchParams?.toString() ? `?${searchParams.toString()}` : '';

  return {
    pathname,
    search,
    hash: typeof window !== 'undefined' ? window.location.hash : '',
    state: null,
    key: 'default',
  };
};

export const useParams = <T extends Record<string, string | string[] | undefined>>(): T => {
  const params = useNextParams();
  return (params || {}) as T;
};

export const useSearchParams = () => {
  const searchParams = useNextSearchParams();
  const router = useNextRouter();
  const pathname = useNextPathname();

  const setSearchParams = (
    nextInit: URLSearchParams | Record<string, string> | ((prev: URLSearchParams) => URLSearchParams),
    options?: { replace?: boolean }
  ) => {
    let newParams: URLSearchParams;
    if (typeof nextInit === 'function') {
      newParams = nextInit(new URLSearchParams(searchParams?.toString() || ''));
    } else if (nextInit instanceof URLSearchParams) {
      newParams = nextInit;
    } else {
      newParams = new URLSearchParams(nextInit);
    }

    const q = newParams.toString();
    const currentPath = pathname || '/';
    const targetUrl = q ? `${currentPath}?${q}` : currentPath;
    if (options?.replace) {
      router.replace(targetUrl);
    } else {
      router.push(targetUrl);
    }
  };

  const currentParams = searchParams || new URLSearchParams();
  return [currentParams, setSearchParams] as const;
};

export interface LinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: string;
  replace?: boolean;
}

export const Link: React.FC<LinkProps> = ({ to, children, ...rest }) => {
  return (
    <NextLink href={to} {...rest}>
      {children}
    </NextLink>
  );
};

export interface NavLinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'className' | 'children'> {
  to: string;
  end?: boolean;
  className?: string | ((props: { isActive: boolean; isPending: boolean }) => string);
  children?: React.ReactNode | ((props: { isActive: boolean; isPending: boolean }) => React.ReactNode);
}

export const NavLink: React.FC<NavLinkProps> = ({ to, end, className, children, ...rest }) => {
  const pathname = useNextPathname() || '/';
  const isActive = end ? pathname === to : pathname === to || (to !== '/' && pathname.startsWith(to));
  const isPending = false;

  const resolvedClassName = typeof className === 'function' ? className({ isActive, isPending }) : className;
  const resolvedChildren = typeof children === 'function' ? children({ isActive, isPending }) : children;

  return (
    <NextLink href={to} className={resolvedClassName} {...rest}>
      {resolvedChildren}
    </NextLink>
  );
};

export const Navigate: React.FC<{ to: string; replace?: boolean }> = ({ to, replace }) => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(to, { replace });
  }, [to, replace, navigate]);
  return null;
};

export const Outlet: React.FC = () => null;

export const Routes: React.FC<{ children?: React.ReactNode }> = ({ children }) => <>{children}</>;
export const Route: React.FC<{ path?: string; element?: React.ReactNode }> = ({ element }) => <>{element}</>;

export default {
  useNavigate,
  useLocation,
  useParams,
  useSearchParams,
  Link,
  NavLink,
  Navigate,
  Outlet,
  Routes,
  Route,
};
