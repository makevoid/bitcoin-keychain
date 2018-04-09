const Keychain = require('./keychain')

const memo = {}
const store = {}
const storeKeyString = '__coinjs_keychain_private_key'
const pvtKeyOne = ''

const utxoSource = [
  {
    tx_hash: 'a3fdd5b6616eccd7b3e9feabdd269501d832ab54d2efd1ba32ca1551d209a751',
    tx_hash_big_endian: '51a709d25115ca32bad1efd254ab32d8019526ddabfee9b3d7cc6e61b6d5fda3',
    tx_index: 340524001,
    tx_output_n: 0,
    script: 'a91431189813bc0aefb6e6f70cd24e28aef7d170f9f787',
    value: 22306,
    value_hex: '5722',
    confirmations: 0
  }
]

const keyChain = () => {
  if (memo.keyChain) return memo.keyChain
  return new Keychain(store)
}

it('inits - generates a key', () => {
  const keychain = new Keychain(store)
  expect(keychain.pvtKeyString).toBeDefined()
  expect(keychain.pvtKeyString.length).toBe(52)
})

it('inits - loads a key', () => {
  store[storeKeyString] = pvtKeyOne
  const keychain = new Keychain(store)
  expect(keychain.pvtKeyString).toBe(pvtKeyOne)
  memo.keyChain = keychain
})

it('derives addresses (P2SH)', () => {
  const keychain = keyChain()
  expect(keychain.address[0]).toBe('3')
  expect(keychain.address).toBe('36AcVmW4ANsgEqbgH5nc57GNgYTQkLgUnQ')
})

it('derives addresses (base)', () => {
  const keychain = keyChain()
  const adressBase = keychain.getAddressBase()
  expect(adressBase.slice(0, 3)).toBe('bc1')
  expect(adressBase).toBe('bc1quauy8e8zuucsptamcednz7nz2x22ykp50xmfdv')
})

it('gets balance - zero balance', async () => {
  const keychain = keyChain()
  fetch.once(JSON.stringify({ final_balance: 0 }))
  const balance = await keychain.balance()
  expect(balance).toBe(0)
})

it('gets balance', async () => {
  const keychain = keyChain()
  fetch.once(JSON.stringify({ final_balance: 10000 }))
  const balance = await keychain.balance()
  expect(balance).toBe(10000)
})

it('gets balance - non-segwit address', async () => {
  const keychain = keyChain()
  fetch.once(JSON.stringify({ final_balance: 0 }))
  const balance = await keychain.balanceOrigAddr()
  expect(balance).toBe(0)
})

it('gets utxos - empty', async () => {
  const keychain = keyChain()
  fetch.once(JSON.stringify({ unspent_outputs: [] }))
  const utxos = await keychain.utxos()
  expect(utxos).toEqual([])
})

it('gets utxos', async () => {
  const keychain = keyChain()
  fetch.once(JSON.stringify({ unspent_outputs: utxoSource }))
  const utxos = await keychain.utxos()
  expect(utxos.length).toEqual(1)
  const utxo = utxos[0]
  expect(typeof utxo).toBe('object')
  expect(utxo.tx_output_n).toEqual(0)
  expect(utxo.tx_hash_big_endian).toEqual("51a709d25115ca32bad1efd254ab32d8019526ddabfee9b3d7cc6e61b6d5fda3")
  expect(utxo.value).toEqual(22306)
  expect(utxo.confirmations).toEqual(0)
  expect(utxo.script).toEqual('a91431189813bc0aefb6e6f70cd24e28aef7d170f9f787')
})

it('sends a TX', async () => {
  const keychain = keyChain()
  const to = "36AcVmW4ANsgEqbgH5nc57GNgYTQkLgUnQ" // send a TX to "yourself"
  const value = 0.0001 // bitcoin, 0.1 mBTC as transaction amount
  fetch.once(JSON.stringify({ unspent_outputs: utxoSource }))
  const transaction = await keychain.send({ to, value })
  expect(transaction.status).toEqual("OK")
})
