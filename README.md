# @packmate/mail

Send emails from Node.js (via [SendGrid](http://sendgrid.com)) with optional test runs.

## Installation

`npm install @packmate/mail`

## The Configuration Function

### Usage

`const configureSend = require('@packmate/mail')`

### Syntax

```
configureSend(options)
```

### Arguments

| Name | Type | Description |
| :-- | :-- | :-- |
| options | [Object: ConfigureOptions](#the-configure-options-object) | Configuration for all mailers. |

### Returns

| Type | Description |
| :-- | :-- |
| [Function: Send](#the-send-function) | A [send function](#the-send-function) for sending mail. |

### Exceptions

Throws a standard `Error` if:

- The [configure options object](#the-configureoptions-object) does not contain all required properties.
- The [sender object](#the-sender-object) in the [configure options object](#the-configureoptions-object) does not contain all required properties.

---

#### The ConfigureOptions Object

| Attribute | Type | Description |
| :-- | :-- | :-- |
| dry | Boolean *(default: false)* | If set to `true`, generated mailers will always perform [dry runs](#effects). This overrides the [individual mailer options](#the-options-object). |
| key | String | A [SendGrid](http://sendgrid.com) API key to use when sending mail. |
| mail | Object *(default: [`@sendgrid/mail`](https://github.com/sendgrid/sendgrid-nodejs/tree/main/packages/mail))* | A [SendGrid](http://sendgrid.com) mail implementation. |
| sender | [Object: Sender](#the-sender-object) | A default sender to send messages from. |

---

##### The Sender Object

| Attribute | Type | Description |
| :-- | :-- | :-- |
| name | String | The name of the sender. |
| email | String | The email of the sender. |

---

## The Send Function

### Syntax

```
send(type, messages, options)
```

### Arguments

| Name | Type | Description |
| :-- | :-- | :-- |
| type | String | A name for the type of mail being sent, used for logging. |
| message | [Object:Message](#the-message-object) \| Array [[Object: Message](#the-message-object)] | One or more [message objects](#the-message-object) representing the message(s) to be sent. |
| options | [Object: Options](#the-options-object) | Configuration for this mailer. |

### Returns

| Type | Description |
| :-- | :-- |
| Object: Promise | A promise to send mail via the [SendGrid](http://sendgrid.com) mail implementation. |

### Exceptions

Throws a standard `Error` if:

- No type is present.
- No message is present.
- The [message object](#the-message-object) does not contain all required properties.
- The [options object](#the-options-object) does not contain all required properties.

### Effects

- Mail will be sent via the [SendGrid](http://sendgrid.com) mail implementation.
- Information will be logged using [log function](#the-log-function) provided to the mailer.

**During a live run:**

- The default sender will be BCC'd on all messages.

**During a dry run:**

- All mail will be redirected to the default sender.
- Debugging information including the original recipient(s) will be added to the template data.

--- 

#### The Message Object

| Attribute | Type | Description |
| :-- | :-- | :-- |
| attachment *(optional)* | [Object: Attachment](#the-attachment-object) | An attachment to send with the email. |
| data *(optional)* | Object *(optional)* | Template data to use in the dynamic template. |
| template_id | String | A SendGrid dynamic template ID. |
| to | [Object: Person](#the-person-object) \| Array [[Object: Person](#the-person-object)] | One or more people to send this message to. |
| bcc | [Object: Person](#the-person-object) \| Array [[Object: Person](#the-person-object)] | One or more people to blind-copy on this message. |

--- 

##### The Attachment Object

| Attribute | Type | Description |
| :-- | :-- | :-- |
| filename | String | The filename for the attachment. |
| content | String | A Base64 encoded string containing the file data. |

--- 

##### The Person Object

| Attribute | Type | Description |
| :-- | :-- | :-- |
| emails | Array | A list of one or more emails to use for this person. |
| greeting | String | A greeting to be used when addressing this person (i.e. `Dear [greeting],`) |
| name | String | The person's full name. |

--- 

#### The Options Object

| Attribute | Type | Description |
| :-- | :-- | :-- |
| dry | Boolean *(default: false)* | Whether or not to perform a [dry run](#effects). This can be overridden in the [ConfigureOptions](#the-configureoptions-object). |
| log | [Function: Log](#the-log-function) | A [log function](#the-log-function) which will be used to log mailing information. |

---

##### The Log Function

A function for logging information.

The function should include an `.error()` property for logging errors.

###### Example Syntax

```
function log(value) {
  console.log(value)
}

log.error = (error) => {
  console.error(error)
}
```
