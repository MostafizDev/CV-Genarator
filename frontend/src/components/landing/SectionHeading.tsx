import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';

/** Eyebrow + title + subtitle block that opens most sections. */
export const SectionHeading = ({
  id,
  eyebrow,
  title,
  subtitle,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  subtitle: string;
}) => (
  <div className="mx-auto max-w-4xl text-center">
    <p style={{ ...typography.styles.eyebrow, color: colors.blue }}>{eyebrow}</p>
    <h2 id={id} className="mt-3" style={{ ...typography.styles.h2, color: colors.navy }}>
      {title}
    </h2>
    <p className="mt-3" style={{ ...typography.styles.bodyLarge, color: colors.muted }}>
      {subtitle}
    </p>
  </div>
);
