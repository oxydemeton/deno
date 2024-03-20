# socektauthn-client
@socektauthn/client is the browser client of the @socketauthn packages

[![JSR](https://jsr.io/badges/@socketauthn/server-core)](https://jsr.io/@socketauthn/server-core) [![JSR Score](https://jsr.io/badges/@socketauthn/server-core/score)](https://jsr.io/@socketauthn/server-core)

# socketauthn
The [@socketauthn](https://jsr.io/@socketauthn) family of packages is a combination of this client and a websocket api.
## Compatibility
During Beta:
Each minor of a package is compatible with the same minor versions of the other packages of the family.
After full release:
Each minor and patch version of a major version will be compatible with the same major version of the package family.

## Concept
The client calls the registerUser function in the browser. It creates a websocket connection to the api endpoint for the registration. The Server sends a registration config for [@simplewebauthn/browser](https://simplewebauthn.dev/)'s startRegistration function on open. The client responses when the authentication in finished.

The same applies when logging in.
## How to use
This package provides functions that should be executed onopen and onmessage of a websocket connection. Routing, upgrading the connections etc is NOT part of this library. An example can be found in `dev_server.ts` which is can be run using `deno task dev` on port 5180. It is compatible with the exampe of [@socketauthn/client](https://github.com/oxydemeton/socketauthn-client)