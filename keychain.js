'use strict'

const c = console
const BN = require('bignumber.js')
const bitcoin = require('bitcoinjs-lib')
const hash160 = bitcoin.crypto.hash160
const encodeWPKHOutput = bitcoin.script.witnessPubKeyHash.output.encode
const encodeScriptHash = bitcoin.script.scriptHash.output.encode

const bcApi   = require('blockchain-api-basic')
// const balance = bcApi.balance
const unspent  = bcApi.utxos
const pushTx   = bcApi.pushTx

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
    this.storedKeyString = '__coinjs_keychain_private_key'
    this.apiRoot = 'https://api.blockcypher.com/v1/btc/main'
    // this.debug   = true
    this.debug   = false
    this.store   = store || localStorage
    this.loadOrGeneratePrivateKey()
    this.index   = 0
    this.setInstanceVariables()
    this.logInit()
  }

  setInstanceVariables() {
    this.address      = this.getAddress()
    this.addressOrig  = this.getAddressOrig()
    this.pvtKeyString = this.getPrivateKeyWIF()
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
    const key = this.storedKey()
    if (key && key != '') {
      this.pvtKey = this.loadPrivateKey()
    } else {
      const newKey = this.generatePrivateKey()
      this.saveKey(newKey)
      this.pvtKey = newKey
      this.setInstanceVariables()
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
    return bitcoin.ECPair.fromWIF(this.storedKey())
  }

  getPrivateKeyWIF() {
    return this.pvtKey.toWIF()
  }

  storedKey() {
    return this.store[this.storedKeyString]
  }

  saveKey(key) {
    this.store[this.storedKeyString] = key.toWIF()
  }

  selectUtxo({ utxos, value }) {
    const utxo = utxos.find((utxo) => (
      utxo.value > value
    ))
    if (!utxo) throw Error("No UTXO available to spend, you don't seem to have enough funds to send this transaction.")
    return utxo
  }

  satoshisToBTC({ value }) {
    return new BN(value).multipliedBy( Math.pow(10, 8) ).toNumber()
  }

  validateSendArguments({ to, value }) {
    const addressEmptyMsg = "Address not defined, please use a valid bitcoin address to send funds to."
    const txValueEmptyMsg = "Transaction value is not specified, please specify the amount you want to send in BTC."
    const txValueNaNMsg = "Transaction value is not a number, please specify the amount you want to send in BTC."
    if (!to || to == "") throw new Error(addressEmptyMsg)
    if (!value || value == "") throw new Error(txValueEmptyMsg)
    if (isNaN(Number(value))) throw new Error(txValueNaNMsg)
    return true
  }

  async send({ to, value }) {
    this.validateSendArguments({ to, value })
    value = this.satoshisToBTC({value})
    // console.log("address:", this.address)
    const utxos = await this.utxos(this.address)
    const utxo = this.selectUtxo({ utxos, value })
    const transaction = this.buildTX({ utxo: utxo, to: to, value: value })
    const txHex = transaction.toHex()
    // c.log('transaction: ', transaction)
    // const witnesses = transaction.ins.map((txIn) => {
    //   return txIn.witness
    // })
    // c.log('transaction witnesses: ', witnesses)
    c.log('transaction (hex): ', txHex)
    const tx = {
      status:     "OK",
      serialized: txHex,
    }
    return tx
  }

  async utxos() {
    return unspent(this.address)
  }

  buildTX({ utxo, to, value }) {
    const keyPair = this.pvtKey
    const redeemScript = this.getScriptPubKey()
    // c.log('to: ',     to)
    // c.log('value: ', value)

    const txb = new bitcoin.TransactionBuilder()
    // txb.addInput(utxo.txId, utxo.vout)
    txb.addInput(utxo.tx_hash_big_endian, utxo.tx_output_n)
    txb.addOutput(to, value)
    txb.sign(0, keyPair, redeemScript, null, utxo.value)
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
