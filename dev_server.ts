import * as Registration from "./register.ts";
import * as Login from "./login.ts";

if (import.meta.main) {
  const userDB = await Deno.openKv();
  const registrationDB = await Deno.openKv();
  const loginDB = await Deno.openKv();
  Deno.serve({ port: 5180 }, async (req) => {
    const url = new URL(req.url);
    if (url.pathname === "/register") {
      const userName = url.searchParams.get("username");
      if (userName === null) {
        return new Response("No username provided", { status: 400 });
      }
      if ((await userDB.get([userName])).value) {
        return new Response("User already exists", { status: 400 });
      }
      const { response, socket } = Deno.upgradeWebSocket(req);
      socket.onopen = (_) => {
        try {
          Registration.onOpen({
            socketSend: (data: string) => socket.send(data),
            storeRegChallenge: async (
              id: string,
              challenge: string,
              timeout: number,
            ) => {
              await registrationDB.set([id], challenge, {
                expireIn: timeout + 1000,
              });
            },
          }, {
            rpID: "localhost",
            rpName: "@socketauthn/server-core",
            attestationType: "none",
            authenticatorSelection: {
              residentKey: "preferred",
              userVerification: "preferred",
              authenticatorAttachment: "platform",
            },
            userID: userName, //Not recommended for production
            userName,
          });
        } catch (error) {
          socket.close(4000, error);
        }
      };
      socket.onmessage = async (ev) => {
        const expectedChallenge = (await registrationDB.get([userName])).value;
        if (!expectedChallenge || typeof expectedChallenge != "string") {
          socket.close(4000, "Internal error or request timed out");
          return;
        }
        try {
          await Registration.onMessage(
            {
              createUser: async (id, _name, auth) => {
                await userDB.set([id], auth);
              },
              expectedOrigin: "http://localhost:5173",
              rpID: "localhost",
            },
            ev.data,
            userName,
            userName,
            expectedChallenge,
          );
          console.log("logged in");
          //Socket is closed from client side in example from @socketauthn/client
        } catch (error) {
          socket.close(4000, error);
        }
      };

      return response;
    } //Login Route:
    else if (url.pathname === "/login") {
      const userName = url.searchParams.get("username");
      if (userName === null) {
        return new Response("No username provided", { status: 400 });
      }
      if (!(await userDB.get([userName])).value) {
        return new Response("User does not exists", { status: 404 });
      }

      const { response, socket } = Deno.upgradeWebSocket(req);
      socket.onopen = (_) => {
        try {
          Login.onOpen({
            socketSend: (data: string) => socket.send(data),
            storeLoginChallenge: async (id, challenge, timeout) => {
              await loginDB.set([id], challenge, { expireIn: timeout + 1000 });
            },
          }, {
            rpID: "localhost",
            rpName: "@socketauthn/server-core",
            attestationType: "none",
            authenticatorSelection: {
              residentKey: "preferred",
              userVerification: "preferred",
              authenticatorAttachment: "platform",
            },
            userID: userName, //Not recommended for production
            userName,
          });
        } catch (error) {
          socket.close(4000, error);
        }
      };

      return response;
    }

    return new Response(null, { status: 500 });
  });
}
