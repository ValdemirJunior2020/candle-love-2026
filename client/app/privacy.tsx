import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandMark } from '@/components/BrandMark';
import { Screen } from '@/components/Screen';
import { colors, radius } from '@/constants/theme';
import { appConfig } from '@/services/config';

type PolicySectionProps = {
  title: string;
  children: React.ReactNode;
};

function PolicySection({
  title,
  children,
}: PolicySectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>

      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );
}

function Paragraph({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Text style={styles.paragraph}>{children}</Text>;
}

function Bullet({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletSymbol}>•</Text>

      <Text style={styles.bulletText}>
        {children}
      </Text>
    </View>
  );
}

export default function PrivacyPolicyScreen() {
  const openSupportEmail = async () => {
    const subject = encodeURIComponent(
      'Candle Love Privacy Question',
    );

    const emailUrl =
      `mailto:${appConfig.supportEmail}?subject=${subject}`;

    const supported = await Linking.canOpenURL(emailUrl);

    if (supported) {
      await Linking.openURL(emailUrl);
    }
  };

  return (
    <Screen contentStyle={styles.page}>
      <BrandMark
        compact
        showTagline
        style={styles.brand}
      />

      <View style={styles.hero}>
        <Text style={styles.heroIcon}>🛡️</Text>

        <View style={styles.heroText}>
          <Text style={styles.title}>Privacy Policy</Text>

          <Text style={styles.updated}>
            Last updated: July 18, 2026
          </Text>
        </View>
      </View>

      <View style={styles.introduction}>
        <Text style={styles.introductionTitle}>
          Your privacy matters
        </Text>

        <Text style={styles.introductionText}>
          Candle Love is designed to help adults create meaningful
          connections while giving them control over their personal
          information.
        </Text>
      </View>

      <PolicySection title="1. About this policy">
        <Paragraph>
          This Privacy Policy explains what information Candle Love
          collects, how we use it, when it may be shared, and the
          choices available to you.
        </Paragraph>

        <Paragraph>
          By creating an account or using Candle Love, you acknowledge
          the practices described in this policy.
        </Paragraph>
      </PolicySection>

      <PolicySection title="2. Information we collect">
        <Paragraph>
          We collect information you provide directly and information
          created when you use the app.
        </Paragraph>

        <Bullet>
          Account information, including your name, email address,
          encrypted password, age, and account status.
        </Bullet>

        <Bullet>
          Profile information, including your biography, city,
          interests, dating preferences, and other information you
          choose to share.
        </Bullet>

        <Bullet>
          Profile photos and other content you upload.
        </Bullet>

        <Bullet>
          Your likes, passes, matches, conversations, messages, gifts,
          blocks, and reports.
        </Bullet>

        <Bullet>
          Purchase and wallet information associated with Sparks,
          subscriptions, or digital gifts.
        </Bullet>

        <Bullet>
          Technical information such as device type, operating system,
          app version, IP address, login sessions, and error logs.
        </Bullet>
      </PolicySection>

      <PolicySection title="3. Profile photos">
        <Paragraph>
          Candle Love allows members to upload between two and six
          profile photos. Your selected main photo and other profile
          photos may be visible to other Candle Love members.
        </Paragraph>

        <Paragraph>
          Do not upload photos containing private documents, contact
          information, children by themselves, illegal content, or
          content you do not have permission to use.
        </Paragraph>

        <Paragraph>
          Photos may be reviewed when they are reported, when required
          for safety enforcement, or when necessary to investigate
          possible violations of our community rules.
        </Paragraph>
      </PolicySection>

      <PolicySection title="4. How we use information">
        <Bullet>
          Create and maintain your Candle Love account.
        </Bullet>

        <Bullet>
          Display your profile to potential matches.
        </Bullet>

        <Bullet>
          Recommend profiles and create matches based on member
          activity and preferences.
        </Bullet>

        <Bullet>
          Deliver messages, gifts, notifications, and account
          services.
        </Bullet>

        <Bullet>
          Process purchases and maintain Spark wallet records.
        </Bullet>

        <Bullet>
          Detect fraud, spam, abuse, impersonation, and unsafe
          behavior.
        </Bullet>

        <Bullet>
          Investigate reports and enforce our Terms of Service and
          community standards.
        </Bullet>

        <Bullet>
          Improve app performance, reliability, accessibility, and
          member experience.
        </Bullet>
      </PolicySection>

      <PolicySection title="5. Information visible to other members">
        <Paragraph>
          Other members may see information you place on your public
          profile, including:
        </Paragraph>

        <Bullet>Your name and age.</Bullet>
        <Bullet>Your city or general location.</Bullet>
        <Bullet>Your biography and interests.</Bullet>
        <Bullet>Your profile photos.</Bullet>
        <Bullet>Your verification or trust indicators.</Bullet>

        <Paragraph>
          Private messages are intended for the people participating
          in the conversation. Messages may be reviewed when reported
          for safety reasons or when legally required.
        </Paragraph>
      </PolicySection>

      <PolicySection title="6. Location information">
        <Paragraph>
          Candle Love may use the city or general location you provide
          to help recommend relevant profiles.
        </Paragraph>

        <Paragraph>
          The current version of Candle Love does not require
          continuous background GPS tracking. You should avoid placing
          your home address or precise location in your public profile.
        </Paragraph>
      </PolicySection>

      <PolicySection title="7. Payments">
        <Paragraph>
          Payments may be handled by third-party payment providers,
          including Apple, Google, Stripe, or RevenueCat.
        </Paragraph>

        <Paragraph>
          Candle Love does not directly store your complete credit-card
          number. Payment providers may collect and process information
          according to their own privacy policies.
        </Paragraph>
      </PolicySection>

      <PolicySection title="8. How information may be shared">
        <Paragraph>
          We may share information only when reasonably necessary for
          the following purposes:
        </Paragraph>

        <Bullet>
          With other members, based on the profile and content you
          choose to make visible.
        </Bullet>

        <Bullet>
          With service providers that help operate hosting,
          databases, authentication, payments, messaging, analytics,
          backups, security, or customer support.
        </Bullet>

        <Bullet>
          To protect the rights, safety, and security of Candle Love,
          our members, or other people.
        </Bullet>

        <Bullet>
          When required by law, court order, subpoena, or valid
          governmental request.
        </Bullet>

        <Bullet>
          As part of a merger, acquisition, financing, restructuring,
          or sale of all or part of the business.
        </Bullet>

        <Bullet>
          When you provide clear permission for a specific disclosure.
        </Bullet>

        <Paragraph>
          Candle Love does not currently sell personal information for
          money or use profile information for third-party behavioral
          advertising.
        </Paragraph>
      </PolicySection>

      <PolicySection title="9. Safety, reports, and blocking">
        <Paragraph>
          Members can block or report other accounts. Reports may
          include the reported profile, messages, photos, account
          activity, and the reason for the report.
        </Paragraph>

        <Paragraph>
          We may preserve information connected to a safety report
          while an investigation is active or when retention is
          necessary to prevent repeated abuse.
        </Paragraph>
      </PolicySection>

      <PolicySection title="10. Data retention">
        <Paragraph>
          We retain information while your account is active and for
          as long as reasonably necessary to provide the service,
          maintain security, comply with legal obligations, resolve
          disputes, and enforce agreements.
        </Paragraph>

        <Paragraph>
          Some information may remain temporarily in secure backups
          after deletion. Limited records may also be retained when
          required for fraud prevention, safety, accounting, or legal
          compliance.
        </Paragraph>
      </PolicySection>

      <PolicySection title="11. Account deletion">
        <Paragraph>
          You may request account deletion from:
        </Paragraph>

        <View style={styles.pathBox}>
          <Text style={styles.pathText}>
            Profile → Privacy and account → Delete account
          </Text>
        </View>

        <Paragraph>
          Deleting your account removes you from discovery, revokes
          active sessions, and begins the deletion or anonymization of
          your profile information.
        </Paragraph>

        <Paragraph>
          Messages already delivered to another member may remain
          visible in that member&apos;s conversation history where
          legally permitted.
        </Paragraph>
      </PolicySection>

      <PolicySection title="12. Security">
        <Paragraph>
          We use reasonable technical and organizational safeguards,
          including password hashing, authenticated sessions, database
          access controls, restricted storage, and encrypted network
          connections where available.
        </Paragraph>

        <Paragraph>
          No online service can guarantee absolute security. Use a
          unique password and do not share your account credentials.
        </Paragraph>
      </PolicySection>

      <PolicySection title="13. Age requirement">
        <Paragraph>
          Candle Love is intended only for adults who are at least 18
          years old. We do not knowingly allow children to create
          accounts.
        </Paragraph>

        <Paragraph>
          Contact us immediately if you believe a person under 18 is
          using Candle Love.
        </Paragraph>
      </PolicySection>

      <PolicySection title="14. Your privacy choices">
        <Bullet>
          Edit your profile information and photos.
        </Bullet>

        <Bullet>
          Choose what optional information you place on your profile.
        </Bullet>

        <Bullet>
          Block or report other members.
        </Bullet>

        <Bullet>
          Sign out and revoke your current session.
        </Bullet>

        <Bullet>
          Delete your account from the Privacy and Account screen.
        </Bullet>

        <Bullet>
          Contact us to ask questions about your personal information.
        </Bullet>
      </PolicySection>

      <PolicySection title="15. Changes to this policy">
        <Paragraph>
          We may update this policy when Candle Love changes or when
          legal and safety requirements change.
        </Paragraph>

        <Paragraph>
          The updated date at the top of this page will show when the
          policy was most recently revised. Material changes may also
          be communicated inside the app.
        </Paragraph>
      </PolicySection>

      <PolicySection title="16. Contact us">
        <Paragraph>
          Contact Candle Love with privacy questions, account-deletion
          concerns, or requests involving your personal information.
        </Paragraph>

        <Pressable
          accessibilityRole="link"
          onPress={openSupportEmail}
          style={({ pressed }) => [
            styles.contactButton,
            pressed && styles.contactButtonPressed,
          ]}
        >
          <Text style={styles.contactLabel}>
            Privacy support email
          </Text>

          <Text style={styles.contactEmail}>
            {appConfig.supportEmail}
          </Text>
        </Pressable>
      </PolicySection>

      <View style={styles.footer}>
        <Text style={styles.footerBrand}>Candle Love</Text>

        <Text style={styles.footerText}>
          Light a candle. Find real love.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 18,
    paddingBottom: 80,
    gap: 16,
  },

  brand: {
    alignSelf: 'flex-start',
  },

  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 20,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },

  heroIcon: {
    fontSize: 36,
  },

  heroText: {
    flex: 1,
    gap: 3,
  },

  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
  },

  updated: {
    color: colors.muted,
    fontSize: 13,
  },

  introduction: {
    padding: 18,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.goldDark,
    backgroundColor: '#241508',
    gap: 8,
  },

  introductionTitle: {
    color: colors.goldBright,
    fontSize: 20,
    fontWeight: '900',
  },

  introductionText: {
    color: colors.cream,
    fontSize: 15,
    lineHeight: 23,
  },

  section: {
    padding: 18,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    gap: 12,
  },

  sectionTitle: {
    color: colors.goldBright,
    fontSize: 19,
    fontWeight: '900',
    lineHeight: 25,
  },

  sectionContent: {
    gap: 11,
  },

  paragraph: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 22,
  },

  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },

  bulletSymbol: {
    color: colors.gold,
    fontSize: 20,
    lineHeight: 22,
  },

  bulletText: {
    flex: 1,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 22,
  },

  pathBox: {
    padding: 14,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },

  pathText: {
    color: colors.goldBright,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },

  contactButton: {
    padding: 16,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: colors.surfaceAlt,
    gap: 4,
  },

  contactButtonPressed: {
    opacity: 0.75,
  },

  contactLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  contactEmail: {
    color: colors.goldBright,
    fontSize: 16,
    fontWeight: '900',
  },

  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 4,
  },

  footerBrand: {
    color: colors.goldBright,
    fontSize: 22,
    fontWeight: '900',
  },

  footerText: {
    color: colors.muted,
    fontSize: 13,
  },
});