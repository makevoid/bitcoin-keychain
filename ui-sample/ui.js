/* global Keychain, hyperHTML */

const utils = {}
utils.formatDate = (date) => {
  return date.toLocaleDateString()
}

// ---

class Utils {

}

Utils.formatDate = (date) => (
  date.toLocaleDateString()
)

// ---

// const Keychain = require('KeyChain')

const keychain = new Keychain(localStorage)

const address = keychain.address
const privateKey = keychain.pvtKeyString

// ---

const CompOne = (user) => {
  return hyperHTML.wire(user, ':user-info')`
  <div class="user-info">
    <div class="user-info-name">
      ${user.name}
    </div>
  </div>`
}

const App = (props) => {
  return hyperHTML.wire(props, ':keychain')`
  <div class="address">
    <div class="comment-text">
      Address:
      ${props.address}
    </div>
    <div class="comment-text">
      Balance:
      ${props.balance}
    </div>
    <div>
      Private Key:
      ${props.privateKey}
    </div>
    <div>
      UTXOs:
      <ul>
        ${
          props.utxos.length == 0 ? [`No UTXO found.`] :
            props.utxos.map(utxo =>
            `
              <li>${utxo}</ul>
            `
        )}
      </ul>
    </div>
  </div>`
}

const state = {
  address: address,
  privateKey: privateKey,
  balance: "loading...",
  utxos: [],
}

const appElem = document.querySelector('.app')

hyperHTML.bind(appElem)`${
  App(state)
}`

;(async() => {
  const balance = keychain.balance()
  state.balance = balance
  App(state)

  const utxos = keychain.utxos()
  state.utxos = utxos
  App(state)
})()
