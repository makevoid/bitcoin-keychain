const fs = require('fs')
const readFile  = fs.readFileSync
const writeFile = fs.writeFileSync
const exists    = fs.existsSync
const Keychain  = require('../keychain')
const keyPath = ".private-key.txt"

// generate keychain
if (!exists(keyPath)) {
  const storeNew = {}
  const kc = new Keychain(storeNew)
  console.log("Keychain generated\nAddress:", kc.address)
  writeFile(keyPath, JSON.stringify(storeNew, null, 2))
}

const store = JSON.parse(readFile(keyPath))

const keychain = new Keychain(store)
console.log("Address:", keychain.address)

;(async () => {
  const utxos = await keychain.utxos()
  console.log("UTXOs:", utxos)
})()
