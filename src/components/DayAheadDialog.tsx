import { MdWarning } from "react-icons/md";
import { Dialog } from "./Dialog";
import { Button } from "./Button";
import { useEffect, useState } from "react";

type Props = {
  day: number;
};

/**
 * Show a dialog that you are viewing a day ahead of where you should be.
 * Allow them to view the day anyway, but they have to click the button directly
 */
export function DayAheadDialog({ day }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [reallyClose, setReallyClose] = useState(false);

  useEffect(() => {
    const now = new Date();

    // note: month is zero indexed
    // Always allow day 1 to be visible, but
    // block other days in december before they happen IRL.
    if (day > 1 && (now.getMonth() < 11 || now.getDate() < day)) {
      setShowModal(true);
    }
  }, []);

  return (
    <Dialog
      open={showModal}
      onToggle={(open) => {
        if (!reallyClose && !open) {
          setShowModal(false);
          setTimeout(() => setShowModal(true));
        }
      }}
    >
      <div className="flex flex-col items-center px-4 py-3 sm:px-6 text-center">
        <MdWarning size={48} className="text-yellow-600 mb-4" />
        <span>Wow you're really excited about Winter Code Fest!</span>
        <span>
          We recommend sticking to the calendar, but hey if you want to be a
          go-getter, then continue on!
        </span>
      </div>
      <div className="flex justify-end bg-yeti-light-3 mt-3 px-4 py-3 sm:px-6">
        <Button
          onClick={() => {
            setReallyClose(true);
            setShowModal(false);
          }}
        >
          Continue anyway!
        </Button>
      </div>
    </Dialog>
  );
}
