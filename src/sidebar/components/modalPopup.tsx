import "./modalPopup.css";
import { useEffect, useState } from "react";
import { useModal } from "../providers/modalContext";
import { useSelectedSenders } from "../providers/selectedSendersContext";
import { useSenders } from "../providers/sendersContext";
import { useActions } from "../../_shared/providers/actionsContext";
import { ToggleOption } from "./toggleOption";
import { useUnsubscribeFlow } from "../utils/unsubscribeFlow";
import { useLoggedIn } from "../../_shared/providers/loggedInContext";
import { formatBytes } from "../../_shared/utils/utils";
import { CleanRule, MessagePreview } from "../../_shared/types/types";

interface ConfirmProps {
  emailsNum: number;
  sendersNum: number;
}

/** Sums the stored size of the currently selected senders. */
function useSelectedSize(): number {
  const { selectedSenders } = useSelectedSenders();
  const { senders } = useSenders();
  return senders
    .filter((s) => s.email in selectedSenders)
    .reduce((sum, s) => sum + s.size, 0);
}

const UnsubscribeConfirm = ({ emailsNum, sendersNum }: ConfirmProps) => {
  const [deleteEmails, setDeleteEmails] = useState<boolean>(true);
  const [blockSenders, setBlockSenders] = useState<boolean>(false);

  const { searchEmailSenders } = useActions();
  const { selectedSenders } = useSelectedSenders();
  const { startUnsubscribeFlow } = useUnsubscribeFlow(
    deleteEmails,
    blockSenders,
  );

  const showEmails = () => {
    searchEmailSenders(Object.keys(selectedSenders));
  };

  return (
    <>
      <p>
        Are you sure you want to <b>unsubscribe</b> from <b>{sendersNum}</b>{" "}
        selected sender(s)?
      </p>

      <div className="toggle-options">
        <ToggleOption
          label={
            <>
              Delete <b>{emailsNum} email(s)</b> from selected senders
            </>
          }
          defaultChecked={true}
          onChange={(checked) => setDeleteEmails(checked)}
        />

        <ToggleOption
          label="Also block senders"
          defaultChecked={false}
          onChange={(checked) => setBlockSenders(checked)}
        />
      </div>

      <button className="secondary" onClick={showEmails}>
        Show all emails
      </button>
      <button className="primary" onClick={startUnsubscribeFlow}>
        Confirm
      </button>
    </>
  );
};

const UnsubscribePending = ({ subtype }: { subtype: string }) => {
  let message: string;
  switch (subtype) {
    case "working":
      message = "Unsubscribing from senders...";
      break;
    case "finding-link":
      message = "Finding unsubscribe links...";
      break;
    case "blocking":
      message = "Blocking sender...";
      break;
    default:
      message = "Processing...";
      break;
  }

  return (
    <>
      <p>{message}</p>
      <div style={{ height: "5px" }}></div>
      <div className="loader"></div>
    </>
  );
};

const UnsubscribeContinue = ({
  email,
  link,
  onContinue,
}: {
  email: string;
  link: string;
  onContinue: () => void;
}) => {
  const openLink = () => {
    window.open(link, "_blank");
  };
  return (
    <>
      <p>
        To stop getting messages from <b>{email}</b>, go to their website to
        unsubscribe.
      </p>
      <p className="note">
        Once you've finished on the website, click "Continue" to proceed.
      </p>

      <button className="primary" onClick={openLink}>
        Go to Website
      </button>
      <button className="secondary" onClick={onContinue}>
        Continue
      </button>
    </>
  );
};

const UnsubscribeError = ({
  email,
  onContinue,
}: {
  email: string;
  onContinue: () => void;
}) => {
  const { blockSender } = useActions();
  const { setModal } = useModal();

  const handleBlockSender = async () => {
    setModal({ action: "unsubscribe", type: "pending", subtype: "blocking" });
    await blockSender(email);
    onContinue(); // Continue to next sender after blocking
  };

  return (
    <>
      <p>
        Unable to unsubscribe from <b>{email}</b>.
      </p>
      <p>Block sender instead?</p>
      <button className="secondary" onClick={onContinue}>
        Don't block
      </button>
      <button className="primary" onClick={handleBlockSender}>
        Block
      </button>
    </>
  );
};

const UnsubscribeSuccess = () => {
  return (
    <>
      <p>✅ Success!</p>
      <p>You have been unsubscribed from selected senders.</p>
      <p className="note">
        Note: You may need to reload your browser to see changes.
      </p>
    </>
  );
};

const DeleteConfirm = ({ emailsNum, sendersNum }: ConfirmProps) => {
  const { searchEmailSenders, deleteSenders } = useActions();
  const { selectedSenders, setSelectedSenders } = useSelectedSenders();
  const { reloadSenders } = useSenders();
  const { setModal } = useModal();
  const { setLoggedIn } = useLoggedIn();
  const size = useSelectedSize();

  const showEmails = () => {
    searchEmailSenders(Object.keys(selectedSenders));
  };

  const deleteEmails = async () => {
    try {
      setModal({ action: "delete", type: "pending" });

      await deleteSenders(Object.keys(selectedSenders));
      for (const senderEmail in selectedSenders) {
        setSelectedSenders((prev) => {
          const newSelected = { ...prev };
          delete newSelected[senderEmail];
          return newSelected;
        });
      }

      setModal({ action: "delete", type: "success" });

      setTimeout(() => {
        reloadSenders();
      }, 1000);
    } catch (error: Error | any) {
      if (error.message == "The user did not approve access.") {
        setLoggedIn(false);
      }
    }
  };

  return (
    <>
      <p>
        Are you sure you want to <b>delete {emailsNum} email(s)</b> from{" "}
        <b>{sendersNum}</b> sender(s)?
      </p>
      <p className="note">
        This frees about <b>{formatBytes(size)}</b>. It will not block or
        unsubscribe. You can undo this right after.
      </p>

      <button className="secondary" onClick={showEmails}>
        Show all emails
      </button>
      <button className="primary" onClick={deleteEmails}>
        Confirm
      </button>
    </>
  );
};

const DeletePending = () => {
  return (
    <>
      <p>Deleting emails...</p>
      <div style={{ height: "5px" }}></div>
      <div className="loader"></div>
    </>
  );
};

const DeleteSuccess = () => {
  const { undoLastDelete } = useActions();
  const { reloadSenders } = useSenders();
  const { setModal } = useModal();
  const [undoing, setUndoing] = useState(false);
  const [undone, setUndone] = useState(false);

  const handleUndo = async () => {
    setUndoing(true);
    await undoLastDelete();
    setUndoing(false);
    setUndone(true);
    reloadSenders(true);
  };

  if (undone) {
    return (
      <>
        <p>↩️ Restored</p>
        <p>Your emails have been moved back to the inbox.</p>
        <button className="primary" onClick={() => setModal(null)}>
          Done
        </button>
      </>
    );
  }

  return (
    <>
      <p>✅ Success!</p>
      <p>Selected senders have been deleted.</p>
      <p className="note">
        Note: You may need to reload your browser to see changes.
      </p>
      <button className="secondary" onClick={handleUndo} disabled={undoing}>
        {undoing ? "Undoing…" : "Undo"}
      </button>
      <button className="primary" onClick={() => setModal(null)}>
        Done
      </button>
    </>
  );
};

const ArchiveConfirm = ({ emailsNum, sendersNum }: ConfirmProps) => {
  const { searchEmailSenders, archiveSenders } = useActions();
  const { selectedSenders, setSelectedSenders } = useSelectedSenders();
  const { reloadSenders } = useSenders();
  const { setModal } = useModal();
  const { setLoggedIn } = useLoggedIn();
  const size = useSelectedSize();

  const showEmails = () => searchEmailSenders(Object.keys(selectedSenders));

  const archive = async () => {
    try {
      setModal({ action: "archive", type: "pending" });
      await archiveSenders(Object.keys(selectedSenders));
      setSelectedSenders({});
      setModal({ action: "archive", type: "success" });
      setTimeout(() => reloadSenders(), 1000);
    } catch (error: Error | any) {
      if (error.message == "The user did not approve access.") {
        setLoggedIn(false);
      }
    }
  };

  return (
    <>
      <p>
        Archive <b>{emailsNum} email(s)</b> from <b>{sendersNum}</b> sender(s)?
      </p>
      <p className="note">
        This removes about <b>{formatBytes(size)}</b> of mail from your Inbox.
        Nothing is deleted — you can still find it in "All Mail".
      </p>
      <button className="secondary" onClick={showEmails}>
        Show all emails
      </button>
      <button className="primary" onClick={archive}>
        Confirm
      </button>
    </>
  );
};

const ArchivePending = () => (
  <>
    <p>Archiving emails...</p>
    <div style={{ height: "5px" }}></div>
    <div className="loader"></div>
  </>
);

const ArchiveSuccess = () => {
  const { setModal } = useModal();
  return (
    <>
      <p>✅ Success!</p>
      <p>Selected senders' emails have been archived.</p>
      <button className="primary" onClick={() => setModal(null)}>
        Done
      </button>
    </>
  );
};

const PreviewModal = ({ email, name }: { email: string; name: string }) => {
  const { getSenderPreview } = useActions();
  const { setModal } = useModal();
  const [messages, setMessages] = useState<MessagePreview[] | null>(null);

  useEffect(() => {
    let active = true;
    getSenderPreview(email, 10).then((m) => {
      if (active) setMessages(m);
    });
    return () => {
      active = false;
    };
  }, [email, getSenderPreview]);

  return (
    <>
      <p>
        Recent emails from <b>{name || email}</b>
      </p>
      {messages === null ? (
        <div className="loader"></div>
      ) : messages.length === 0 ? (
        <p className="note">No recent emails found.</p>
      ) : (
        <ul className="preview-list">
          {messages.map((m, i) => (
            <li key={i} className="preview-item">
              <span className="preview-subject">{m.subject}</span>
              <span className="preview-snippet">{m.snippet}</span>
            </li>
          ))}
        </ul>
      )}
      <button className="primary" onClick={() => setModal(null)}>
        Close
      </button>
    </>
  );
};

const RulesModal = () => {
  const { listRules, addRule, deleteRule } = useActions();
  const { selectedSenders } = useSelectedSenders();
  const { setModal } = useModal();
  const [rules, setRules] = useState<CleanRule[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => listRules().then(setRules);
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = Object.keys(selectedSenders);

  const createRules = async (action: "trash" | "archive") => {
    setBusy(true);
    for (const sender of selected) {
      await addRule(sender, action);
    }
    await load();
    setBusy(false);
  };

  const remove = async (id: string) => {
    setBusy(true);
    await deleteRule(id);
    await load();
    setBusy(false);
  };

  return (
    <>
      <p>Auto-clean rules</p>
      <p className="note">
        Rules run automatically in Gmail: incoming mail from these senders is
        trashed or archived for you.
      </p>

      {selected.length > 0 && (
        <div className="rules-add">
          <p>
            Create a rule for <b>{selected.length}</b> selected sender(s):
          </p>
          <button
            className="secondary"
            disabled={busy}
            onClick={() => createRules("archive")}
          >
            Auto-archive
          </button>
          <button
            className="primary"
            disabled={busy}
            onClick={() => createRules("trash")}
          >
            Auto-trash
          </button>
        </div>
      )}

      {rules === null ? (
        <div className="loader"></div>
      ) : rules.length === 0 ? (
        <p className="note">No rules yet.</p>
      ) : (
        <ul className="rules-list">
          {rules.map((rule) => (
            <li key={rule.id} className="rule-item">
              <span className="rule-text">
                <b>{rule.action}</b> {rule.sender}
              </span>
              <button
                className="rule-delete"
                disabled={busy}
                onClick={() => remove(rule.id)}
                aria-label={`Delete rule for ${rule.sender}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <button className="primary" onClick={() => setModal(null)}>
        Close
      </button>
    </>
  );
};

const NoSender = () => {
  const { setModal } = useModal();
  return (
    <>
      <p>Oops!</p>
      <p>You haven't selected a sender yet.</p>

      <div style={{ height: "20px" }}></div>

      <button className="primary" onClick={() => setModal(null)}>
        Go back
      </button>
    </>
  );
};

export const ModalPopup = () => {
  const { modal, setModal } = useModal();
  if (!modal) return null;

  const { action, type, subtype, extras } = modal;
  const id: string = action ? `${action}-${type}-modal` : `${type}-modal`;

  const handleBackgroundClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      setModal(null);
    }
  };

  const getChild = (): React.ReactNode => {
    switch (true) {
      case action === "unsubscribe" && type === "confirm":
        return (
          <UnsubscribeConfirm
            emailsNum={extras!.emailsNum}
            sendersNum={extras!.sendersNum}
          />
        );
      case action === "unsubscribe" && type === "pending":
        return <UnsubscribePending subtype={subtype!} />;
      case action === "unsubscribe" && type === "error":
        return (
          <UnsubscribeError
            email={extras!.email}
            onContinue={extras!.onContinue}
          />
        );
      case action === "unsubscribe" && type === "continue":
        return (
          <UnsubscribeContinue
            email={extras!.email}
            link={extras!.link}
            onContinue={extras!.onContinue}
          />
        );
      case action === "unsubscribe" && type === "success":
        return <UnsubscribeSuccess />;
      case action === "delete" && type === "confirm":
        return (
          <DeleteConfirm
            emailsNum={extras!.emailsNum}
            sendersNum={extras!.sendersNum}
          />
        );
      case action === "delete" && type === "pending":
        return <DeletePending />;
      case action === "delete" && type === "success":
        return <DeleteSuccess />;
      case action === "archive" && type === "confirm":
        return (
          <ArchiveConfirm
            emailsNum={extras!.emailsNum}
            sendersNum={extras!.sendersNum}
          />
        );
      case action === "archive" && type === "pending":
        return <ArchivePending />;
      case action === "archive" && type === "success":
        return <ArchiveSuccess />;
      case type === "preview":
        return <PreviewModal email={extras!.email} name={extras!.name} />;
      case type === "rules":
        return <RulesModal />;
      case type === "no-sender":
        return <NoSender />;
      default:
        return <></>;
    }
  };

  return (
    <div
      id={id}
      className="modal"
      style={{ display: "block" }}
      onClick={handleBackgroundClick}
    >
      <div className="modal-content">{getChild()}</div>
    </div>
  );
};
