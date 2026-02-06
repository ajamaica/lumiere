# Mersal

```
     _   __ ___  ___    ___   _   __
  / \,' // _/ / o | ,' _/ .' \ / /
 / \,' // _/ /  ,' _\ `. / o // /_
/_/ /_//___//_/`_\/___,'/_n_//___/
                 Built by FOXOMAN
```

Send SMS and Otp in nim, a wrapper for TextBelt's (`http://textbelt.com`) public API
Sultan Al Isaee ~ foxoman @2022
See MIT LICENSE.txt for details of the license.

Mersal is an SMS/OTP API Wrapper for `textbelt` (`http://textbelt.com`) public API,
that is built for developers who just want to send and receive SMS in nim.

**So what does it provide:**

- Send sms to any international mobile number using the standard number way +CCMobile
- Track the delivery of any sms sent
- Send Otp to any mobile number same like sending message
- Make your own message content instead of default `Your verification code is $OTP`
- verify the otp
- check your credit balance

**Is it free ?**

Texetbelt provide you with free key `textbelt` to be able to send one free message a day, but you can purchase an sms package from here - https://textbelt.com/purchase/?generateKey=1 , you will need to use a key with credit.

## Install mersal

To install mersal for your nim development package:

`nimble install mersal`

then import mersal and enjoy using it is api in your app.

![image.png](https://cdn.hashnode.com/res/hashnode/image/upload/v1660377027526/SgnA5heON.png align="center")

**Bellow an example of a full app to send a message:**

```
import termui, terminal
import mersal

const logo = """

   _   __ ___  ___    ___   _   __
  / \,' // _/ / o | ,' _/ .' \ / /
 / \,' // _/ /  ,' _\ `. / o // /_
/_/ /_//___//_/`_\/___,'/_n_//___/
                 Built by FOXOMAN
                            v 1.0
"""

const help = """
[*] Use E.164 mobile numbers format:

    Example: +447712345678:

    Prefix      Country code      Subscriber number
    +           44 (UK)           7712345678
"""

styledEcho(fgCyan, logo, resetStyle)
styledEcho(fgYellow, help, resetStyle)
styledEcho(fgRed, """[*] Use at your own risk!
[*] 'textbelt' is free key for one message a day only.
""", resetStyle)

let mobile = termuiAsk("What is the mobile you want to send the message to?",
    defaultValue = "+447712345678")
let message = termuiAsk("What is your message?",
    defaultValue = "Hello World")
let key = termuiAsk("What is your API Key?",
    defaultValue = "textbelt")

let sendingMsg = termuiSpinner("Prepare to send the message...")

sendingMsg.update("Sending the message...")

let (ok, id, credit, error) = sendSms(mobile, message, key)

sendingMsg.update("Getting the resposnse....")

if not ok:
  sendingMsg.fail(error & "\n")

else:
  sendingMsg.complete("TextId: " & id &
      " | quotaRemaining: " & $credit & "\n")

discard getch()


```

## Reference

- Mersal Github repo: https://github.com/foxoman/mersal
- Buy a credit: https://textbelt.com/create-key/
- Read Mersal Api: https://mersal-doc.surge.sh/mersal
- Read textbelt FAQ: https://docs.textbelt.com/
