// ---------------------------------------------

const fake = {
  attachment: {
    content: 'content',
    filename: 'filename'
  },

  configuration: {
    key: 'key',

    mail: {
      send: stub.async(),
      setApiKey: stub()
    },

    sender: {
      name: 'sender',
      email: 'email'
    }
  },

  message: {
    template_id: 'id',

    to: {
      name: 'person',
      emails: [ 'email-1' ]
    }
  },

  options: {
    log: stub.async()
  },

  person: {
    name: 'person',
    emails: [ 'email-1' ]
  },

  type: 'type'
}

// ---------------------------------------------

describe('configureSend()', () => {
  const configureSend = require('./mail')

  context('without all required options', () => {
    it('throws an error', () => {
      expect(fake.configuration).to.be.assuredBy(invalidOptions => {
        configureSend(invalidOptions)
      }, { exclude: 'mail' })
    })
  })

  context('with an invalid sender', () => {
    it('throws an error', () => {
      expect(fake.configuration.sender).to.be.assuredBy(invalidSender => {
        configureSend({ ...fake.configuration, sender: invalidSender })
      })
    })
  })

  context('with all required options', () => {
    it('configures the mail function with the key', () => {
      const key = 'test-key'
      const mail = { ...fake.configuration.mail, setApiKey: spy() }

      configureSend({ ...fake.configuration, mail, key })

      expect(mail.setApiKey).to.have.been.calledWith(key)
    })

    it('returns the send() function', () => {
      expect(configureSend(fake.configuration)).to.be.a('function')
    })

    context('with the dry option set to true', () => {
      it('overrides the individual mailer options', async () => {
        const mail = { ...fake.configuration.mail, send: spy.async() }
        const send = configureSend({ ...fake.configuration, mail, dry: true })

        await send(fake.type, fake.message, { ...fake.options, dry: false })

        expect(mail.send.getCall(0).args[0][0].personalizations[0].dynamic_template_data.debugging)
          .to.be.true
      })
    })
  })
})

describe('.send()', () => {
  const configureSend = require('./mail')

  context('without a type', () => {
    it('throws an error', async () => {
      const send = configureSend(fake.configuration)
      await expect(send()).to.be.rejectedWith('type')
    })
  })

  context('without a message', () => {
    it('throws an error', async () => {
      const send = configureSend(fake.configuration)
      await expect(send(fake.type)).to.be.rejectedWith('No message')
    })
  })

  context('with invalid options', () => {
    it('throws an error', async () => {
      await expect(fake.options).to.be.assuredByAsync(async (invalidOptions) => {
        const send = configureSend(fake.configuration)
        await send(fake.type, fake.message, {})
      })
    })
  })

  context('called correctly', () => {
    function getMessages(send) {
      return send.getCall(0).args[0]
    }

    context('with a single message', () => {
      context('with an invalid message', () => {
        it('throws an error', () => {
          const send = configureSend(fake.configuration)

          return expect(fake.message).to.be.assuredByAsync(async (invalidMessage) => {
            await send(fake.type, invalidMessage, fake.options)
          })
        })
      })

      context('with a valid message', () => {
        it('sends the message', async () => {
          const mail = { ...fake.configuration.mail, send: spy.async() }
          const send = configureSend({ ...fake.configuration, mail })

          const message = { ...fake.message, to: { ...fake.person, name: 'Name 1' } }

          await send(fake.type, message, fake.options)
          expect(mail.send).to.have.been.calledOnce

          const sent = getMessages(mail.send)
          expect(sent).to.have.length(1)
          expect(sent[0].personalizations[0].to[0].name).to.eq('Name 1')
        })
      })
    })

    context('with multiple messages', () => {
      context('with any invalid messages', () => {
        it('throws an error', async () => {
          const send = configureSend(fake.configuration)

          await expect(fake.message).to.be.assuredByAsync(async (invalidMessage) => {
            await send(fake.type, [ invalidMessage, fake.message ], fake.options)
          })

          await expect(fake.message).to.be.assuredByAsync(async (invalidMessage) => {
            await send(fake.type, [ fake.message, invalidMessage ], fake.options)
          })

          await expect(fake.message).to.be.assuredByAsync(async (invalidMessage) => {
            await send(fake.type, [ invalidMessage, invalidMessage ], fake.options)
          })
        })
      })

      context('with valid messages', () => {
        it('sends all the messages', async () => {
          const mail = { ...fake.configuration.mail, send: spy.async() }
          const send = configureSend({ ...fake.configuration, mail })

          const messages = [
            { ...fake.message, to: { ...fake.person, name: 'Name 1' } },
            { ...fake.message, to: { ...fake.person, name: 'Name 2' } },
          ]

          await send(fake.type, messages, fake.options)
          expect(mail.send).to.have.been.calledOnce

          const sent = getMessages(mail.send)
          expect(sent).to.have.length(2)
          expect(sent[0].personalizations[0].to[0].name).to.eq('Name 1')
          expect(sent[1].personalizations[0].to[0].name).to.eq('Name 2')
        })
      })
    })

    context('with all valid messages', () => {
      async function send(type, message, options) {
        const mail = { ...fake.configuration.mail, send: spy.async() }
        const send = configureSend({ ...fake.configuration, mail })

        await send(type, message, options)
        return getMessages(mail.send)
      }

      function getTemplate(sent) {
        return sent.personalizations[0].dynamic_template_data
      }

      // ---------------------------------------------

      context('with a single recipient', () => {
        it("sends mail to all the given recipient's email addresses", async () => {
          const person = { name: 'Name', emails: [ 'test@email.com', 'test2@email.com' ] }
          const sent = await send(fake.type, { ...fake.message, to: person }, fake.options)

          expect(sent).to.have.length(1)
          expect(sent[0].personalizations[0].to).to.deep.eq([
            { name: 'Name', email: 'test@email.com' },
            { name: 'Name', email: 'test2@email.com' }
          ])
        })
      })

      context('with multiple recipients', () => {
        it("sends mail to all the given recipients' email addresses", async () => {
          const people = [
            { name: 'Name', emails: [ 'test@email.com', 'test2@email.com' ] },
            { name: 'Name 2', emails: [ 'test3@email.com' ] }
          ]

          const sent = await send(fake.type, { ...fake.message, to: people }, fake.options)

          expect(sent).to.have.length(1)
          expect(sent[0].personalizations[0].to).to.deep.eq([
            { name: 'Name', email: 'test@email.com' },
            { name: 'Name', email: 'test2@email.com' },
            { name: 'Name 2', email: 'test3@email.com' }
          ])
        })
      })

      it('filters out duplicate email addresses', async () => {
        const person = { name: 'Name', emails: [ 'test@email.com', 'test@email.com' ] }
        const sent = await send(fake.type, { ...fake.message, to: person }, fake.options)

        expect(sent).to.have.length(1)
        expect(sent[0].personalizations[0].to).to.deep.eq([
          { name: 'Name', email: 'test@email.com' }
        ])
      })

      it('includes the given template ID', async () => {
        const template_id = 'string'
        const sent = await send(fake.type, { ...fake.message, template_id }, fake.options)

        expect(sent).to.have.length(1)
        expect(sent[0].template_id).to.eq(template_id)
      })

      context('with an invalid attachment', () => {
        it('throws an error', async () => {
          await expect(fake.attachment).to.be.assuredByAsync(async (subject) => {
            const message = { ...fake.message, attachment: subject }
            await send(fake.type, message, fake.options)
          })
        })
      })

      context('with a valid attachment', () => {
        it('includes the attachment', async () => {
          const attachment = { ...fake.attachment }
          const sent = await send(fake.type, { ...fake.message, attachment }, fake.options)

          expect(sent[0].attachments).to.have.length(1)
          expect(sent[0].attachments[0]).to.deep.eq(attachment)
        })

        it('truncates the attachment when logging', async () => {
          const log = spy.async()

          const attachment = { ...fake.attachment }
          await send(fake.type, { ...fake.message, attachment }, { ...fake.options, log })

          expect(log).to.have.been.called

          expect(log.getCall(0).args[1].data[0].attachment.content).to.eq('Truncated')
          expect(log.getCall(1).args[1].messages[0].attachments[0]).to.eq('Truncated')
          expect(log.getCall(2).args[1].messages[0].attachments[0]).to.eq('Truncated')
        })
      })

      context('without an attachment', () => {
        it('does not include the attachment', async () => {
          const sent = await send(fake.type, fake.message, fake.options)
          expect(sent[0]).not.to.have.property('attachments')
        })
      })

      context('with template data', () => {
        it('includes the template data', async () => {
          const data = { test: 'data' }
          const sent = await send(fake.type, { ...fake.message, data }, fake.options)

          expect(sent).to.have.length(1)
          expect(sent[0].personalizations[0].dynamic_template_data).to.deep.eq(data)
        })
      })

      context('without template data', () => {
        it('does not include any template data', async () => {
          const sent = await send(fake.type, fake.message, fake.options)

          expect(sent).to.have.length(1)
          expect(sent[0].personalizations[0]).not.to.have.property('dynamic_template_data')
        })
      })

      context('with one blind-copied recipient', () => {
        it('includes the blind-copied recipient', async () => {
          const mail = { ...fake.configuration.mail, send: spy.async() }

          const message = {
            ...fake.message,
            bcc: { emails: [ '1@test.com', '2@test.com' ], name: 'Recipient 1' },
          }

          const sendRaw = configureSend({ ...fake.configuration, mail })

          await sendRaw(fake.type, message, fake.options)

          const sent = getMessages(mail.send)
          expect(sent[0].personalizations[0].bcc)
            .and.to.deep.include({ name: 'Recipient 1', email: '1@test.com' })
            .and.to.deep.include({ name: 'Recipient 1', email: '2@test.com' })
        })
      })

      context('with blind-copied recipients', () => {
        it('includes the blind-copied recipients', async () => {
          const mail = { ...fake.configuration.mail, send: spy.async() }

          const message = {
            ...fake.message,

            bcc: [
              { emails: [ '1@test.com', '2@test.com' ], name: 'Recipient 1' },
              { emails: [ '3@test.com' ], name: 'Recipient 2' },
            ]
          }

          const sendRaw = configureSend({ ...fake.configuration, mail })

          await sendRaw(fake.type, message, fake.options)

          const sent = getMessages(mail.send)
          expect(sent[0].personalizations[0].bcc).to.deep.include({ name: 'Recipient 1', email: '1@test.com' })
            .and.to.deep.include({ name: 'Recipient 1', email: '2@test.com' })
            .and.to.deep.include({ name: 'Recipient 2', email: '3@test.com' })
        })
      })

      context('without blind-copied recipients', () => {
        it('blind-copies the default sender', async () => {
          const sender = { ...fake.configuration.sender }
          const mail = { ...fake.configuration.mail, send: spy.async() }
          const sendRaw = configureSend({ ...fake.configuration, mail, sender })

          await sendRaw(fake.type, fake.message, fake.options)

          const sent = getMessages(mail.send)
          expect(sent[0].personalizations[0].bcc).to.deep.eq(sender)
        })
      })

      context('when performing a dry run', () => {
        it('adds debugging information to the template data', async () => {
          const person = { name: 'person', emails: [ 'email-1', 'email-2' ] }

          const message = { ...fake.message, to: person }
          const sent = await send(fake.type, message, { ...fake.options, dry: true })
          const template = getTemplate(sent[0])

          expect(template.debugging).to.be.true
          expect(template.originally_to).to.deep.eq([
            { name: 'person', email: 'email-1' },
            { name: 'person', email: 'email-2' }
          ])
        })

        it('redirects to the default sender', async () => {
          const mail = { ...fake.configuration.mail, send: spy.async() }
          const sender = { ...fake.configuration.sender }
          const send = configureSend({ ...fake.configuration, mail, sender })

          await send(fake.type, fake.message, { ...fake.options, dry: true })
          const sent = getMessages(mail.send)

          expect(sent[0].personalizations[0].to).to.deep.eq([ sender ])
        })

        it('includes dry run note in all but the first message', async () => {
          const log = spy.async()

          await send(fake.type, fake.message, { ...fake.options, dry: true, log })

          log.getCalls().splice(1).forEach(call => {
            expect(call.args[0]).to.include('(dry run)')
          })
        })

        context('with one blind-copied recipient', () => {
          it('includes blind-copy debugging information', async () => {
            const bcc = { name: 'bcc-one', emails: [ '1@test.com', '2@test.com' ] }

            const message = { ...fake.message, bcc }

            const sent = await send(fake.type, message, { ...fake.options, dry: true })
            const template = getTemplate(sent[0])

            expect(template.originally_bcc).to.deep.eq([
              { name: 'bcc-one', email: '1@test.com' },
              { name: 'bcc-one', email: '2@test.com' }
            ])
          })

          it('does not blind-copy the original recipient', async () => {
            const mail = { ...fake.configuration.mail, send: spy.async() }
            const message = { ...fake.message, bcc: fake.person }
            const sender = { ...fake.configuration.sender }

            const sendRaw = configureSend({ ...fake.configuration, mail, sender })

            await sendRaw(fake.type, message, { ...fake.options, dry: true })

            const sent = getMessages(mail.send)
            expect(sent[0].personalizations[0]).not.to.have.property('bcc')
          })
        })

        context('with blind-copied recipients', () => {
          it('includes blind-copy debugging information', async () => {
            const bcc = [
              { name: 'bcc-one', emails: [ '1@test.com', '2@test.com' ] },
              { name: 'bcc-two', emails: [ '3@test.com' ] },
            ]

            const message = { ...fake.message, bcc }

            const sent = await send(fake.type, message, { ...fake.options, dry: true })
            const template = getTemplate(sent[0])

            expect(template.originally_bcc).to.deep.eq([
              { name: 'bcc-one', email: '1@test.com' },
              { name: 'bcc-one', email: '2@test.com' },
              { name: 'bcc-two', email: '3@test.com' }
            ])
          })

          it('does not blind-copy the original recipients', async () => {
            const mail = { ...fake.configuration.mail, send: spy.async() }
            const message = { ...fake.message, bcc: [ fake.person, fake.person ] }
            const sender = { ...fake.configuration.sender }

            const sendRaw = configureSend({ ...fake.configuration, mail, sender })

            await sendRaw(fake.type, message, { ...fake.options, dry: true })

            const sent = getMessages(mail.send)
            expect(sent[0].personalizations[0]).not.to.have.property('bcc')
          })
        })

        context('without blind-copied recipients', () => {
          it('does not include blind-copy debugging information', async () => {
            const sent = await send(fake.type, fake.message, { ...fake.options, dry: true })
            const template = getTemplate(sent[0])

            expect(template).not.to.have.property('originally_bcc')
          })

          it('does not blind-copy the default sender', async () => {
            const mail = { ...fake.configuration.mail, send: spy.async() }
            const message = { ...fake.message }
            const sender = { ...fake.configuration.sender }

            const sendRaw = configureSend({ ...fake.configuration, mail, sender })

            await sendRaw(fake.type, message, { ...fake.options, dry: true })

            const sent = getMessages(mail.send)
            expect(sent[0].personalizations[0]).not.to.have.property('bcc')
          })
        })
      })

      it('logs the original message data', async () => {
        const log = spy.async()
        await send('test messages', fake.message, { ...fake.options, log })

        expect(log).to.have.been.called
        expect(log.getCall(0).args[0]).to.eq('Received data for test messages.')
        expect(log.getCall(0).args[1]).to.deep.eq({ data: [ fake.message ]})
      })

      it('logs the messages to be sent', async () => {
        const log = spy.async()
        const sent = await send('test messages', fake.message, { ...fake.options, log })

        expect(log).to.have.been.called
        expect(log.getCall(1).args[0]).to.eq('Sending test messages.')
        expect(log.getCall(1).args[1]).to.deep.eq({ messages: sent })
      })

      it('logs the response', async () => {
        const log = spy.async()
        const mail = { ...fake.configuration.mail, send: spy.async() }

        const sendRaw = configureSend({ ...fake.configuration, mail })

        const response = await sendRaw('test messages', fake.message, { ...fake.options, log })

        const sent = getMessages(mail.send)
        expect(log).to.have.been.called
        expect(log.getCall(2).args[0]).to.eq('Sent test messages.')
        expect(log.getCall(2).args[1]).to.deep.eq({ messages: sent, response })
      })
    })
  })
})
