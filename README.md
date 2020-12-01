Watertower
==========

Simple storage and syncing for local storage.

Config
------

The configuration is stored in *.watertower.json* ie...

                `
                {
                "db": {
                    "user": "bloop",
                    "p": "not telling",
                    "db": "watertower",
                    "hostname": "localhost",
                    "post": 5432
                },
                "admin": {
                    "id": "cory",
                    "p": "paws"
                },
                "table": "store"
                }
                `

API
---

* Load stored JSON
    Use this to load the data from the database.

    sent from websocket:
        `{ action : "load", uuid: 8000}`
    reply from the backend:
        `{ state: 200, message: "Data for 8000", action: "load", data }`
    state will be 404, with a "Cannot find data with uuid 10000" message if that 
    uuid cannot be found.

    The uuid is optional, if its not used then the latest data will be returned

* logon to be able to write
    Use this to establish this connection can update the database.

    sent from websocket:
        `{ action: "logon", id: "USER", p: "PASSWORD"}`
        These will be checked against admin user defined in config (see above)...
    reply from backend:
        `{ state: 200, message: " *USER* is now logged in", action: "logon" }`
    state will be 401, with a  "Bad logon details" if the logon fails.

* Update stored JSON
    Use this to update and broadcast changes to data. The socket has to have a 
    log on (see above) and the data should have the latest uuid.
        `{ action: "update", data: { __UUID: 9000..... }`
    reply from backend:   
        `{ state: 200, message: "Updated", action: "update", data: { __UUID: 9001 .....}}`
    state will be 403, with a "This socket random-id is not writable", if no log on found.
    state will be 400, with a "Data out of Sync, current id is 9002 your data is 9001", 
        if out sequence, this will be posted with current data   
