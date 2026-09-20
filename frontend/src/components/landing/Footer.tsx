import { brandIcons, brand } from '../../config/assets';
import { footer } from '../../config/landingContent';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { Container } from './Container';
import { Logo } from './Logo';
import { TextLink } from './TextLink';
import { useHover } from './useHover';

const SocialLink = ({ label, icon, href }: { label: string; icon: keyof typeof brandIcons; href: string }) => {
  const { active, handlers } = useHover();
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      {...handlers}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{ backgroundColor: active ? colors.blueSoft : colors.blueTint, outlineColor: colors.blue }}
    >
      <img src={brandIcons[icon](colors.navy)} alt="" className="h-5 w-5" />
    </a>
  );
};

export const Footer = () => (
  <footer style={{ backgroundColor: colors.white, borderTop: `1px solid ${colors.border}` }}>
    <Container className="py-10">
      <div className="flex flex-col items-center gap-8 md:flex-row md:justify-between">
        <Logo showTagline />

        <nav aria-label="Footer" className="flex flex-wrap justify-center gap-x-9 gap-y-3">
          {footer.links.map((link) => (
            <TextLink key={link.label} href={link.href}>
              {link.label}
            </TextLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {footer.social.map((item) => (
            <SocialLink key={item.label} {...item} />
          ))}
        </div>
      </div>

      <div
        className="mt-8 flex flex-col items-center gap-2 pt-6 text-center sm:flex-row sm:justify-between sm:text-left"
        style={{ borderTop: `1px solid ${colors.border}`, ...typography.styles.small, color: colors.muted }}
      >
        <p>
          © {new Date().getFullYear()} {brand.name}. {footer.rights}
        </p>
        <p>{brand.eyebrow}</p>
      </div>
    </Container>
  </footer>
);
