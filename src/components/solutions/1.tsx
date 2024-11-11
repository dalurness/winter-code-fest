import { useState } from "react";
import { Button } from "../Button";
import { Dialog } from "../Dialog";
import { MdOutlineDangerous, MdOutlineVerified } from "react-icons/md";

export default function () {
  const [showModal, setShowModal] = useState<"correct" | "incorrect" | null>(
    null
  );

  function AnswerInput({
    fileName,
    solution,
  }: {
    fileName: string;
    solution: Record<string, number>;
  }) {
    const [input, setInput] = useState("");

    function checkSolution() {
      let correct = true;

      const counts: Record<string, number> = {};
      // parse input into lines and accumulate counts
      for (let line of input.trim().split("\n")) {
        line = line.trim();
        if (!line) {
          // allow empty lines
          continue;
        }

        const parts = line.match(/^(\d+)\s*:\s*(\d+)$/);
        if (!parts) {
          correct = false;
          break;
        }

        const country = parseInt(parts[1]!, 10);
        const count = parseInt(parts[2]!, 10);
        counts[country] = count;
      }

      if (correct) {
        // is parsing succeeded, check the values
        for (const [country, code] of Object.entries(solution)) {
          if (counts[country] !== code) {
            correct = false;
            break;
          }

          delete counts[country];
        }

        // check if any remaining keys in the user input
        if (correct && Object.keys(counts).length !== 0) {
          correct = false;
        }
      }

      setShowModal(correct ? "correct" : "incorrect");
    }

    return (
      <div className="flex flex-col mb-4">
        <label className="mb-2">
          <b>{fileName}</b>
          <textarea
            className="block p-4 rounded-lg border border-yeti-light resize max-w-full"
            placeholder={["1: 2", "2: 1", "6: 1", "34: 1", "53: 2"].join("\n")}
            value={input}
            onChange={(e) => setInput(e.currentTarget.value)}
            rows={3}
          ></textarea>
        </label>
        <Button onClick={checkSolution} className="mr-auto">
          Submit
        </Button>
      </div>
    );
  }

  return (
    <>
      <Dialog
        open={showModal != null}
        onToggle={(open) => !open && setShowModal(null)}
      >
        <div className="flex flex-col items-center px-4 py-3 sm:px-6">
          {showModal === "correct" ? (
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
          <Button onClick={() => setShowModal(null)}>
            {showModal === "correct" ? "Yay!" : "Try again"}
          </Button>
        </div>
      </Dialog>

      <h2 className="text-3xl mt-20 mb-5 border-b border-yeti-dark">
        Check Your Answers
      </h2>
      {solutions.map((s) => (
        <AnswerInput
          key={s.fileName}
          fileName={s.fileName}
          solution={s.counts}
        />
      ))}
    </>
  );
}

const solutions: {
  fileName: string;
  counts: Record<string, number>;
}[] = [
  {
    fileName: "letters.txt",
    counts: {
      1: 16,
      2: 9,
      3: 12,
      4: 14,
      5: 14,
      6: 20,
      7: 17,
      8: 20,
      9: 14,
      10: 22,
      11: 23,
      12: 16,
      13: 11,
      14: 14,
      15: 14,
      16: 12,
      17: 15,
      18: 13,
      19: 16,
      20: 13,
      21: 9,
      22: 22,
      23: 15,
      24: 18,
      25: 11,
      26: 16,
      27: 19,
      28: 10,
      29: 16,
      30: 12,
      31: 14,
      32: 12,
      33: 25,
      34: 11,
      35: 11,
      36: 9,
      37: 16,
      38: 15,
      39: 16,
      40: 19,
      41: 16,
      42: 22,
      43: 19,
      44: 15,
      45: 11,
      46: 19,
      47: 19,
      48: 11,
      49: 13,
      50: 12,
      51: 22,
      52: 15,
      53: 10,
      54: 21,
      55: 21,
      56: 16,
      57: 15,
      58: 15,
      59: 18,
      60: 12,
      61: 18,
      62: 10,
      63: 10,
      64: 15,
      65: 16,
      66: 17,
      67: 19,
      68: 17,
      69: 9,
      70: 14,
      71: 12,
      72: 12,
      73: 15,
      74: 9,
      75: 18,
      76: 14,
      77: 20,
      78: 11,
      79: 13,
      80: 19,
      81: 15,
      82: 17,
      83: 14,
      84: 22,
      85: 15,
      86: 12,
      87: 15,
      88: 11,
      89: 20,
      90: 10,
      91: 15,
      92: 17,
      93: 16,
      94: 14,
      95: 22,
      96: 14,
      97: 20,
      98: 12,
      99: 17,
      100: 11,
      101: 8,
      102: 14,
      103: 21,
      104: 9,
      105: 13,
      106: 16,
      107: 15,
      108: 13,
      109: 20,
      110: 11,
      111: 13,
      112: 19,
      113: 15,
      114: 15,
      115: 18,
      116: 24,
      117: 13,
      118: 21,
      119: 16,
      120: 13,
      121: 14,
      122: 14,
      123: 18,
      124: 11,
      125: 16,
      126: 17,
      127: 16,
      128: 16,
      129: 19,
      130: 18,
      131: 15,
      132: 12,
      133: 17,
      134: 9,
      135: 13,
      136: 19,
      137: 10,
      138: 18,
      139: 10,
      140: 17,
      141: 11,
      142: 24,
      143: 12,
      144: 19,
      145: 11,
      146: 23,
      147: 23,
      148: 21,
      149: 17,
      150: 14,
      151: 12,
      152: 13,
      153: 17,
      154: 15,
      155: 11,
      156: 9,
      157: 18,
      158: 16,
      159: 11,
      160: 14,
      161: 23,
      162: 17,
      163: 20,
      164: 10,
      165: 15,
      166: 12,
      167: 17,
      168: 12,
      169: 13,
      170: 16,
      171: 15,
      172: 19,
      173: 13,
      174: 23,
      175: 18,
      176: 22,
      177: 18,
      178: 17,
      179: 10,
      180: 17,
      181: 18,
      182: 15,
      183: 12,
      184: 17,
      185: 20,
      186: 15,
      187: 17,
      188: 6,
      189: 16,
      190: 18,
      191: 16,
      192: 16,
      193: 13,
      194: 14,
      195: 11,
      196: 12,
    },
  },
  {
    fileName: "letters_challenge.txt",
    counts: {
      1: 51189,
      2: 51131,
      3: 50970,
      4: 51047,
      5: 50891,
      6: 50987,
      7: 50732,
      8: 50832,
      9: 50984,
      10: 50832,
      11: 50927,
      12: 51355,
      13: 51127,
      14: 50774,
      15: 51287,
      16: 50695,
      17: 51057,
      18: 50829,
      19: 50941,
      20: 50758,
      21: 51258,
      22: 50774,
      23: 50969,
      24: 51326,
      25: 50926,
      26: 51454,
      27: 50831,
      28: 50653,
      29: 51116,
      30: 50899,
      31: 51078,
      32: 51424,
      33: 50716,
      34: 51022,
      35: 51032,
      36: 50899,
      37: 50942,
      38: 50785,
      39: 51069,
      40: 50897,
      41: 51161,
      42: 50905,
      43: 50682,
      44: 50830,
      45: 51008,
      46: 51112,
      47: 51288,
      48: 50937,
      49: 50981,
      50: 50960,
      51: 50866,
      52: 51109,
      53: 51183,
      54: 51235,
      55: 50834,
      56: 50679,
      57: 51190,
      58: 51106,
      59: 50909,
      60: 50895,
      61: 50868,
      62: 50948,
      63: 51109,
      64: 51356,
      65: 51136,
      66: 50996,
      67: 51088,
      68: 50754,
      69: 51157,
      70: 51098,
      71: 51163,
      72: 50650,
      73: 51056,
      74: 50770,
      75: 51644,
      76: 51035,
      77: 51405,
      78: 51175,
      79: 51318,
      80: 50715,
      81: 50887,
      82: 51017,
      83: 51015,
      84: 51053,
      85: 50963,
      86: 51117,
      87: 51163,
      88: 51250,
      89: 51330,
      90: 50645,
      91: 51464,
      92: 50781,
      93: 50843,
      94: 51050,
      95: 50936,
      96: 51183,
      97: 50891,
      98: 50923,
      99: 51310,
      100: 50893,
      101: 51111,
      102: 51289,
      103: 51194,
      104: 51464,
      105: 51123,
      106: 50772,
      107: 51112,
      108: 50749,
      109: 50917,
      110: 50993,
      111: 51171,
      112: 50949,
      113: 50747,
      114: 51313,
      115: 51321,
      116: 50907,
      117: 51005,
      118: 51134,
      119: 50609,
      120: 51578,
      121: 50846,
      122: 50792,
      123: 51235,
      124: 50936,
      125: 51521,
      126: 50890,
      127: 51517,
      128: 51230,
      129: 50540,
      130: 51235,
      131: 51028,
      132: 51375,
      133: 50852,
      134: 50975,
      135: 51232,
      136: 50950,
      137: 50926,
      138: 51387,
      139: 51110,
      140: 51004,
      141: 51015,
      142: 50706,
      143: 50663,
      144: 51016,
      145: 51416,
      146: 50687,
      147: 50640,
      148: 51078,
      149: 51027,
      150: 50776,
      151: 50966,
      152: 51146,
      153: 51216,
      154: 51283,
      155: 51188,
      156: 51071,
      157: 51075,
      158: 50928,
      159: 50914,
      160: 51505,
      161: 50812,
      162: 50925,
      163: 50614,
      164: 51471,
      165: 50997,
      166: 50757,
      167: 51048,
      168: 50844,
      169: 50942,
      170: 51214,
      171: 50969,
      172: 50820,
      173: 50737,
      174: 50678,
      175: 50864,
      176: 51060,
      177: 51216,
      178: 51057,
      179: 51152,
      180: 51102,
      181: 51002,
      182: 50843,
      183: 51383,
      184: 51044,
      185: 50925,
      186: 51234,
      187: 50796,
      188: 51089,
      189: 51148,
      190: 50777,
      191: 50693,
      192: 50952,
      193: 50808,
      194: 51169,
      195: 51000,
      196: 51063,
    },
  },
];
