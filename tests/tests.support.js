const asPromised = require('chai-as-promised')
const chai = require('chai')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const { isAssured } = require('@packmate/assure')

// ---------------------------------------------

chai.use(asPromised)
chai.use(isAssured)
chai.use(sinonChai)

// ---------------------------------------------

const spy = sinon.spy

spy.async = () => {
  return sinon.stub().resolves(spy)
}

function stub(value) {
  return sinon.stub().returns(value)
}

stub.async = (value) => {
  return sinon.stub().resolves(value)
}

// ---------------------------------------------
// Make specified helper methods available to all tests.

Object.assign(global, {
  assign: Object.assign,
  expect: chai.expect,
  spy,
  stub
})
