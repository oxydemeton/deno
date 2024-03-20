import { VerifiedRegistrationResponse, generateRegistrationOptions, verifyRegistrationResponse, type GenerateRegistrationOptionsOpts } from "@simplewebauthn/server";

const registrationDb = await Deno.openKv();

export const registerHandler = {
  async handleOpen(socket: WebSocket, _originalReq: Request, regConf: GenerateRegistrationOptionsOpts) {
    const options = await generateRegistrationOptions(regConf)

    /**Timeout for ws connection not sending a response and for db to store challenge */
    const timeoutDuration = regConf.timeout || 60 * 1000

    registrationDb.set([regConf.userID], {
      timeout: setTimeout(() => { socket.close(4008, "Registration timed out") }, timeoutDuration),
      challenge: options.challenge
    }, { expireIn: timeoutDuration + 500 }) // Margin of 500ms so nothing is gone

    socket.send(JSON.stringify(options))
  },

  /** message event handler for a websocket connection. Requires pervious init with handleOpen and verifies response to create a user*/
  async handleMessage(socket: WebSocket,
    _originalReq: Request,
    event: MessageEvent,
    regConf: GenerateRegistrationOptionsOpts,
    createUser: (userId: string, userName: string, authenticator: VerifiedRegistrationResponse["registrationInfo"]) => Promise<void>, expectedOrigin: string) {

    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: JSON.parse(event.data),
        expectedChallenge: ((await registrationDb.get([regConf.userID])).value as { challenge: string, timeout: number }).challenge,
        expectedOrigin: expectedOrigin,
        expectedRPID: regConf.rpID,
      });
    } catch (error) {
      console.error(error);
      socket.close(4000, error.message);
    }

    if (verification?.verified) {
      await createUser(regConf.userID, regConf.userName, verification.registrationInfo)
      socket.close(1000, "User Registered")
    } else {
      socket.close(4000, "Not verified")
    }
  },
  handleClose(socket: WebSocket, originalReq: Request, event: CloseEvent) {

  },
  handleError(socket: WebSocket, originalReq: Request, event: Event) {
    console.log("register Error");
  },
}