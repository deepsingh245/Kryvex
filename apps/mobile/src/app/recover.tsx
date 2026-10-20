import { useState } from "react";
import { Link } from "expo-router";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { secureLogger } from "@kryvex/security";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/Button";
import { useVault } from "@/providers/VaultProvider";

/**
 * Step 1 of docs/RECOVERY.md §3: request the recovery email. The link opens
 * apps/web's /recover/confirm; the user can finish there, or paste the link
 * into recover-confirm on this device.
 */
export default function RecoverScreen() {
  const { sendRecoveryEmail } = useVault();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      await sendRecoveryEmail(email.trim());
    } catch {
      // Never reveal whether the account exists — same posture as web.
      secureLogger.error("Failed to send recovery email");
    } finally {
      setSubmitting(false);
      setSent(true);
    }
  }

  if (sent) {
    return (
      <View style={styles.container}>
        <BrandLogo size={52} style={styles.brand} />
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.hint}>
          If an account exists for {email.trim()}, we&apos;ve sent a recovery
          link. Open it on any device to finish in the browser, or copy the link
          and paste it here.
        </Text>
        <Link href="/recover-confirm" style={styles.primaryLink}>
          I have the link — continue here
        </Link>
        <Link href="/sign-in" style={styles.link}>
          Back to sign in
        </Link>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BrandLogo size={52} style={styles.brand} />
      <Text style={styles.title}>Recover your vault</Text>
      <Text style={styles.hint}>
        You&apos;ll need access to your email and your Emergency Kit&apos;s
        Recovery Key. Neither one alone is enough.
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoComplete="email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <Button
        variant="primary"
        onPress={() => void handleSubmit()}
        disabled={submitting || !email.trim()}
      >
        {submitting ? "Sending…" : "Send recovery email"}
      </Button>
      <Link href="/recover-confirm" style={styles.link}>
        Already have a recovery link?
      </Link>
      <Link href="/sign-in" style={styles.link}>
        Back to sign in
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  brand: { alignSelf: "center", marginBottom: 12 },
  title: { fontSize: 20, fontWeight: "600" },
  hint: { fontSize: 14, color: "#6b7280", lineHeight: 20 },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 6,
    padding: 10,
  },
  primaryLink: {
    textAlign: "center",
    color: "#111827",
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  link: {
    textAlign: "center",
    color: "#6b7280",
    textDecorationLine: "underline",
  },
});
