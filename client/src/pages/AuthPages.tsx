import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ArrowUpRight, Check, Loader2, MailCheck, ShieldAlert } from "lucide-react";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";

function safeNextTarget() {
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/projects";
}

function AuthShell({ eyebrow, title, description, children, footer }: { eyebrow: string; title: string; description: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#050506] text-[#F4F3EF] p-4 md:p-8 antialiased">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-[1440px] border border-white/10 bg-[#111214] lg:grid-cols-[minmax(0,1fr)_480px]">
        {/* Left Branding Panel */}
        <section className="hidden flex-col justify-between border-r border-white/10 p-12 lg:flex bg-[#050506]">
          <Link href="/" className="flex w-fit items-center gap-3">
            <span className="h-5 w-5 bg-[#FF4B23]" />
            <span className="text-xl font-black tracking-[-0.07em] text-[#F4F3EF]">LAYR</span>
          </Link>
          <div>
            <span className="mono text-xs font-bold uppercase tracking-[0.22em] text-[#FF4B23] bg-[#FF4B23]/10 border border-[#FF4B23]/30 px-3 py-1 inline-block">
              {eyebrow}
            </span>
            <h2 className="mt-4 max-w-xl text-5xl font-black leading-[0.94] tracking-[-0.06em] text-[#F4F3EF]">
              Reasoning that remains attached to the work.
            </h2>
            <p className="mt-6 max-w-lg text-sm leading-7 text-[#9B9B9B]">
              Your customer evidence, 2D sitemaps, user flows, and requirements remain strictly scoped to your private workspace.
            </p>
          </div>
          <div className="grid grid-cols-3 border-t border-white/10 pt-5 text-[10px] mono font-bold uppercase tracking-[0.18em] text-[#9B9B9B]">
            <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#FF4B23]" /> Evidence</span>
            <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#FF4B23]" /> 2D Canvas</span>
            <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#FF4B23]" /> NN/g Audit</span>
          </div>
        </section>

        {/* Right Form Container */}
        <section className="flex min-h-full flex-col p-8 md:p-14 bg-[#0D0E11]">
          <Link href="/" className="flex w-fit items-center gap-3 lg:hidden">
            <span className="h-5 w-5 bg-[#FF4B23]" />
            <span className="text-xl font-black tracking-[-0.07em] text-[#F4F3EF]">LAYR</span>
          </Link>

          <div className="my-auto py-8">
            <span className="mono text-xs font-bold uppercase tracking-[0.18em] text-[#FF4B23]">{eyebrow}</span>
            <h1 className="mt-3 text-4xl font-black leading-[0.94] tracking-[-0.06em] text-[#F4F3EF]">{title}</h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-[#9B9B9B]">{description}</p>
            <div className="mt-8">{children}</div>
          </div>

          {footer && <div className="border-t border-white/10 pt-5 text-xs leading-5 text-[#9B9B9B]">{footer}</div>}
        </section>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mono mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-[#94a3b8]">{label}</span>
      {children}
    </label>
  );
}

function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-center gap-2 border border-[#ef4444] bg-[#2e0f12] p-3 text-xs leading-5 text-[#fca5a5]">
      <ShieldAlert className="h-4 w-4 shrink-0 text-[#ef4444]" />
      <span>{message}</span>
    </div>
  );
}

export function LoginPage() {
  const [, setLocation] = useLocation();
  const { user, loading, refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const signIn = trpc.localAuth.signIn.useMutation();

  useEffect(() => {
    if (user && user.loginMethod !== "development-preview") setLocation(safeNextTarget());
  }, [user, setLocation]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      const result = await signIn.mutateAsync({ email, password });
      if (result.requiresVerification) {
        setLocation(result.debugVerificationUrl ?? `/verify-email?email=${encodeURIComponent(email)}`);
        return;
      }
      await refresh();
      setLocation(safeNextTarget());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We could not sign you in.");
    }
  };

  return (
    <AuthShell
      eyebrow="ACCOUNT ACCESS / 01"
      title="Return to your workspace."
      description="Sign in to access your evidence, sitemaps, user flows, and PRD specifications."
      footer={
        <>
          New to Layr?{" "}
          <Link href="/signup" className="font-bold text-white underline underline-offset-4 hover:text-[#ff4d00]">
            Create a private account
          </Link>.
        </>
      }
    >
      <form onSubmit={submit} className="space-y-5">
        <FormError message={error} />
        <Field label="Email Address">
          <Input
            required
            autoComplete="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-md border border-white/12 bg-white/5 text-[#F4F4F2] focus-visible:border-[#FF4A24] focus-visible:ring-[#FF4A24]"
          />
        </Field>
        <Field label="Password">
          <Input
            required
            autoComplete="current-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-md border border-white/12 bg-white/5 text-[#F4F4F2] focus-visible:border-[#FF4A24] focus-visible:ring-[#FF4A24]"
          />
        </Field>
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-xs font-semibold text-[#A5A7AA] underline underline-offset-3 hover:text-white">
            Forgot password?
          </Link>
        </div>
        <Button
          type="submit"
          disabled={loading || signIn.isPending}
          className="w-full rounded-md bg-[#FF4A24] py-6 text-xs font-bold uppercase tracking-[0.14em] text-[#0B0C0E] hover:bg-[#FF5C38] transition-all shadow-[0_0_15px_rgba(255,74,36,0.3)]"
        >
          {signIn.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Authenticating
            </>
          ) : (
            <>
              Sign in to Workspace <ArrowUpRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </form>
    </AuthShell>
  );
}

export function SignupPage() {
  const [, setLocation] = useLocation();
  const { user, loading } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const signUp = trpc.localAuth.signUp.useMutation();

  useEffect(() => {
    if (user && user.loginMethod !== "development-preview") setLocation("/projects");
  }, [user, setLocation]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      const result = await signUp.mutateAsync({ name: name || undefined, email, password });
      setLocation(result.debugVerificationUrl ?? `/verify-email?email=${encodeURIComponent(email)}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We could not create your account.");
    }
  };

  return (
    <AuthShell
      eyebrow="NEW WORKSPACE / 01"
      title="Begin with a clean context."
      description="Create a private account. Your projects, research evidence, and canvas graphs are strictly protected."
      footer={
        <>
          Already registered?{" "}
          <Link href="/login" className="font-bold text-white underline underline-offset-4 hover:text-[#ff4d00]">
            Sign in
          </Link>.
        </>
      }
    >
      <form onSubmit={submit} className="space-y-5">
        <FormError message={error} />
        <Field label="Full Name (optional)">
          <Input
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-none border-[#222536] bg-[#12131c] text-white focus-visible:border-[#ff4d00] focus-visible:ring-[#ff4d00]"
          />
        </Field>
        <Field label="Email Address">
          <Input
            required
            autoComplete="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-none border-[#222536] bg-[#12131c] text-white focus-visible:border-[#ff4d00] focus-visible:ring-[#ff4d00]"
          />
        </Field>
        <Field label="Password (Min 12 characters)">
          <Input
            required
            autoComplete="new-password"
            type="password"
            minLength={12}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-none border-[#222536] bg-[#12131c] text-white focus-visible:border-[#ff4d00] focus-visible:ring-[#ff4d00]"
          />
        </Field>
        <Button
          type="submit"
          disabled={loading || signUp.isPending}
          className="w-full rounded-none bg-[#ff4d00] py-6 text-xs font-bold uppercase tracking-[0.14em] text-white hover:bg-white hover:text-black transition-all shadow-[0_0_15px_rgba(255,77,0,0.4)]"
        >
          {signUp.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Account
            </>
          ) : (
            <>
              Create Private Workspace <ArrowUpRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </form>
    </AuthShell>
  );
}

export function VerifyEmailPage() {
  const [, setLocation] = useLocation();
  const query = useMemo(() => new URLSearchParams(window.location.search), []);
  const token = query.get("token") ?? "";
  const initialEmail = query.get("email") ?? "";
  const { refresh } = useAuth();

  const [email, setEmail] = useState(initialEmail);
  const [message, setMessage] = useState<string | null>(null);
  const [debugUrl, setDebugUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasValidTokenShape = token.length >= 32;
  const validate = trpc.localAuth.validateEmailVerification.useQuery({ token }, { enabled: hasValidTokenShape, retry: false });
  const verify = trpc.localAuth.verifyEmail.useMutation();
  const resend = trpc.localAuth.requestEmailVerification.useMutation();
  const invalid = Boolean(token) && (!hasValidTokenShape || (validate.isFetched && !validate.data?.valid));

  const submitVerification = async () => {
    setError(null);
    try {
      await verify.mutateAsync({ token });
      await refresh();
      setLocation("/projects");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "This verification link could not be used.");
    }
  };

  const submitResend = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setDebugUrl(null);
    setError(null);
    try {
      const result = await resend.mutateAsync({ email });
      setMessage("If a pending account exists for that address, a verification link has been prepared.");
      setDebugUrl(result.debugVerificationUrl ?? null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We could not prepare another verification link.");
    }
  };

  return (
    <AuthShell
      eyebrow="VERIFICATION / 02"
      title={token ? "Confirm your email address." : "Check your inbox."}
      description={token ? "Click to verify and unlock full access to your workspace." : "Verification ensures your research and design artifacts remain secured to your address."}
      footer={
        <Link href="/login" className="inline-flex items-center gap-2 font-bold text-white underline underline-offset-4 hover:text-[#ff4d00]">
          <ArrowLeft className="h-3.5 w-3.5" /> Return to sign in
        </Link>
      }
    >
      {token ? (
        validate.isLoading ? (
          <div className="flex items-center gap-3 text-sm text-[#94a3b8]">
            <Loader2 className="h-4 w-4 animate-spin text-[#ff4d00]" /> Validating verification token…
          </div>
        ) : invalid ? (
          <div className="border border-[#ef4444] bg-[#2e0f12] p-4 text-xs text-[#fca5a5]">
            <p className="font-bold">This verification link is invalid or has expired.</p>
            <Link href="/verify-email" className="mt-3 inline-flex items-center gap-2 font-bold underline underline-offset-3">
              Request a new link <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            <FormError message={error} />
            <div className="border border-[#222536] bg-[#12131c] p-4 text-sm text-[#94a3b8]">
              <MailCheck className="h-5 w-5 text-[#ff4d00]" />
              <p className="mt-3">Email ownership confirmed. Ready to activate workspace.</p>
            </div>
            <Button
              onClick={submitVerification}
              disabled={verify.isPending}
              className="w-full rounded-none bg-[#ff4d00] py-6 text-xs font-bold uppercase tracking-[0.14em] text-white hover:bg-white hover:text-black transition-all"
            >
              {verify.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />} Verify & Continue
            </Button>
          </div>
        )
      ) : (
        <form onSubmit={submitResend} className="space-y-5">
          <FormError message={error} />
          {message && (
            <div role="status" className="border border-[#222536] bg-[#12131c] p-4 text-sm text-[#94a3b8]">
              <p>{message}</p>
              {debugUrl && (
                <p className="mt-3 border-t border-[#222536] pt-3 text-xs">
                  <strong className="text-[#ff4d00]">Development preview link:</strong>{" "}
                  <Link href={debugUrl} className="break-all font-bold underline underline-offset-3 text-white">
                    Verify account now
                  </Link>
                </p>
              )}
            </div>
          )}
          <Field label="Email Address">
            <Input
              required
              autoComplete="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-none border-[#222536] bg-[#12131c] text-white focus-visible:border-[#ff4d00]"
            />
          </Field>
          <Button
            type="submit"
            disabled={resend.isPending}
            className="w-full rounded-none bg-[#ff4d00] py-6 text-xs font-bold uppercase tracking-[0.14em] text-white hover:bg-white hover:text-black transition-all"
          >
            {resend.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Resend Verification Link"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [debugUrl, setDebugUrl] = useState<string | null>(null);
  const requestReset = trpc.localAuth.requestPasswordReset.useMutation();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setDebugUrl(null);
    try {
      const result = await requestReset.mutateAsync({ email });
      setMessage("If an account exists for that address, a reset link has been prepared.");
      setDebugUrl(result.debugResetUrl ?? null);
    } catch {
      setMessage("If an account exists for that address, a reset link has been prepared.");
    }
  };

  return (
    <AuthShell
      eyebrow="RECOVERY / 02"
      title="Request password reset."
      description="Enter your email address. We will generate a secure reset link for your account."
      footer={
        <Link href="/login" className="inline-flex items-center gap-2 font-bold text-white underline underline-offset-4 hover:text-[#ff4d00]">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
        </Link>
      }
    >
      <form onSubmit={submit} className="space-y-5">
        {message && (
          <div role="status" className="border border-[#222536] bg-[#12131c] p-4 text-sm text-[#94a3b8]">
            <p>{message}</p>
            {debugUrl && (
              <p className="mt-3 border-t border-[#222536] pt-3 text-xs">
                <strong className="text-[#ff4d00]">Development preview link:</strong>{" "}
                <Link href={debugUrl} className="break-all font-bold underline underline-offset-3 text-white">
                  Reset password link
                </Link>
              </p>
            )}
          </div>
        )}
        <Field label="Email Address">
          <Input
            required
            autoComplete="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-none border-[#222536] bg-[#12131c] text-white focus-visible:border-[#ff4d00]"
          />
        </Field>
        <Button
          type="submit"
          disabled={requestReset.isPending}
          className="w-full rounded-none bg-[#ff4d00] py-6 text-xs font-bold uppercase tracking-[0.14em] text-white hover:bg-white hover:text-black transition-all"
        >
          {requestReset.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Request Reset Link"}
        </Button>
      </form>
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const token = useMemo(() => new URLSearchParams(window.location.search).get("token") ?? "", []);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);

  const hasValidTokenShape = token.length >= 32;
  const validate = trpc.localAuth.validatePasswordReset.useQuery({ token }, { enabled: hasValidTokenShape, retry: false });
  const reset = trpc.localAuth.resetPassword.useMutation();
  const invalid = !hasValidTokenShape || (validate.isFetched && !validate.data?.valid);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password !== confirmation) return setError("Passwords must match.");
    try {
      await reset.mutateAsync({ token, password });
      setLocation("/projects");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "This reset link could not be used.");
    }
  };

  return (
    <AuthShell
      eyebrow="RECOVERY / 03"
      title="Choose a new password."
      description="Enter a new password (min 12 characters). Prior sessions will be invalidated."
      footer={
        <Link href="/login" className="inline-flex items-center gap-2 font-bold text-white underline underline-offset-4 hover:text-[#ff4d00]">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
        </Link>
      }
    >
      {validate.isLoading ? (
        <div className="flex items-center gap-3 text-sm text-[#94a3b8]">
          <Loader2 className="h-4 w-4 animate-spin text-[#ff4d00]" /> Validating reset token…
        </div>
      ) : invalid ? (
        <div className="border border-[#ef4444] bg-[#2e0f12] p-4 text-xs text-[#fca5a5]">
          <p className="font-bold">This reset link is invalid or has expired.</p>
          <Link href="/forgot-password" className="mt-3 inline-flex items-center gap-2 font-bold underline underline-offset-3">
            Request a new link <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <FormError message={error} />
          <Field label="New Password">
            <Input
              required
              autoComplete="new-password"
              type="password"
              minLength={12}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-none border-[#222536] bg-[#12131c] text-white focus-visible:border-[#ff4d00]"
            />
          </Field>
          <Field label="Confirm New Password">
            <Input
              required
              autoComplete="new-password"
              type="password"
              minLength={12}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              className="rounded-none border-[#222536] bg-[#12131c] text-white focus-visible:border-[#ff4d00]"
            />
          </Field>
          <Button
            type="submit"
            disabled={reset.isPending}
            className="w-full rounded-none bg-[#ff4d00] py-6 text-xs font-bold uppercase tracking-[0.14em] text-white hover:bg-white hover:text-black transition-all"
          >
            {reset.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Update Password & Sign In"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
