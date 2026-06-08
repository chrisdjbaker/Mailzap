import "./actionButton.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBan,
  faTrash,
  faBoxArchive,
} from "@fortawesome/free-solid-svg-icons";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { useSelectedSenders } from "../providers/selectedSendersContext";
import { useModal } from "../providers/modalContext";

type ButtonId = "unsubscribe-button" | "delete-button" | "archive-button";

const CONFIG: Record<
  ButtonId,
  { text: string; icon: IconProp; action: "unsubscribe" | "delete" | "archive" }
> = {
  "unsubscribe-button": {
    text: "Unsubscribe",
    icon: faBan,
    action: "unsubscribe",
  },
  "delete-button": { text: "Delete", icon: faTrash, action: "delete" },
  "archive-button": {
    text: "Archive",
    icon: faBoxArchive,
    action: "archive",
  },
};

export const ActionButton = ({ id }: { id: ButtonId }) => {
  const { text, icon, action } = CONFIG[id];
  const { selectedSenders } = useSelectedSenders();
  const { setModal } = useModal();

  const handleClick = () => {
    const selectedSenderKeys: string[] = Object.keys(selectedSenders);
    if (selectedSenderKeys.length > 0) {
      setModal({
        action,
        type: "confirm",
        extras: {
          emailsNum: selectedSenderKeys.reduce(
            (sum, key) => sum + selectedSenders[key],
            0,
          ),
          sendersNum: selectedSenderKeys.length,
        },
      });
    } else {
      setModal({ type: "no-sender" });
    }
  };

  return (
    <button
      id={id}
      className="action-button"
      aria-label={text}
      onClick={handleClick}
    >
      <FontAwesomeIcon icon={icon} className="i" />
      {text}
    </button>
  );
};
