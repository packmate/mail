const { assureProperties } = require('@packmate/assure')

// ---------------------------------------------

function forLogging(messages) {
  return messages.map(message => {
    if (message.attachment) {
      return { ...message, attachment: { ...message.attachment, content: 'Truncated' } }
    }

    if (message.attachments) {
      return { ...message, attachments: [ 'Truncated' ] }
    }

    return message
  })
}

function toAddress({ name, emails }) {
  return [ ...new Set(emails) ].map(email => ({ name, email }))
}

function toSendGrid({ attachment, bcc, data, from, template_id, to }, { dry, sender }) {
  const personalizations = [ {} ]
  const template = personalizations[0]

  const message = {
    from,
    template_id,
    personalizations
  }

  template.to = [ to ].flat().map(toAddress).flat()

  if (attachment) {
    assureProperties([ 'content', 'filename' ], { of: attachment, type: 'attachment' })
    message.attachments = [ attachment ]
  }

  if (bcc) {
    template.bcc = [ bcc ].flat().map(toAddress).flat()
  }

  if (!bcc && !dry) {
    template.bcc = sender
  }

  if (data) {
    template.dynamic_template_data = data
  }

  if (dry) {
    template.dynamic_template_data = {
      ...template.dynamic_template_data,
      debugging: true,
      originally_to: template.to
    }

    template.to = [ from ]

    if (bcc) {
      template.dynamic_template_data.originally_bcc = template.bcc
      delete template.bcc
    }
  }

  return message
}

// ---------------------------------------------

module.exports = (configureOptions = {}) => {
  const mail = configureOptions.mail || require('@sendgrid/mail')

  const { key, sender } = assureProperties([ 'key', 'sender' ], {
    of: configureOptions,
    type: 'configure options'
  })

  assureProperties([ 'name', 'email' ], { of: sender, type: 'sender' })

  mail.setApiKey(key)

  return async (type, message, options = {}) => {
    if (!type) {
      throw new Error('[mail.send] No message type is present.')
    }

    if (!message) {
      throw new Error('[mail.send] No message is present.')
    }

    const { log } = assureProperties([ 'log' ], { of: options, type: 'options' })

    // ---------------------------------------------

    const dry = configureOptions.dry || options.dry

    const suffix = dry ? ' (dry run)' : ''

    // ---------------------------------------------

    const originalMessages = [ message ].flat()
    await log(`Received data for ${ type }.`, { data: forLogging(originalMessages) })

    const messages = originalMessages
      .map(message => ({ ...message, from: sender }))

    messages
      .forEach(message => {
        assureProperties([ 'from', 'template_id', 'to' ], { of: message, type: 'message' })
      })

    const toSend = messages.map(message => toSendGrid(message, { dry, sender }))

    await log(`Sending ${ type }.${ suffix }`, { messages: forLogging(toSend) })
    const response = await mail.send(toSend)
    await log(`Sent ${ type }.${ suffix }`, { messages: forLogging(toSend), response })

    return response
  }
}
