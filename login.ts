import {
  generateAuthenticationOptions,
  GenerateRegistrationOptionsOpts,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { type Authenticator } from "./register.ts";
async function onOpen(env: {
  socketSend: (data: string) => void | Promise<void>;
  storeLoginChallenge: (
    id: string,
    challenge: string,
    timeout: number,
  ) => void | Promise<void>;
}, config: GenerateRegistrationOptionsOpts): Promise<void> {
  const options = await generateAuthenticationOptions(config);
  const timeout = options.timeout || 60 * 1000;
  await env.storeLoginChallenge(options.challenge, config.userID, timeout);
  env.socketSend(JSON.stringify(options));
}

async function onMessage(
  env: {
    expectedOrigin: string;
    expectedRPID: string;
    updateCounter: (newCount: number) => void | Promise<void>;
  },
  messageData: string,
  userID: string,
  authenticatorForUser: Authenticator,
  expectedChallenge: string,
): Promise<void> {
  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      //@ts-ignore simplewebauthn will check validity and throw if invalid and try will catch
      response: JSON.stringify(messageData),
      authenticator: authenticatorForUser,
      expectedChallenge,
      expectedOrigin: env.expectedOrigin,
      expectedRPID: env.expectedRPID,
    });
  } catch (error) {
    throw error; //TODO improve handling
  }
  if (verification?.verified) {
    if (!verification.authenticationInfo) {
      throw new Error("No registration Info");
    }
    await env.updateCounter(verification.authenticationInfo.newCounter);
  } else {
    throw new Error("Verification failed");
  }
}
export { onMessage, onOpen };
