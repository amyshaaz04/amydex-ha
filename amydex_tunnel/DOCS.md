# Set up AmyDex Tunnel

Keep your current remote connection running until the AmyDex hostname works from outside your network. Pick a new hostname for the test, such as `myhome.homzia.space`, so both tunnels can run during the changeover.

## Create the route in AmyDex

1. Go to **Hosting → Tunnels → Create tunnel** and name it **Home Assistant**.
2. Open the tunnel and add an HTTP route. Choose a public hostname in your AmyDex-managed domain and set the origin to the Home Assistant listener, for example `http://127.0.0.1:8123` or `http://127.0.0.1:80`. Use the port shown in Home Assistant’s HTTP server settings or the port in its local URL. The add-on uses host networking so it can reach the local listener.
3. Edit the named tunnel and choose **Download connector**. Downloading a fresh connector replaces older connector credentials for that tunnel.
4. In the app’s configuration share, put the downloaded file at `connector.json`. Over Samba, find the folder ending in `_amydex_tunnel` in the `addon_configs` share. For a local install it is usually `local_amydex_tunnel`. Use a trusted local connection for this transfer.
5. Start **AmyDex Tunnel**. The app imports the connector into private storage and removes the import file. Confirm **AmyDex connector imported** and **Tunnel configuration synchronized** in the app log, then check the tunnel status in AmyDex. Enable **Start on boot** after testing.

If your AmyDex installation issues one-time pairing codes, you can use **Configuration** to enter the HTTPS server URL and pairing code instead of importing a file. A saved connector is reused across restarts. Clear the consumed code after pairing. To replace a connector, import a freshly downloaded file and restart the app.

## Upgrading from 1.0.0

Version 1.1.0 runs the connector supplied in AmyDex’s authorized download or pairing response. If you are using 1.0.0, download a fresh connector just before upgrading, put it in the app’s configuration share and then update the app. Downloading a replacement rotates the tunnel key, so complete the update and start the app before testing remote access. Keep a local Home Assistant session open during the upgrade.

## Home Assistant login and Companion app

- Use the public `https://` URL to open Home Assistant and sign in normally. Home Assistant authentication stays enabled.
- If Home Assistant rejects forwarded headers or returns a proxy-related 400, enable **Trust X-Forwarded-For** and add the address of the immediate proxy shown in the Home Assistant log. For the loopback route, that is normally `127.0.0.1`. Preserve any trusted proxy still in use during testing. Older Home Assistant releases expose these options as `http.use_x_forwarded_for` and `http.trusted_proxies` in `configuration.yaml`.
- Verify sign-in and live dashboard updates from mobile data. Set the working HTTPS URL as the Companion app’s external URL, then check that the app connects from mobile data. Once both work, you can stop the previous tunnel.
- Leave inbound router ports closed. The add-on connects outward to the AmyDex server and its tunnel endpoint. Use a hostname already managed by AmyDex or set up the corresponding external DNS record.

## Stop or remove the tunnel

Stopping the app disconnects its local connector. To revoke its access or remove the managed DNS record, open the tunnel in AmyDex and use **Revoke connector** or **Delete tunnel**, respectively. Restoring the app on a different Home Assistant installation requires a fresh connector import or pairing.
