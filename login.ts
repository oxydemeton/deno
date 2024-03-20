import { generateAuthenticationOptions, type GenerateRegistrationOptionsOpts } from "@simplewebauthn/server";

const loginDb = await Deno.openKv();

export const loginHandler = {
  async handleOpen(socket: WebSocket, originalReq: Request, loginConf: GenerateRegistrationOptionsOpts) {
    const options = await generateAuthenticationOptions(loginConf)

    const timeoutDuration = loginConf.timeout || 60 * 1000
    loginDb.set([loginConf.userID], {
      timeout: setTimeout(() => { socket.close(4008, "Login timed out") }, timeoutDuration),
      challenge: options.challenge
    }, { expireIn: timeoutDuration + 500 }) // Margin of 500ms so nothing is gone

    socket.send(JSON.stringify(options))
  },
  handleMessage(socket: WebSocket, originalReq: Request, event: MessageEvent) {
    console.log("login msg");
  },
  handleClose(socket: WebSocket, originalReq: Request, event: CloseEvent) {
    console.log("login close");
  },
  handleError(socket: WebSocket, originalReq: Request, event: Event) {
    console.log("login Error");
  },
}