import type { ReactNode } from "react";
import {
  MdOutlineDangerous,
  MdOutlineLightbulb,
  MdOutlineVerified,
} from "react-icons/md";
import { Dialog } from "./Dialog";
import { Button } from "./Button";

export enum ModalStatusType {
  Correct = "correct",
  Close = "close",
  Incorrect = "incorrect",
  Closed = "closed",
}

type Props = {
  showModal: `${ModalStatusType}`;
  setShowModal: React.Dispatch<React.SetStateAction<ModalStatusType>>;
  hint?: ReactNode;
};
export function RightWrongModal({ showModal, setShowModal, hint }: Props) {
  return (
    <Dialog
      open={showModal !== ModalStatusType.Closed}
      onToggle={(open) => !open && setShowModal(ModalStatusType.Closed)}
    >
      <div className="flex flex-col items-center px-4 py-3 sm:px-6">
        {showModal === ModalStatusType.Correct ? (
          <>
            <MdOutlineVerified size={48} className="text-teal-600 mb-4" />
            <span className="mb-2">You got it right!</span>
            <span className="text-center">
              Share your solution with the community!{" "}
              <a
                href="https://github.com/dalurness/winter-code-fest#once-you-have-finished-a-question"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-teal-600"
              >
                Submit a PR
              </a>{" "}
              to add it to the repo.
            </span>
          </>
        ) : showModal === ModalStatusType.Close ? (
          <>
            <MdOutlineLightbulb size={48} className="text-yellow-600 mb-4" />
            <span className="mb-2">That's close!</span>
            <div className="text-center *:mb-2">{hint}</div>
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
          {showModal === ModalStatusType.Correct ? "Yay!" : "Try again"}
        </Button>
      </div>
    </Dialog>
  );
}
