import { useState } from 'react';
import { icons } from '../../config/assets';
import { navLinks } from '../../config/landingContent';
import { routes } from '../../config/routes';
import { alpha, colors } from '../../styles/colors';
import { Button } from './Button';
import { Container } from './Container';
import { Logo } from './Logo';
import { TextLink } from './TextLink';

export const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  const MenuIcon = menuOpen ? icons.close : icons.menu;

  return (
    <header
      className="sticky top-0 z-40 backdrop-blur"
      style={{
        backgroundColor: alpha(colors.white, 0.92),
        borderBottom: `1px solid ${alpha(colors.border, 0.7)}`,
      }}
    >
      <Container className="flex h-16 items-center justify-between sm:h-[72px]">
        <span className="sm:hidden">
          <Logo size={30} />
        </span>
        <span className="hidden sm:block">
          <Logo />
        </span>

        <nav aria-label="Main" className="hidden items-center gap-9 lg:flex">
          {navLinks.map((link) => (
            <TextLink key={link.href} href={link.href}>
              {link.label}
            </TextLink>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:block">
            <Button to={routes.login} variant="ghost">
              Sign In
            </Button>
          </div>
          <Button to={routes.login}>Get Started</Button>
          <button
            type="button"
            className="rounded-lg p-2 lg:hidden"
            style={{ color: colors.navy }}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <MenuIcon className="h-6 w-6" />
          </button>
        </div>
      </Container>

      {menuOpen && (
        <nav
          id="mobile-menu"
          aria-label="Mobile"
          className="lg:hidden"
          style={{ backgroundColor: colors.white, borderTop: `1px solid ${colors.border}` }}
        >
          <Container className="flex flex-col gap-1 py-3">
            {navLinks.map((link) => (
              <TextLink key={link.href} href={link.href} onClick={closeMenu} className="block py-3">
                {link.label}
              </TextLink>
            ))}
            <div className="sm:hidden">
              <Button to={routes.login} variant="ghost" onClick={closeMenu} className="-ml-4">
                Sign In
              </Button>
            </div>
          </Container>
        </nav>
      )}
    </header>
  );
};
