# tg-bots

## Development

### NOTE!

In all subsequent steps, the commands should be run from within the `./<group>/<bot>/` directory. For example: `./paint/paintbot-9000/`.

### Install and Run Python

Mac doesn't have Python installed natively. You can use `pyenv` to install and manage multiple Python versions on your local machine.

```
pyenv install --list
pyenv install 3.9.19
pyenv global 3.9.19
```

### Setup Virtual Env

Python requires you to create a venv for managing and using pip packages used by your app. (These packages should not be committed to your git repo. The .gitignore should automatically exclude them.)

`python -m venv ./venv`

Then you need to activate the `./venv` directory, so Python uses the packages you will install for the bot.

`source ./venv/bin/activate`

### Install Packages

To install dependencies, run:

`pip install -r ./src/requirements.txt`

If you add new dependencies to the bot, make sure to update the requirements.txt file by running:

`pip freeze > ./src/requirements.txt`

### Environment Variables

*NOTE:* You should never commit the `./src/credentials.py` file, as it will contain private keys that should never be public.

Copy the `./src/credentials.py.example` file into a new file:

`cp ./src/credentials.py.example ./src/credentials.py`

Add all the required values to `./src/credentials.py`. See inline comments for more info.

### Telegram Bot Webhook Configuration

You will need to tell Telegram what webhook URL your bot should connect to (allow sending and receiving messages).

`curl -X POST "https://api.telegram.org/bot<bot_token>/setWebhook?url=<URL>"`

### Run Bot Flask App

Run the following to start the Flask app:

`gunicorn src.app:app`

## Deployment

You will need a server to deploy your bot Flask apps to.

For deploying simple apps, I like to use Digital Ocean because of its simplicity, flexibility, and detailed guides on server setup.

Login to Digital Ocean, then click Create Droplet. (Droplets are basically DO's word for servers.) Select Create a bare minimum droplet with 1GB of ram (currently $6 per month).

After the droplet is created, navigate to it in the DO interface, then next to "ipv6" click "Enable ipv6". Follow the instructions to shut down, enable ipv6, then restart the droplet.

Then, you'll need to follow the [Initial Server Setup with Ubuntu](https://www.digitalocean.com/community/tutorials/initial-server-setup-with-ubuntu) guide to connect / ssh into your server, and set it up for app deployment. (The steps are actually quite easy, mostly copy/paste, but there is a lot of explanation around it.)

**TO BE CONTINUED**
