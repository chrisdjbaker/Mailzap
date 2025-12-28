import { getAssetUrl } from "../../../_shared/utils/utils";

export function LoginPage() {
  return (
    <div id="declutter-body" className="login">
      <img
        src={getAssetUrl("assets/logo.svg")}
        alt="MailZap Logo"
        height="200px"
      />
      <span style={{ textAlign: "center" }}>
        Please sign in to Chrome with the
        <br />
        same Google account you want to
        <br />
        to use MailZap with.
      </span>
      <div style={{ height: "70px" }}></div>
    </div>
  );
}
