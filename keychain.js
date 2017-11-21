const c = console
const bitcoin = require('bitcoinjs-lib')
const hash160 = bitcoin.crypto.hash160
const encodeWPKHOutput = bitcoin.script.witnessPubKeyHash.output.encode

require('es6-promise').polyfill()
require('isomorphic-fetch')

class BalanceInvalidAddressException extends Error {
  constructor(url) {
    super()
    this.message = `Invalid Address calling Balance url: ${url}`;
    this.name = 'BalanceInvalidAddressException';
  }
}

// segwit keychain
class Keychain {

  constructor(store) {
    this.storeKeyString = "__coinjs_keychain_private_key"
    this.apiRoot = "https://blockchain.info"
    this.balanceURL = `${this.apiRoot}/balance?active=`

    this.debug   = true
    // this.debug   = false
    this.store   = store || localStorage
    this.pvtKey  = this.loadOrGeneratePrivateKey()
    this.index   = 0
    this.address      = this.getAddress()
    this.addressOrig  = this.getAddressOrig()
    this.pvtKeyString = this.pvtKey.toWIF()
    this.logInit()
  }

  async balance() {
    const resp = await this.fetchJson(`${this.balanceURL}${this.address}`)
    const balance = this.balanceParse(resp)
    return resp
  }

  async balanceOrigAddr() {
    const resp = await this.fetchJson(`${this.balanceURL}${this.addressOrig}`)
    const balance = this.balanceParse(resp)
    return balance
  }

  balanceParse(balanceResp) {
    const value = Object.values(balanceResp)[0]
    const balance = value.final_balance
    return balance
  }

  async fetchJson(url) {
    const resp = await fetch(url)
    if (resp.status == 500) {
      const text = await resp.text()
      if (text == "Invalid Bitcoin Address") {
        throw new BalanceInvalidAddressException(url)
      }
    } else { // probably 200
      const json = await resp.json()
      if (this.debug) {
        c.log(json)
      }
      return json
    }
  }

  loadOrGeneratePrivateKey() {
    const key = this.storeKey()
    if (key && key != "") {
      return this.loadPrivateKey()
    } else {
      return this.generatePrivateKey()
    }
  }

  getAddress() {
    const pubKey = this.pvtKey.getPublicKeyBuffer()
    const scriptPubKey = encodeWPKHOutput(hash160(pubKey))
    return bitcoin.address.fromOutputScript(scriptPubKey)
  }

  getAddressOrig() {
    return this.pvtKey.getAddress()
  }

  generatePrivateKey() {
    return bitcoin.ECPair.makeRandom()
  }

  loadPrivateKey() {
    return bitcoin.ECPair.fromWIF(this.storeKey())
  }

  storeKey() {
    return this.store[this.storeKeyString]
  }

  logInit() {
    if (!this.debug) return
    // c.log("private key:", this.pvtKeyString)
    // c.log("address:", this.address)
    // c.log("address (non segwit):", this.addressOrig)
  }

}

module.exports = Keychain
