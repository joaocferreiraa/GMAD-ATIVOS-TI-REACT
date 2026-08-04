import {
  FacebookIcon,
  InstagramIcon,
  LinkedInIcon,
  PhoneIcon,
  MailIcon,
  ClockIcon,
} from '../../../components/ui/Icon/icons'
import styles from './Footer.module.css'

const HOURS_LINES = ['De segunda à sexta-feira: 8h às 12h', '13h30 às 18h', 'Sábado: 8h às 12h']

function HiddenUnitLabel() {
  return (
    <div className={`${styles.unitLabel} ${styles.hidden}`} aria-hidden="true">
      .
    </div>
  )
}

function BrandCol({ word, social }) {
  return (
    <div className={`${styles.col} ${styles.brandCol}`}>
      <HiddenUnitLabel />
      <div className={styles.footerBrand}>
        <div className={styles.fbText}>
          <span className={styles.fbSub}>GMAD</span>
          <span className={styles.fbWord}>{word}</span>
        </div>
      </div>
      <div className={styles.social}>
        {social.map(({ Icon, href, title }) => (
          <a
            key={title}
            className={styles.fsIcon}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            title={title}
          >
            <Icon />
          </a>
        ))}
      </div>
    </div>
  )
}

function FooterLine({ Icon, gapAfter, children }) {
  return (
    <div className={styles.line} style={gapAfter ? { marginBottom: 20 } : undefined}>
      <Icon />
      <span>{children}</span>
    </div>
  )
}

function HoursLine() {
  return (
    <div className={`${styles.line} ${styles.lineMulti}`}>
      <ClockIcon />
      <span>
        {HOURS_LINES.map((text, index) => (
          <span key={text}>
            {text}
            {index < HOURS_LINES.length - 1 && <br />}
          </span>
        ))}
      </span>
    </div>
  )
}

export default function Footer() {
  return (
    <>
      <div className={styles.footerNote}>
        Dados sincronizados com a equipe de TI em tempo real via Supabase
      </div>
      <div className={styles.siteFooter}>
        <div className={styles.grid}>
          <BrandCol
            word="MADVILLE"
            social={[
              {
                Icon: FacebookIcon,
                href: 'https://www.facebook.com/madvillegmad/?locale=pt_BR',
                title: 'Facebook',
              },
              {
                Icon: InstagramIcon,
                href: 'https://www.instagram.com/gmadmadville/',
                title: 'Instagram',
              },
              {
                Icon: LinkedInIcon,
                href: 'https://br.linkedin.com/company/gmad-madville',
                title: 'LinkedIn',
              },
            ]}
          />
          <div className={styles.col}>
            <div className={styles.unitLabel}>Madville</div>
            <FooterLine Icon={PhoneIcon}>(47) 3441-0000</FooterLine>
            <FooterLine Icon={MailIcon} gapAfter>
              madville@madville.com.br
            </FooterLine>
            <FooterLine Icon={MailIcon}>sac@madville.com.br</FooterLine>
            <FooterLine Icon={PhoneIcon}>(47) 99251-0658</FooterLine>
          </div>
          <div className={styles.col}>
            <HiddenUnitLabel />
            <HoursLine />
          </div>

          <div className={styles.dividerV} />

          <BrandCol
            word="CURITIBA"
            social={[
              {
                Icon: FacebookIcon,
                href: 'https://www.facebook.com/gmadcuritiba/?locale=pt_BR',
                title: 'Facebook',
              },
              {
                Icon: InstagramIcon,
                href: 'https://www.instagram.com/gmadcuritiba/',
                title: 'Instagram',
              },
            ]}
          />
          <div className={styles.col}>
            <div className={styles.unitLabel}>GMAD Curitiba</div>
            <FooterLine Icon={PhoneIcon}>(41) 3535-3700</FooterLine>
            <FooterLine Icon={PhoneIcon} gapAfter>
              (41) 99839-0228
            </FooterLine>
            <HoursLine />
          </div>
        </div>
      </div>
    </>
  )
}
