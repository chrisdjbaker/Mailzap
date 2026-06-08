import "./senderLine.css";
import { useSelectedSenders } from "../providers/selectedSendersContext";
import { useActions } from "../../_shared/providers/actionsContext";
import { useModal } from "../providers/modalContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye } from "@fortawesome/free-solid-svg-icons";

interface SenderLineProps {
  senderName: string;
  senderEmail: string;
  senderCount: number;
  senderSize: string;
}

export const SenderLine = ({
  senderName,
  senderEmail,
  senderCount,
  senderSize,
}: SenderLineProps) => {
  const { selectedSenders, setSelectedSenders } = useSelectedSenders();
  const { searchEmailSenders } = useActions();
  const { setModal } = useModal();

  const selectLine = () => {
    setSelectedSenders((prev) => {
      const newSelected = { ...prev };
      if (!(senderEmail in newSelected)) {
        newSelected[senderEmail] = senderCount;
      } else {
        delete newSelected[senderEmail];
      }
      return newSelected;
    });
  };

  const openPreview = () => {
    setModal({
      type: "preview",
      extras: { email: senderEmail, name: senderName },
    });
  };

  return (
    <div
      className={
        selectedSenders[senderEmail]
          ? "sender-line sender-line-real selected"
          : "sender-line sender-line-real"
      }
    >
      <div className="begin">
        <div>
          <input
            type="checkbox"
            onChange={selectLine}
            checked={Boolean(selectedSenders[senderEmail])}
          />
        </div>
        <div className="sender-details">
          <span className="sender-name">{senderName}</span>
          <span
            className="sender-email"
            onClick={() => searchEmailSenders([senderEmail])}
          >
            {senderEmail}
          </span>
        </div>
      </div>
      <div className="sender-meta">
        <button
          className="preview-button"
          aria-label={`Preview emails from ${senderEmail}`}
          title="Preview recent emails"
          onClick={openPreview}
        >
          <FontAwesomeIcon icon={faEye} />
        </button>
        <div className="email-count">
          <span>{senderCount}</span>
          <span className="sender-size">{senderSize}</span>
        </div>
      </div>
    </div>
  );
};
