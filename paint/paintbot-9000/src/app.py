from flask import Flask, request
import telegram
from dotenv import load_dotenv
import os

dotenv_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(dotenv_path)

global bot
global TOKEN
TOKEN = os.getenv('BOT_TOKEN')
bot = telegram.Bot(token=TOKEN)

bot_user_name = os.getenv('BOT_USER_NAME')
bot_url = os.getenv('BOT_URL')

print(f"BOT_USER_NAME: {bot_user_name}")

app = Flask(__name__)

@app.route('/')
def status():
    return f"The {bot_user_name} app is running."

@app.route('/initiate', methods=['GET', 'POST'])
def initiate():
    s = bot.setWebhook('{bot_url}{HOOK}'.format(bot_url=bot_url, HOOK=TOKEN))
    if s:
        return "webhook setup ok"
    else:
        return "webhook setup failed"

@app.route('/webhook', methods=['POST'])
def respond():
    update = telegram.Update.de_json(request.get_json(force=True), bot)

    chat_id = update.message.chat.id
    msg_id = update.message.message_id

    text = update.message.text.encode('utf-8').decode()

    print("got chat_id :", chat_id)
    print("got msg_id :", msg_id)
    print("got text message :", text)

    if text == "/start":
        bot_welcome = "Hello. I am Paintbot 9000."
        try:
            bot.sendMessage(chat_id=chat_id, text=bot_welcome, reply_to_message_id=msg_id)
        except Exception as e:
            print(f"Failed to send message: {e}")
    else:
        try:
            # clear the message we got from any non alphabets
            text = re.sub(r"\W", "_", text)
            # create the api link for the avatar based on http://avatars.adorable.io/
            url = "https://api.adorable.io/avatars/285/{}.png".format(text.strip())
            # reply with a photo to the name the user sent,
            # note that you can send photos by url and telegram will fetch it for you
            bot.sendPhoto(chat_id=chat_id, photo=url, reply_to_message_id=msg_id)
        except Exception:
            # if things went wrong
            bot.sendMessage(chat_id=chat_id, text="There was a problem in the name you used, please enter different name", reply_to_message_id=msg_id)
    return 'ok'
