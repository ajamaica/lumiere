# Single Email Examples (SendGrid)

## Node.js / TypeScript

```ts
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

await sgMail.send({
  from: 'Support <support@winkintel.com>',
  to: ['vince@winkintel.com'],
  cc: ['cc@example.com'],
  bcc: ['bcc@example.com'],
  replyTo: 'support@winkintel.com',
  subject: 'SendGrid test',
  text: 'Plain text body',
  html: '<p>HTML body</p>',
  attachments: [
    {
      filename: 'hello.txt',
      content: Buffer.from('hello').toString('base64'),
      type: 'text/plain',
      disposition: 'attachment',
    }
  ]
});
```

### Dynamic Template (Node)

```ts
await sgMail.send({
  from: 'Support <support@winkintel.com>',
  to: ['vince@winkintel.com'],
  templateId: 'd-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  dynamicTemplateData: { first_name: 'Vince' }
});
```

## Python

```py
import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Cc, Bcc, ReplyTo, Attachment, FileContent, FileName, FileType, Disposition

message = Mail(
    from_email=Email('support@winkintel.com'),
    to_emails=To('vince@winkintel.com'),
    subject='SendGrid test',
    plain_text_content='Plain text body',
    html_content='<p>HTML body</p>'
)
message.add_cc(Cc('cc@example.com'))
message.add_bcc(Bcc('bcc@example.com'))
message.reply_to = ReplyTo('support@winkintel.com')

attachment = Attachment(
    FileContent('aGVsbG8='),
    FileName('hello.txt'),
    FileType('text/plain'),
    Disposition('attachment')
)
message.add_attachment(attachment)

sg = SendGridAPIClient(os.environ.get('SENDGRID_API_KEY'))
response = sg.send(message)
```

### Dynamic Template (Python)

```py
message = Mail(
    from_email='support@winkintel.com',
    to_emails='vince@winkintel.com'
)
message.template_id = 'd-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
message.dynamic_template_data = {'first_name': 'Vince'}

sg = SendGridAPIClient(os.environ.get('SENDGRID_API_KEY'))
sg.send(message)
```

## cURL

```bash
curl -X POST "https://api.sendgrid.com/v3/mail/send" \
  -H "Authorization: Bearer $SENDGRID_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"personalizations":[{"to":[{"email":"vince@winkintel.com"}],"cc":[{"email":"cc@example.com"}],"bcc":[{"email":"bcc@example.com"}]}],"from":{"email":"support@winkintel.com"},"reply_to":{"email":"support@winkintel.com"},"subject":"SendGrid test","content":[{"type":"text/plain","value":"Plain text body"},{"type":"text/html","value":"<p>HTML body</p>"}],"attachments":[{"content":"aGVsbG8=","type":"text/plain","filename":"hello.txt","disposition":"attachment"}]}'
```

### Dynamic Template (cURL)

```bash
curl -X POST "https://api.sendgrid.com/v3/mail/send" \
  -H "Authorization: Bearer $SENDGRID_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"from":{"email":"support@winkintel.com"},"personalizations":[{"to":[{"email":"vince@winkintel.com"}],"dynamic_template_data":{"first_name":"Vince"}}],"template_id":"d-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"}'
```
