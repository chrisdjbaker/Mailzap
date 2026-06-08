import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilter } from "@fortawesome/free-solid-svg-icons";
import { useModal } from "../providers/modalContext";
import "./reloadButton.css";

export const RulesButton = () => {
  const { setModal } = useModal();

  return (
    <button
      className="reload-button"
      aria-label="Auto-clean rules"
      title="Auto-clean rules"
      onClick={() => setModal({ type: "rules" })}
    >
      <FontAwesomeIcon icon={faFilter} className="i" />
    </button>
  );
};
