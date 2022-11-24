import React from "react";
import AppViews from "./views/AppViews";
import DeployerViews from "./views/DeployerViews";
import AttacherViews from "./views/AttacherViews";
import { renderDOM, renderView } from "./views/render";
import "./index.css";
import * as backend from "./build/index.main.mjs";
import { loadStdlib } from "@reach-sh/stdlib";
import { ALGO_WalletConnect as WalletConnect } from "@reach-sh/stdlib";

const reach = loadStdlib(process.env);

reach.setWalletFallback(
  reach.walletFallback({
    providerEnv: "TestNet",
    WalletConnect,
  })
);

const handToInt = { ROCK: 1, SPOCK: 2, PAPER: 3, LIZARD: 4, SCISSORS: 5 };
const intToOutcome = ["Draw!", "Sheldon wins!", "Leonard Wins!"];
const { standardUnit } = reach;
const defaults = {
  defaultFundAmt: "10",
  defaultWager: "5",
  defaultRounds: "3",
  standardUnit,
};

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = { view: "ConnectAccount", ...defaults };
  }
  async componentDidMount() {
    const acc = await reach.getDefaultAccount();
    const balAtomic = await reach.balanceOf(acc);
    const bal = reach.formatCurrency(balAtomic, 4);
    this.setState({ acc, bal });
    if (await reach.canFundFromFaucet()) {
      this.setState({ view: "FundAccount" });
    } else {
      this.setState({ view: "DeployerOrAttacher" });
    }
  }
  async fundAccount(fundAmount) {
    await reach.fundFromFaucet(this.state.acc, reach.parseCurrency(fundAmount));
    this.setState({ view: "DeployerOrAttacher" });
  }
  async skipFundAccount() {
    this.setState({ view: "DeployerOrAttacher" });
  }
  selectAttacher() {
    this.setState({ view: "Wrapper", ContentView: Attacher });
  }
  selectDeployer() {
    this.setState({ view: "Wrapper", ContentView: Deployer });
  }
  render() {
    return renderView(this, AppViews);
  }
}

class Player extends React.Component {
  random() {
    return reach.hasRandom.random();
  }
  async getHand() {
    // Fun([], UInt)
    const hand = await new Promise((resolveHandP) => {
      this.setState({ view: "GetHand", playable: true, resolveHandP });
    });
    this.setState({ view: "WaitingForResults", hand });
    return handToInt[hand];
  }
  seeOutcome(i) {
    this.setState({ view: "Done", outcome: intToOutcome[i] });
  }
  seeOutcomeRounds(i) {
    this.setState({ view: "RoundDone", outcome: intToOutcome[i] });
  }
  informTimeout() {
    this.setState({ view: "Timeout" });
  }
  playHand(hand) {
    this.state.resolveHandP(hand);
  }
}

class Deployer extends Player {
  constructor(props) {
    super(props);
    this.state = { view: "SetWager" };
  }
  setWager(wager) {
    this.setState({ view: "setRounds", wager });
  }
  setRounds(rounds) {
    this.setState({ view: "Deploy", rounds });
  }
  async deploy() {
    const ctc = this.props.acc.contract(backend);
    this.setState({ view: "Deploying", ctc });
    this.wager = reach.parseCurrency(this.state.wager); // UInt
    this.rounds = parseInt(this.state.rounds);
    this.deadline = { ETH: 10, ALGO: 100, CFX: 1000 }[reach.connector]; // UInt
    backend.Alice(ctc, this);
    const ctcInfoStr = JSON.stringify(await ctc.getInfo(), null, 2);
    this.setState({ view: "WaitingForAttacher", ctcInfoStr });
  }
  render() {
    return renderView(this, DeployerViews);
  }
}
class Attacher extends Player {
  constructor(props) {
    super(props);
    this.state = { view: "Attach" };
  }
  attach(ctcInfoStr) {
    const ctc = this.props.acc.contract(backend, JSON.parse(ctcInfoStr));
    this.setState({ view: "Attaching" });
    backend.Bob(ctc, this);
  }
  async acceptWager(wagerAtomic) {
    // Fun([UInt], Null)
    const wager = reach.formatCurrency(wagerAtomic, 4);
    return await new Promise((resolveAcceptedP) => {
      this.setState({ view: "AcceptTerms", wager, resolveAcceptedP });
    });
  }
  termsAccepted() {
    this.state.resolveAcceptedP();
    this.setState({ view: "WaitingForTurn" });
  }
  render() {
    return renderView(this, AttacherViews);
  }
}

renderDOM(<App />);
