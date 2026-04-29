import { useEffect, useState } from "react";
import type { Session as SupabaseSession } from "@supabase/supabase-js";
import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { createBrilhioApiClient } from "@brilhio/api-client";
import type { AuthSession, DashboardSnapshot } from "@brilhio/contracts";
import { tokens } from "@brilhio/design-system";
import { formatScheduleTime, groupScheduledPostsByDay } from "@brilhio/utils";
import { supabase } from "./lib/supabase";

const mobileSupabase = supabase;
const devUserId = process.env.EXPO_PUBLIC_BRILHIO_DEV_USER_ID ?? null;
const devUserEmail = process.env.EXPO_PUBLIC_BRILHIO_DEV_USER_EMAIL ?? null;

const api = createBrilhioApiClient({
  baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:4000",
  getAccessToken: mobileSupabase
    ? async () =>
        (await mobileSupabase.auth.getSession()).data.session?.access_token ?? null
    : undefined,
  devUserId: mobileSupabase ? undefined : devUserId,
  devUserEmail: mobileSupabase ? undefined : devUserEmail,
});

export default function App() {
  const [authSession, setAuthSession] = useState<SupabaseSession | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [dashboard, setDashboard] = useState<DashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const supportsSupabaseAuth = Boolean(mobileSupabase);
  const supportsDevAuth = !supportsSupabaseAuth && Boolean(devUserId);

  async function refresh() {
    setLoading(true);
    setError(null);

    try {
      if (mobileSupabase) {
        const {
          data: { session: nextAuthSession },
        } = await mobileSupabase.auth.getSession();

        if (!nextAuthSession) {
          setAuthSession(null);
          setSession(null);
          setDashboard(null);
          return;
        }

        setAuthSession(nextAuthSession);
      }

      const sessionResponse = await api.getSession();
      setSession(sessionResponse.data);

      const dashboardResponse = await api.getDashboard();
      setDashboard(dashboardResponse.data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load the app.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    if (mobileSupabase) {
      void mobileSupabase.auth.getSession().then(({ data }) => {
        if (!active) {
          return;
        }

        setAuthSession(data.session);

        if (data.session) {
          void refresh();
        } else {
          setLoading(false);
        }
      });

      const {
        data: { subscription },
      } = mobileSupabase.auth.onAuthStateChange((_event, nextSession) => {
        if (!active) {
          return;
        }

        setAuthSession(nextSession);

        if (nextSession) {
          void refresh();
        } else {
          setSession(null);
          setDashboard(null);
          setLoading(false);
        }
      });

      return () => {
        active = false;
        subscription.unsubscribe();
      };
    }

    if (supportsDevAuth) {
      void refresh();
    } else {
      setLoading(false);
    }

    return () => {
      active = false;
    };
  }, [supportsDevAuth]);

  async function handleSignIn() {
    if (!mobileSupabase) {
      return;
    }

    setAuthBusy(true);
    setError(null);

    const { error: signInError } = await mobileSupabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
    } else {
      setNotice("Signed in.");
    }

    setAuthBusy(false);
  }

  async function handleSignUp() {
    if (!mobileSupabase) {
      return;
    }

    setAuthBusy(true);
    setError(null);

    const { error: signUpError } = await mobileSupabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: email.split("@")[0] ?? "Brilhio operator",
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
    } else {
      setNotice("Account created. Confirm the email if your project requires it.");
    }

    setAuthBusy(false);
  }

  async function handleSignOut() {
    if (!mobileSupabase) {
      return;
    }

    await mobileSupabase.auth.signOut();
    setNotice("Signed out.");
  }

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={tokens.colors.primary} />
        <Text style={styles.loadingText}>Loading Brilhio mobile...</Text>
      </View>
    );
  }

  if (supportsSupabaseAuth && !authSession) {
    return (
      <View style={styles.screen}>
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>Production auth enabled</Text>
            <Text style={styles.title}>Sign in to Brilhio mobile</Text>
            <Text style={styles.subtitle}>
              The mobile app now uses Supabase Auth and the same workspace-scoped
              API session model as the web app.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionEyebrow}>Email and password</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@company.com"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              secureTextEntry
              style={styles.input}
            />
            <View style={styles.buttonRow}>
              <Pressable
                style={[styles.button, styles.primaryButton]}
                onPress={() => {
                  void handleSignIn();
                }}
                disabled={authBusy}
              >
                <Text style={styles.primaryButtonLabel}>Sign in</Text>
              </Pressable>
              <Pressable
                style={[styles.button, styles.secondaryButton]}
                onPress={() => {
                  void handleSignUp();
                }}
                disabled={authBusy}
              >
                <Text style={styles.secondaryButtonLabel}>Create account</Text>
              </Pressable>
            </View>
            {error ? <Text style={styles.errorBody}>{error}</Text> : null}
          </View>
        </ScrollView>
      </View>
    );
  }

  if (!supportsSupabaseAuth && !supportsDevAuth) {
    return (
      <View style={styles.loadingScreen}>
        <StatusBar style="dark" />
        <Text style={styles.errorTitle}>Authentication is not configured</Text>
        <Text style={styles.errorBody}>
          Add `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`,
          or provide a dev user id for local fallback.
        </Text>
      </View>
    );
  }

  if (!session || !dashboard) {
    return (
      <View style={styles.loadingScreen}>
        <StatusBar style="dark" />
        <Text style={styles.errorTitle}>Could not load Brilhio mobile</Text>
        <Text style={styles.errorBody}>
          {error ?? "No workspace is available yet."}
        </Text>
      </View>
    );
  }

  const groupedSchedule = groupScheduledPostsByDay(dashboard.scheduledPosts);

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Native mobile v1</Text>
          <Text style={styles.title}>Brilhio on the go</Text>
          <Text style={styles.subtitle}>
            Review approvals, monitor publish health, and keep the weekly plan
            moving even when you are away from the desktop workspace.
          </Text>
          <View style={styles.heroMeta}>
            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>Profile</Text>
              <Text style={styles.metaValue}>
                {session?.profile.email ?? "Brilhio"}
              </Text>
            </View>
            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>Platforms</Text>
              <Text style={styles.metaValue}>{dashboard.socialAccounts.length}</Text>
            </View>
          </View>
          {mobileSupabase ? (
            <Pressable
              style={[styles.button, styles.secondaryButton]}
              onPress={() => {
                void handleSignOut();
              }}
            >
              <Text style={styles.secondaryButtonLabel}>Sign out</Text>
            </Pressable>
          ) : null}
        </View>

        {notice ? (
          <View style={styles.card}>
            <Text style={styles.sectionEyebrow}>Status</Text>
            <Text style={styles.rowBody}>{notice}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionEyebrow}>Connected providers</Text>
          {dashboard.socialAccounts.map((account) => (
            <View key={account.id} style={styles.rowCard}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{account.platform}</Text>
                <Text style={styles.rowBody}>{account.handle}</Text>
              </View>
              <Text style={styles.badge}>{account.status.replace("_", " ")}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionEyebrow}>Upcoming schedule</Text>
          {groupedSchedule.map((group) => (
            <View key={group.day} style={styles.groupBlock}>
              <Text style={styles.groupTitle}>{group.day}</Text>
              {group.items.map((item) => (
                <View key={item.id} style={styles.rowCard}>
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>{item.platform}</Text>
                    <Text style={styles.rowBody}>{item.platformCaption}</Text>
                  </View>
                  <Text style={styles.rowMeta}>
                    {formatScheduleTime(item.scheduledFor)}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionEyebrow}>Approvals</Text>
          {dashboard.approvalTasks.map((task) => (
            <View key={task.id} style={styles.rowCard}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{task.reviewerName}</Text>
                <Text style={styles.rowBody}>{task.note}</Text>
              </View>
              <Text style={styles.badge}>{task.status}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionEyebrow}>AI suggestions</Text>
          {dashboard.aiSuggestions.map((suggestion) => (
            <View key={suggestion.id} style={styles.ideaCard}>
              <Text style={styles.rowTitle}>{suggestion.title}</Text>
              <Text style={styles.rowBody}>{suggestion.body}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionEyebrow}>Jobs</Text>
          {dashboard.jobs.map((job) => (
            <View key={job.id} style={styles.rowCard}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{job.type}</Text>
                <Text style={styles.rowBody}>
                  {job.targetTable} - attempt {job.attemptCount}
                </Text>
              </View>
              <Text style={styles.badge}>{job.status}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 24,
    backgroundColor: tokens.colors.canvas,
  },
  loadingText: {
    color: tokens.colors.text,
    fontSize: 16,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: tokens.colors.text,
  },
  errorBody: {
    color: tokens.colors.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  screen: {
    flex: 1,
    backgroundColor: tokens.colors.canvas,
  },
  content: {
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: 68,
    paddingBottom: 40,
    gap: tokens.spacing.lg,
  },
  hero: {
    padding: tokens.spacing.xl,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.ink,
    gap: tokens.spacing.md,
  },
  eyebrow: {
    color: "#dbeafe",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  title: {
    color: "white",
    fontSize: 38,
    lineHeight: 40,
    fontWeight: "800",
  },
  subtitle: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 16,
    lineHeight: 24,
  },
  heroMeta: {
    flexDirection: "row",
    gap: tokens.spacing.md,
  },
  metaCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.md,
  },
  metaLabel: {
    color: "#cbd5e1",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  metaValue: {
    marginTop: 8,
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },
  card: {
    backgroundColor: tokens.colors.panel,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.lg,
    gap: tokens.spacing.md,
    shadowColor: "#08111f",
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  sectionEyebrow: {
    color: tokens.colors.muted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  input: {
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: "#d8d0c4",
    backgroundColor: "white",
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: tokens.colors.text,
  },
  buttonRow: {
    flexDirection: "row",
    gap: tokens.spacing.md,
    flexWrap: "wrap",
  },
  button: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {
    backgroundColor: tokens.colors.primary,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  primaryButtonLabel: {
    color: "white",
    fontWeight: "700",
  },
  secondaryButtonLabel: {
    color: "white",
    fontWeight: "700",
  },
  groupBlock: {
    gap: tokens.spacing.sm,
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: tokens.colors.text,
  },
  rowCard: {
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: tokens.spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: tokens.spacing.md,
  },
  rowText: {
    flex: 1,
    gap: 6,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: tokens.colors.text,
    textTransform: "capitalize",
  },
  rowBody: {
    color: tokens.colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  rowMeta: {
    color: tokens.colors.primaryDark,
    fontWeight: "700",
    alignSelf: "flex-start",
  },
  badge: {
    color: tokens.colors.primaryDark,
    fontWeight: "700",
    alignSelf: "flex-start",
    textTransform: "capitalize",
  },
  ideaCard: {
    borderRadius: tokens.radius.md,
    backgroundColor: "#fff7ed",
    padding: tokens.spacing.md,
    gap: 8,
  },
});
