import { MdOutlineDangerous, MdOutlineVerified } from "react-icons/md";
import { Dialog } from "./Dialog";
import { Button } from "./Button";

export enum ModalStatusType {
  Correct = "correct",
  Incorrect = "incorrect",
  Closed = "closed",
}

type Props = {
  showModal: `${ModalStatusType}`;
  setShowModal: React.Dispatch<React.SetStateAction<ModalStatusType>>;
};
export function RightWrongModal({ showModal, setShowModal }: Props) {
  return (
    <Dialog
      open={showModal !== ModalStatusType.Closed}
      onToggle={(open) => !open && setShowModal(ModalStatusType.Closed)}
    >
      <div className="flex flex-col items-center px-4 py-3 sm:px-6">
        {showModal === ModalStatusType.Correct ? (
          <>
            <MdOutlineVerified size={48} className="text-teal-600 mb-4" />
            <span>You got it right!</span>
          </>
        ) : (
          <>
            <MdOutlineDangerous size={48} className="text-red-600 mb-4" />
            <span>Uh oh! That's not right</span>
          </>
        )}
      </div>
      <div className="flex justify-end bg-yeti-light-3 mt-3 px-4 py-3 sm:px-6">
        <Button onClick={() => setShowModal(ModalStatusType.Closed)}>
          {showModal === "correct" ? "Yay!" : "Try again"}
        </Button>
      </div>
    </Dialog>
  );
}
