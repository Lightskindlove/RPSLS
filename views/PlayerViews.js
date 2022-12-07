import React from 'react'

const exports = {}

// Player views must be extended.
// It does not have its own Wrapper view.

exports.GetHand = class extends React.Component {
	render() {
		const { parent, playable, hand, outcome } = this.props

		return (
			<div>
				<br />
				{outcome === undefined
					? 'Make your first pick.'
					: outcome === 'Draw!'
					? 'Please pick again.'
					: 'Please pick a hand.'}
				<br />
				{!playable ? 'Please wait...' : ''}
				<br />
				<button
					disabled={!playable}
					onClick={() => parent.playHand('ROCK')}
				>
					Rock
				</button>
				<button
					disabled={!playable}
					onClick={() => parent.playHand('PAPER')}
				>
					Paper
				</button>
				<button
					disabled={!playable}
					onClick={() => parent.playHand('SCISSORS')}
				>
					Scissors
				</button>
				<button
					disabled={!playable}
					onClick={() => parent.playHand('LIZARD')}
				>
					Lizard
				</button>
				<button
					disabled={!playable}
					onClick={() => parent.playHand('SPOCK')}
				>
					Spock
				</button>
			</div>
		)
	}
}

exports.WaitingForResults = class extends React.Component {
	render() {
		return <div>Waiting for results...</div>
	}
}

exports.Done = class extends React.Component {
	render() {
		const { outcome } = this.props
		return (
			<div>
				Thank you for playing.
				<br />
				Going by total wins, the outcome of the game is:
				<br />
				{outcome || 'Unknown'}
			</div>
		)
	}
}

exports.RoundDone = class extends React.Component {
	render() {
		const { outcome } = this.props
		return (
			<div>
				The outcome of this round is:
				<br />
				{outcome || 'Unknown'}
				<br />
				The next round will begin shortly...
			</div>
		)
	}
}

exports.RoundDraw = class extends React.Component {
	render() {
		return (
			<div>
				It was a draw!
				<br />
				Wait while the other player makes a new pick.
			</div>
		)
	}
}

exports.Timeout = class extends React.Component {
	render() {
		return <div>There's been a timeout. (Someone took too long.)</div>
	}
}

export default exports