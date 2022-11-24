"reach 0.1";

const [isHand, ROCK, SPOCK, PAPER, LIZARD, SCISSORS] = makeEnum(5);
const [isOutcome, DRAW, S_WINS, L_WINS] = makeEnum(3);

const winner = (handSheldon, handLeonard) => {
  const tmp = (handSheldon + 1 - (handLeonard + 1) + 5) % 5;
  const res = tmp > 0 && tmp < 3 ? 1 : tmp > 0 && tmp > 2 ? 2 : 0;
  return res;
};

assert(winner(ROCK, PAPER) == L_WINS);
assert(winner(PAPER, ROCK) == S_WINS);
assert(winner(ROCK, ROCK) == DRAW);

forall(UInt, (handSheldon) =>
  forall(UInt, (handLeonard) =>
    assert(isOutcome(winner(handSheldon, handLeonard)))
  )
);

forall(UInt, (hand) => assert(winner(hand, hand) == DRAW));

const player = {
  ...hasRandom,
  getHand: Fun([], UInt),
  seeOutcome: Fun([UInt], Null),
  seeOutcomeRounds: Fun([UInt, UInt], Null),
  seeOutcomeDraw: Fun([], Null),
  informTimeout: Fun([], Null),
};

// participant interact interface
export const main = Reach.App(() => {
  const Sheldon = Participant("Sheldon", {
    // interact interface
    ...player,
    wager: UInt,
    deadline: UInt,
    rounds: UInt,
  });
  const Leonard = Participant("Leonard", {
    // interact interface
    ...player,
    acceptWager: Fun([UInt], Null),
  });
  init();

  const informTimeout = () => {
    each([Sheldon, Leonard], () => {
      interact.informTimeout();
    });
  };

  Sheldon.only(() => {
    const wager = declassify(interact.wager);
    const deadline = declassify(interact.deadline);
    const rounds = declassify(interact.rounds);
  });
  Sheldon.publish(wager, deadline, rounds).pay(wager);
  commit();

  const round = rounds % 2 == 0 ? rounds - 1 : rounds;

  Leonard.only(() => {
    interact.acceptWager(wager);
  });
  Leonard.pay(wager).timeout(relativeTime(deadline), () =>
    closeTo(Sheldon, informTimeout)
  );

  var [count, winS, winL] = [0, 0, 0];
  invariant(balance() == 2 * wager);
  while (count < round) {
    commit();
    Sheldon.publish();
    var outcome = 0;
    invariant(balance() == 2 * wager && isOutcome(outcome));
    while (outcome == 0) {
      commit();

      Sheldon.only(() => {
        const _handSheldon = interact.getHand();
        const [_commitSheldon, _saltSheldon] = makeCommitment(
          interact,
          _handSheldon
        );
        const commitSheldon = declassify(_commitSheldon);
      });
      Sheldon.publish(commitSheldon).timeout(relativeTime(deadline), () =>
        closeTo(Leonard, informTimeout)
      );
      commit();

      unknowable(Leonard, Sheldon(_handSheldon, _saltSheldon));

      Leonard.only(() => {
        const handLeonard = declassify(interact.getHand());
      });

      Leonard.publish(handLeonard).timeout(relativeTime(deadline), () =>
        closeTo(Sheldon, informTimeout)
      );
      commit();

      Sheldon.only(() => {
        const saltSheldon = declassify(_saltSheldon);
        const handSheldon = declassify(_handSheldon);
      });

      Sheldon.publish(saltSheldon, handSheldon).timeout(
        relativeTime(deadline),
        () => closeTo(Leonard, informTimeout)
      );
      checkCommitment(commitSheldon, saltSheldon, handSheldon);

      const winingNums = (handSheldon + 1 - (handLeonard + 1) + 5) % 5;
      if (winingNums == 0) {
        each([Sheldon, Leonard], () => {
          interact.seeOutcomeDraw();
        });
      }
      outcome =
        winingNums > 0 && winingNums < 3
          ? 1
          : winingNums > 0 && winingNums > 2
          ? 2
          : 0;
      continue;
    }
    each([Sheldon, Leonard], () => {
      interact.seeOutcomeRounds(outcome, round);
    });

    [count, winS, winL] = [
      count + 1,
      outcome == 1 ? winS + 1 : winS,
      outcome == 2 ? winL + 1 : winL,
    ];
    continue;
  }

  const [forSheldon, forLeonard] = winS > winL ? [2, 0] : [0, 2];
  transfer(forSheldon * wager).to(Sheldon);
  transfer(forLeonard * wager).to(Leonard);
  commit();

  const result = winS > winL ? 1 : 2;

  each([Sheldon, Leonard], () => {
    interact.seeOutcome(result);
  });
  exit();
});
