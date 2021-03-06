const { tokenInfo, vestingDate } = require('./config')
const { tokens, dateToEpoch, timeInSecs, CONSTANT_100K, CONSTANT_1M } = require('../helpers/utils')

const start = dateToEpoch(vestingDate) // 11 April 2021 11 PM GMT
const duration = timeInSecs(180, 24, 60, 60) // 180 Days in secs = 180d * 24h * 60m * 60s
const nextStart = start + duration

const foundation = {
  deposit: {
    tokens: tokens(7 * CONSTANT_1M), // 7 Million Tokens
  },
  depositA: {
    tokens: tokens(4 * CONSTANT_1M), // 4 Million Tokens
    start: start, // 11 April 2021 11 PM GMT in epoch secs
    cliff: timeInSecs(0, 0, 0, 0), // 0 Days in secs = 0d * 0h * 0m * 0s
    duration: duration, // 180 Days in secs = 180d * 24h * 60m * 60s
    revocable: false
  },
  depositB: {
    tokens: tokens(3 * CONSTANT_1M),
    start: nextStart,
    cliff: timeInSecs(0, 0, 0, 0),
    duration: timeInSecs(1280, 24, 60, 60),
    revocable: false
  }
}

module.exports = {
  foundation
}
