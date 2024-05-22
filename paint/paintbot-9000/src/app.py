import asyncio
from flask import Flask, request
import telegram
from dotenv import load_dotenv
import os
import re

dotenv_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(dotenv_path)

global bot
global BOT_TOKEN
BOT_TOKEN = os.getenv('BOT_TOKEN')
bot = telegram.Bot(token=BOT_TOKEN)

BOT_USER_NAME = os.getenv('BOT_USER_NAME')
BOT_URL = os.getenv('BOT_URL')

print(f"BOT_USER_NAME: {BOT_USER_NAME}")
print(f"BOT_TOKEN: {BOT_TOKEN}")
print(f"BOT_URL: {BOT_URL}")

app = Flask(__name__)

@app.route('/')
def status():
    return f"The {BOT_USER_NAME} app is running."

@app.route('/initiate', methods=['GET', 'POST'])
def initiate():
    print("should initiate the webhook...")
    print(f"{BOT_URL}/webhook")
    s = bot.setWebhook(f"{BOT_URL}/webhook")
    if s:
        return "webhook setup ok"
    else:
        return "webhook setup failed"

@app.route('/webhook', methods=['POST'])
def respond():
    try:
        json_data = request.get_json(force=True)
        print(json_data)
        update = telegram.Update.de_json(json_data, bot)

        if not update.message:
            print("No message in update")
            return 'ok'

        chat_id = update.message.chat.id
        msg_id = update.message.message_id

        text = update.message.text.encode('utf-8').decode()

        print(f"got chat_id: {chat_id}")
        print(f"got msg_id: {msg_id}")
        print(f"got text message: {text}")
        print(asyncio.run(bot.getMe()))

        if text == "/start":
            bot_welcome = "Hellooo"
            try:
                print(f"Sending welcome message to chat_id: {chat_id}")
                asyncio.run(bot.sendMessage(chat_id=chat_id, text=bot_welcome, reply_to_message_id=msg_id))
                print(f"Sent welcome message to chat_id: {chat_id}")
            except Exception as e:
                print(f"Failed to send message: {e}")
        else:
            try:
                # clear the message we got from any non-alphabets
                text = re.sub(r"\W", "_", text)
                # create the api link for the avatar based on http://avatars.adorable.io/
                url = f"https://api.adorable.io/avatars/285/{text.strip()}.png"
                # reply with a photo to the name the user sent,
                # note that you can send photos by url and telegram will fetch it for you
                asyncio.run(bot.sendPhoto(chat_id=chat_id, photo=url, reply_to_message_id=msg_id))
            except Exception as e:
                print(f"Failed to send photo: {e}")
                # if things went wrong
                asyncio.run(bot.sendMessage(chat_id=chat_id, text="There was a problem in the name you used, please enter different name", reply_to_message_id=msg_id))
    except Exception as e:
        print(f"Failed to process update: {e}")
    return 'OK'

if __name__ == '__main__':
    app.run(port=5002)
