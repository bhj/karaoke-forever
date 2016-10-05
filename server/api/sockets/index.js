const SOCKET_AUTHENTICATE = 'server/SOCKET_AUTHENTICATE'
const SOCKET_AUTHENTICATE_FAIL = 'account/SOCKET_AUTHENTICATE_FAIL'

const Auth = require('./auth')
const Queue = require('./queue')
const Player = require('./player')

const debug = require('debug')('app:socket')


let ACTION_HANDLERS = {}

ACTION_HANDLERS = Object.assign(ACTION_HANDLERS, Auth.actions)
ACTION_HANDLERS = Object.assign(ACTION_HANDLERS, Queue.actions)
ACTION_HANDLERS = Object.assign(ACTION_HANDLERS, Player.actions)

module.exports = exports = async function(ctx, next) {
  const action = ctx.data
  const handler = ACTION_HANDLERS[action.type]

  // only one allowed action if not authenticated...
  if (!ctx.user && action.type !== Auth.actions.SOCKET_AUTHENTICATE) {
    ctx.socket.socket.emit('action', {
      type: Auth.actions.SOCKET_AUTHENTICATE_FAIL,
      payload: {message: 'Invalid token (try signing in again)'}
    })
    return
  }

  if (!handler) {
    debug('No handler for type: %s', action.type)
    return
  }

  try {
    await handler(ctx, action)
  } catch (err) {
    debug('Error in handler %s: %s', action.type, err.message)
  }

  await next()
}
