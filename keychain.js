'use strict'

const c = console
const bitcoin = require('bitcoinjs-lib')
const hash160 = bitcoin.crypto.hash160
const encodeWPKHOutput = bitcoin.script.witnessPubKeyHash.output.encode
const encodeScriptHash = bitcoin.script.scriptHash.output.encode

require('es6-promise').polyfill()
require('isomorphic-fetch')

class BalanceInvalidAddressException extends Error {
  constructor(url) {
    super()
    this.message = `Invalid Address calling Balance url: ${url}`
    this.name = 'BalanceInvalidAddressException'
  }
}

// segwit keychain
class Keychain {

  constructor(store) {
    this.storeKeyString = '__coinjs_keychain_private_key'
    this.apiRoot = 'https://api.blockcypher.com/v1/btc/main'
    // this.debug   = true
    this.debug   = false
    this.store   = store || localStorage
    this.pvtKey  = this.loadOrGeneratePrivateKey()
    this.index   = 0
    this.address      = this.getAddress()
    this.addressOrig  = this.getAddressOrig()
    this.pvtKeyString = this.pvtKey.toWIF()
    this.logInit()
  }

  balanceUrl(address) {
    return `${this.apiRoot}/addrs/${address}/balance`
  }

  async balance() {
    const url     = this.balanceUrl(this.address)
    const resp    = await this.fetchJson(url)
    const balance = this.balanceParse(resp)
    if (this.debug) {
      c.log('resp:',    resp) 
      c.log('balance:', balance)
    }
    return balance
  }

  async balanceOrigAddr() {
    const url     = this.balanceUrl(this.addressOrig)
    const resp    = await this.fetchJson(url)
    const balance = this.balanceParse(resp)
    return balance
  }

  balanceParse(balanceResp) {
    return balanceResp.final_balance
  }

  async fetchJson(url) {
    const resp = await fetch(url)
    if (resp.status == 500) {
      const text = await resp.text()
      if (text == 'Invalid Bitcoin Address') {
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
    if (key && key != '') {
      return this.loadPrivateKey()
    } else {
      return this.generatePrivateKey()
    }
  }

  getScriptPubKey() {
    const pubKey = this.pvtKey.getPublicKeyBuffer()
    return encodeWPKHOutput(hash160(pubKey))
  }

  getAddress() {
    const scriptPubKey = encodeScriptHash(hash160(this.getScriptPubKey()))
    return bitcoin.address.fromOutputScript(scriptPubKey)
  }

  getAddressBase() {
    return bitcoin.address.fromOutputScript(this.getScriptPubKey())
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

  send({to, amount}) {
    const transaction = this.buildTX({ to: to, amount: amount })
    const txHex = transaction.toHex()
    c.log('transaction: ', transaction)
    c.log('transaction (hex): ', txHex)
  }

  buildTX({to, amount}) {
    const unspent = {}
    const keyPair = this.pvtKey()
    const redeemScript = this.getScriptPubKey()
    c.log('to: ', to)
    c.log('amount: ', amount)

    const returnAddress = '1abc'
    const testnet = null
    const txb = new bitcoin.TransactionBuilder(testnet)
    txb.addInput(unspent.txId, unspent.vout)
    txb.addOutput(returnAddress, 4e4)
    txb.sign(0, keyPair, redeemScript, null, unspent.value)
    return txb.build()
  }

  logInit() {
    if (!this.debug) return
    // c.log("private key:", this.pvtKeyString)
    // c.log("address:", this.address)
    // c.log("address (non segwit):", this.addressOrig)
  }

}

module.exports = Keychain
