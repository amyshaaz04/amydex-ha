# AmyDex Home Assistant repository

**AmyDex Tunnel** connects a Home Assistant OS installation to a public HTTPS hostname on your AmyDex server. The public installer includes a pinned FRP client for 64-bit Intel/AMD and ARM Home Assistant OS. The AmyDex connector is delivered through an authorized connector download or one-time AmyDex pairing. Home Assistant handles sign-in for the web dashboard and Companion app.

## Install in Home Assistant

[![Add the AmyDex repository to Home Assistant](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Famyshaaz04%2Famydex-ha)

Open **Settings → Apps → Install app → Repositories**, add the URL below, and install **AmyDex Tunnel**. Home Assistant builds the image on the device.

```text
https://github.com/amyshaaz04/amydex-ha
```

Follow the [setup instructions](amydex_tunnel/DOCS.md) to connect the app to your AmyDex tunnel.

## Install from this folder

1. On Home Assistant OS, copy the entire `amydex_tunnel` directory to the `addons` share, so `addons/amydex_tunnel/config.yaml` exists. The Samba or SSH app can provide access to this directory.
2. In **Settings → Apps → Install app**, use **Check for updates** in the menu. Look under **Local apps** and install **AmyDex Tunnel**. Older versions call this section **Add-ons**. Restart Supervisor if the local app list still needs to be refreshed.
3. Follow the [setup instructions](amydex_tunnel/DOCS.md) to create an AmyDex tunnel and connect the app.

Run the local checks with `node --test tests/*.test.mjs` from this folder. Connection files and pairing codes are specific to one tunnel. Keep them out of the repository.
