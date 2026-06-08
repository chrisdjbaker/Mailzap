import { useState } from "react";
import { getAssetUrl } from "../../../_shared/utils/utils";
import { useActions } from "../../../_shared/providers/actionsContext";
import { useLoggedIn } from "../../../_shared/providers/loggedInContext";

export function LoginPage() {
  const { signInWithGoogle, getEmailAccount } = useActions();
  const { setLoggedIn } = useLoggedIn();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setBusy(true);
    setError(null);
    try {
      // Identify the account from the active Gmail tab, then run the
      // interactive Google consent flow for it.
      const email = await getEmailAccount();
      await signInWithGoogle(email);
      setLoggedIn(true);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setError(
        message ||
          "Sign-in failed. Open a Gmail tab and make sure you're signed into Chrome.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div id="declutter-body" className="login">
      <img
        src={getAssetUrl("assets/logo.svg")}
        alt="MailZap Logo"
        height="200px"
      />
      <span style={{ textAlign: "center" }}>
        Sign in with the Google account
        <br />
        you want to use MailZap with.
      </span>
      <div style={{ height: "20px" }}></div>
      <button
        onClick={handleSignIn}
        disabled={busy}
        style={{
          backgroundColor: "#ffffff",
          color: "#4285f4",
          border: "none",
          borderRadius: "6px",
          padding: "10px 18px",
          fontSize: "0.9rem",
          fontWeight: 600,
          cursor: busy ? "default" : "pointer",
        }}
      >
        {busy ? "Signing in…" : "Sign in with Google"}
      </button>
      {error && (
        <p
          style={{
            textAlign: "center",
            fontSize: "0.75rem",
            marginTop: "12px",
            maxWidth: "260px",
            color: "#ffe0e0",
          }}
        >
          {error}
        </p>
      )}
      <div style={{ height: "40px" }}></div>
    </div>
  );
}
