const Keychain = require('./keychain')

const memo = {}
const store = {}
const storeKeyString = "__coinjs_keychain_private_key"
const pvtKeyOne = "L4j9tFBpwiMR3hkkyTBANZBoWpHrDun81LND1jnQ3eoEutF6m4Wt"

const keyChain = () => {
  return memo.keyChain
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

it('derives addresses', () => {
  const keychain = keyChain()
  expect(keychain.address).toBe("bc1q0jvhy7fjvyptq2sej4p2tl9qs6rhkasfl0730j")
  expect(keychain.addressOrig[0]).toBe("3")
  expect(keychain.addressOrig).toBe("1CMpcUzm3n9ftMRDGwKg8KX2xLpHquxtSm")
})

it('gets balance', async () => {
  const keychain = keyChain()
  const balance = await keychain.balance()
  expect(balance).toBe(0)
})

it('gets balance (non-segwit address)', async () => {
  const keychain = keyChain()
  const balance = await keychain.balanceOrigAddr()
  expect(balance).toBe(0)
})
