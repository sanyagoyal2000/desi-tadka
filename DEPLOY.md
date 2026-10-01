# Deploy DesiTadka on Oracle Cloud (Always Free)

This puts DesiTadka on a free Oracle server with HTTPS, so your iPhone can use it anywhere — no laptop needed. You'll do the account/server clicks; everything else is copy-paste.

What runs on the server: the app in Docker (with yt-dlp and ffmpeg), Caddy for HTTPS, and your saved cards in `data/`. The AI uses the **OpenAI API** (the server can't use the Codex app on your laptop), and an **access code** keeps strangers out.

You'll need: a card for Oracle's identity check (Always Free resources aren't charged), and an OpenAI API key with a little credit.

---

## 1. Create the Oracle account

1. Go to <https://www.oracle.com/cloud/free/> → **Start for free**.
2. Pick a **home region** near you (e.g. India West – Mumbai or India South – Hyderabad). It can't be changed later.

## 2. Create the server

1. Console → **Compute → Instances → Create instance**.
2. **Image:** Canonical **Ubuntu 24.04**.
3. **Shape:** *Change shape* → **Ampere** → `VM.Standard.A1.Flex`, **2 OCPUs, 12 GB memory** (inside the free allowance).
4. **Networking:** create a new virtual cloud network with a **public subnet**, and keep **Assign a public IPv4 address** on.
5. **SSH keys:** *Generate a key pair for me* → **Save private key** (e.g. `~/Downloads/desitadka.key`).
6. **Create.** When it's running, copy the **Public IP address** (e.g. `140.238.12.34`).

> "Out of capacity"? Try another availability domain, try again later, or use 1 OCPU / 6 GB.

## 3. Open the web ports in Oracle

Instance page → click the **Subnet** → **Security Lists** → *Default Security List* → **Add Ingress Rules**, twice:

| Source CIDR | IP protocol | Destination port |
|---|---|---|
| `0.0.0.0/0` | TCP | `80` |
| `0.0.0.0/0` | TCP | `443` |

## 4. Log in to the server (from your Mac's Terminal)

```bash
chmod 600 ~/Downloads/desitadka.key
ssh -i ~/Downloads/desitadka.key ubuntu@140.238.12.34     # your IP
```

## 5. Set up the server (paste on the server)

```bash
# Oracle's Ubuntu also has its own firewall: open 80 and 443 there too
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save

# Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
exit
```

Log in again (step 4) so Docker works without `sudo`, then:

```bash
git clone https://github.com/<your-username>/<your-repo>.git desitadka
cd desitadka
mkdir -p data tmp secrets
cp .env.server.example .env
nano .env
```

Fill in `.env` (save with **Ctrl+O, Enter**, exit with **Ctrl+X**):

- `SITE_ADDRESS` — your IP with **dashes** + `.sslip.io`, e.g. `140-238-12-34.sslip.io`
- `ACCESS_CODE` — something long you'll type once per phone
- `OPENAI_API_KEY` — from <https://platform.openai.com/api-keys> (set a monthly spend limit under *Billing → Limits*)
- `OPENAI_MODEL` — a current model that can read images (see <https://platform.openai.com/docs/models>)
- `OPENAI_IMAGE_MODEL` — leave empty to skip AI pictures after swaps (cheaper)

Start it:

```bash
docker compose up -d --build
docker compose logs -f caddy      # wait for "certificate obtained successfully", then Ctrl+C
```

> Private GitHub repo? `git clone` will ask for a username and a **personal access token** (GitHub → Settings → Developer settings → Tokens) instead of your password.

## 6. Use it on your iPhone

1. Safari → `https://140-238-12-34.sslip.io` (your address) → enter the access code.
2. **Share → Add to Home Screen** so it opens like an app.
3. **Update the Instagram shortcut:** in Shortcuts, edit *DesiTadka* and change the Text action to
   `https://140-238-12-34.sslip.io/?url=` followed by the **URL Encoded Text** variable.
   Now Instagram → Share → **DesiTadka** works from anywhere, on Wi-Fi or mobile data.

## Optional: bring your laptop's saved cards

From your **Mac** (in the project folder):

```bash
scp -i ~/Downloads/desitadka.key -r data ubuntu@140.238.12.34:~/desitadka/
```

Then on the server: `cd desitadka && docker compose restart app`.

## If Instagram blocks the server

Cloud servers get blocked by Instagram more often than home Wi-Fi. "Paste the caption instead" always works. To fix downloads:

1. On your laptop, log in to instagram.com in Chrome and export cookies with a "cookies.txt" extension (e.g. *Get cookies.txt LOCALLY*), saved as `cookies.txt`.
2. Copy it up: `scp -i ~/Downloads/desitadka.key cookies.txt ubuntu@140.238.12.34:~/desitadka/secrets/`
3. On the server, uncomment `YTDLP_COOKIES_FILE=/app/secrets/cookies.txt` in `.env`, then `docker compose up -d`.

These cookies can log in as you — keep them only in `secrets/` (git ignores it) and never share them.

## Everyday commands (on the server, in `~/desitadka`)

| What | Command |
|---|---|
| Update after you push new code | `git pull && docker compose up -d --build` |
| See app logs | `docker compose logs -f app` |
| Restart | `docker compose restart` |
| Stop | `docker compose down` |
| Back up your cards | from the Mac: `scp -i ~/Downloads/desitadka.key -r ubuntu@140.238.12.34:~/desitadka/data ./backup-data` |
