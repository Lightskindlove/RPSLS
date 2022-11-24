import { loadStdlib, ask } from "@reach-sh/stdlib";
import * as backend from "./build/index.main.mjs";
const stdlib = loadStdlib();

const isSheldon = await ask.ask("Are you Sheldon?", ask.yesno);

const who = isSheldon ? "Sheldon" : "Leonard";

console.log(`Starting RPSLS! as ${who}`);

let acc = null;

const createAcc = await ask.ask(
  `Would you like to create an account? (Only possible on devnet)`,
  ask.yesno
);

if (createAcc) {
  acc = await stdlib.newTestAccount(stdlib.parseCurrency(100));
} else {
  const seedPhrase = await ask.ask(`Please input your seed phrase`, (x) => x);
  await stdlib.newAccountFromMnemonic(seedPhrase);
}

let ctc = null;

if (isSheldon) {
  ctc = acc.contract(backend);
  ctc.getInfo().then((info) => {
    console.log(`The contract is deployed as: ${JSON.stringify(info)}`);
  });
} else {
  const info = await ask.ask(`Please paste the contract info:`, JSON.parse);
  ctc = acc.contract(backend, info);
}

const fmt = (x) => stdlib.formatCurrency(x, 4);
const getBalance = async () => fmt(await stdlib.balanceOf(acc));

const before = await getBalance();
console.log(`Your balance is: ${before}`);

const interact = { ...stdlib.hasRandom };

interact.informTimeout = () => {
  console.log(`There was a timeout`);
  process.exit(1);
};

if (isSheldon) {
  const amt = await ask.ask(
    `How much do you want to wager?`,
    stdlib.parseCurrency
  );
  const rounds = await ask.ask(`How many rounds do you want to play?`, (x) =>
    parseInt(x)
  );
  interact.wager = amt;
  interact.rounds = rounds;
  interact.deadline = {
    ETH: 100,
    ALGO: 100,
    CONFLUX: 1000,
  }[stdlib.connector];
} else {
  interact.acceptWager = async (amt) => {
    const accepted = await ask.ask(
      `Do you accept the wager of ${fmt(amt)}`,
      ask.yesno
    );
    if (!accepted) {
      process.exit(0);
    }
  };
}

const HAND = ["Rock", "Spock", "Paper", "Lizard", "Scissors"];
const HANDS = {
  Rock: 0,
  ROCK: 0,
  rock: 0,
  Spock: 1,
  SPOCK: 1,
  spock: 1,
  Paper: 2,
  PAPER: 2,
  paper: 2,
  Lizard: 3,
  LIZARD: 3,
  lizard: 3,
  Scissors: 4,
  SCISSORS: 4,
  scissors: 4,
};

interact.getHand = async () => {
  const hand = await ask.ask(
    `What hand do you want to play? Please choose either Rock, Paper, Scissors, Lizard or Spock,`,
    (x) => {
      const result = HANDS[x];
      if (result === undefined) {
        throw Error(
          `Not a valid hand: ${result}, Please choose either Rock, Paper, Scissors, Lizard or Spock`
        );
      }
      return result;
    }
  );
  console.log(`You played ${HAND[hand]}`);
  return hand;
};

const OUTCOME = ["Draw", "Sheldon wins", "Leonard wins"];
interact.seeOutcome = async (outcome) => {
  console.log(`The outcome of the game is: ${[OUTCOME[outcome]]}`);
};

interact.seeOutcomeRounds = async (outcome, round) => {
  console.log(`The outcome of round ${round} is: ${[OUTCOME[outcome]]}`);
};

interact.seeOutcomeDraw = async () => {
  console.log(`It was a draw! Play again...`);
};

const part = isSheldon ? ctc.p.Sheldon : ctc.p.Leonard;
await part(interact);

const after = await getBalance();

console.log(`Your balance is now ${after}`);

ask.done();
